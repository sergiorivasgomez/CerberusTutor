import fs from 'fs';
import path from 'path';

interface ManualSection {
    title: string;
    content: string;
    page: number;
    keywords: string[];
    figures?: Array<{ figure: number; caption: string; page: number }>;
}

interface FigureEntry {
    figure: number;
    caption: string;
    page: number;
}

// Module-level cache — persists for the lifetime of the server process
let manualSections: ManualSection[] | null = null;
let figureMap: FigureEntry[] | null = null;

// Spanish → English keyword translations for bilingual search
const KEYWORD_TRANSLATIONS: Record<string, string> = {
    'pozo': 'well',
    'pozos': 'wells',
    'crear': 'create',
    'nuevo': 'new',
    'hidráulica': 'hydraulic',
    'hidraulica': 'hydraulic',
    'fatiga': 'fatigue',
    'fuerzas': 'forces',
    'fluido': 'fluid',
    'fluidos': 'fluids',
    'sarta': 'string',
    'sartas': 'strings',
    'control': 'control',
    'editor': 'editor',
    'editar': 'edit',
    'configurar': 'setup',
    'configuración': 'setup',
    'configuracion': 'setup',
    'martilleo': 'jars',
    'nitrógeno': 'nitrogen',
    'nitrogeno': 'nitrogen',
    'limpieza': 'clean out',
    'simulación': 'simulation',
    'simulacion': 'simulation',
    'análisis': 'analysis',
    'analisis': 'analysis',
    'presión': 'pressure',
    'presion': 'pressure',
    'módulo': 'module',
    'modulo': 'module',
};

const MODULE_KEYWORDS = [
    'achilles', 'hydra', 'orpheus', 'fatigue', 'hydraulic', 'buckling',
    'jars', 'nitrogen', 'clean out', 'solid', 'well editor', 'string editor',
    'fluid editor', 'real-trak', 'setup', 'create', 'new well', 'well',
    'string', 'fluid', 'simulation', 'analysis', 'pressure', 'module',
];

function loadManualSections(): ManualSection[] {
    if (manualSections) return manualSections;
    const filePath = path.join(process.cwd(), 'data', 'manual-sections.json');
    if (!fs.existsSync(filePath)) {
        console.warn('Manual sections file not found. Run: node scripts/extract-manual.cjs');
        return [];
    }
    manualSections = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as ManualSection[];
    return manualSections;
}

function loadFigureMap(): FigureEntry[] {
    if (figureMap) return figureMap;
    const filePath = path.join(process.cwd(), 'data', 'figure-map.json');
    if (!fs.existsSync(filePath)) {
        console.warn('Figure map not found. Run: node scripts/extract-manual.cjs');
        return [];
    }
    figureMap = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as FigureEntry[];
    return figureMap;
}

function translateQueryWords(words: string[]): string[] {
    const translated = new Set(words);
    for (const word of words) {
        const en = KEYWORD_TRANSLATIONS[word];
        if (en) translated.add(en);
    }
    return Array.from(translated);
}

function scoreSection(section: ManualSection, queryWords: string[]): number {
    let score = 0;
    const titleLower = section.title.toLowerCase();
    const sectionText = `${titleLower} ${section.content} ${section.keywords.join(' ')}`.toLowerCase();

    for (const word of queryWords) {
        // Content match
        if (sectionText.includes(word)) score += 1;
        // Title match (higher boost)
        if (titleLower.includes(word)) score += 3;
    }

    // Module keyword boost
    for (const kw of MODULE_KEYWORDS) {
        if (queryWords.some(w => w.includes(kw) || kw.includes(w)) && sectionText.includes(kw)) {
            score += 5;
        }
    }

    // Figure bonus — visual sections are better for tutorials
    if (section.figures && section.figures.length > 0) score += 2;

    return score;
}

export async function getManualContext(query: string): Promise<string> {
    const sections = loadManualSections();
    const figures = loadFigureMap();

    if (sections.length === 0) {
        return 'No se encontró contenido del manual. Responde basándote en tu conocimiento general de Cerberus.';
    }

    const rawWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const queryWords = translateQueryWords(rawWords);

    const scored = sections
        .map(section => ({ section, score: scoreSection(section, queryWords) }))
        .sort((a, b) => b.score - a.score);

    const topSections = scored.slice(0, 7).filter(s => s.score > 0);

    if (topSections.length === 0) {
        const overview = sections.slice(0, 3)
            .map(s => `## ${s.title} (Página ${s.page})\n${s.content.substring(0, 500)}...`)
            .join('\n\n---\n\n');
        return overview + formatFigureList(figures, queryWords);
    }

    const context = topSections.map(({ section }) => {
        let text = `## ${section.title} (Página ${section.page})\n${section.content}`;
        if (section.figures && section.figures.length > 0) {
            text += '\n\n**Figuras en esta sección:**\n';
            for (const fig of section.figures) {
                text += `- Figure ${fig.figure} - ${fig.caption} (página ${fig.page})\n`;
            }
        }
        return text;
    }).join('\n\n---\n\n');

    return context + formatFigureList(figures, queryWords);
}

function formatFigureList(figures: FigureEntry[], queryWords: string[]): string {
    if (figures.length === 0) return '';

    const relevantFigures = figures.filter(fig => {
        const captionLower = fig.caption.toLowerCase();
        return queryWords.some(w => captionLower.includes(w));
    });

    if (relevantFigures.length === 0) return '';

    let text = '\n\n## 📸 Figuras relevantes disponibles:\n';
    text += 'Usa la sintaxis [[GUIDE:pagina:caption]] para referenciar estas figuras:\n\n';
    for (const fig of relevantFigures.slice(0, 15)) {
        text += `- [[GUIDE:${fig.page}:Figure ${fig.figure} - ${fig.caption}]] (página ${fig.page})\n`;
    }
    return text;
}
