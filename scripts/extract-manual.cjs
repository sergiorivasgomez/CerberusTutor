/**
 * Extract Cerberus manual: text chunks + figure map.
 * Run with: node scripts/extract-manual.cjs
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

async function extractManual() {
    const pdfPath = path.join(ROOT, 'Cerberus - User Guide - Version 14.5.pdf');

    if (!fs.existsSync(pdfPath)) {
        console.error('PDF not found:', pdfPath);
        process.exit(1);
    }

    console.log('Loading PDF...');
    const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');
    const dataBuffer = new Uint8Array(fs.readFileSync(pdfPath));
    const doc = await pdfjsLib.getDocument({ data: dataBuffer }).promise;
    console.log('Total pages:', doc.numPages);

    const moduleKeywordMap = {
        'achilles': ['achilles', 'fatigue', 'cycle', 'life consumed', 'running meter', 'damage'],
        'hydra': ['hydra', 'hydraulic', 'pressure drop', 'flow rate', 'annular velocity', 'ecd', 'circulating'],
        'orpheus': ['orpheus', 'force', 'buckling', 'lock-up', 'lockup', 'friction', 'spider plot', 'drag', 'weight on bit'],
        'jars': ['jars', 'jar', 'impact force', 'fishing', 'jarring'],
        'nitrogen': ['nitrogen', 'n2', 'underbalanced', 'foam', 'gas lift'],
        'clean_out': ['clean out', 'cleanout', 'solid', 'milling', 'debris', 'cuttings transport'],
        'tapered_string': ['tapered', 'string design', 'od', 'wall thickness'],
        'wellbore': ['wellbore', 'trajectory', 'deviation', 'survey', 'md', 'tvd', 'inclination'],
        'equipment': ['injector', 'stripper', 'bop', 'reel', 'gooseneck', 'equipment'],
        'setup': ['setup', 'installation', 'configuration', 'getting started', 'new project', 'create'],
        'well_editor': ['well editor', 'select a well', 'new well', 'well diagram'],
        'string_editor': ['string editor', 'string', 'component', 'connector'],
        'fluid_editor': ['fluid editor', 'fluid', 'rheology', 'viscosity'],
        'real_trak': ['real-trak', 'real trak', 'tracking', 'real-time']
    };

    // ===== PASS 1: Extract figures map =====
    console.log('\n--- Pass 1: Extracting figure references ---');
    const figureMap = {};
    const figurePattern = /Figure\s+(\d+)\s*[-–—]\s*(.+?)(?=\s{2,}|$|Figure\s+\d)/gi;

    for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');

        let match;
        const regex = new RegExp(figurePattern.source, 'gi');
        while ((match = regex.exec(pageText)) !== null) {
            const figNum = parseInt(match[1]);
            const caption = match[2].trim().replace(/\s+/g, ' ').substring(0, 100);
            if (!figureMap[figNum]) {
                figureMap[figNum] = {
                    figure: figNum,
                    caption: caption,
                    page: p
                };
            }
        }

        if (p % 100 === 0) console.log(`  Scanned page ${p}/${doc.numPages} for figures...`);
    }

    const figureCount = Object.keys(figureMap).length;
    console.log(`Found ${figureCount} unique figures`);

    // ===== PASS 2: Extract text chunks =====
    console.log('\n--- Pass 2: Extracting text chunks ---');
    const PAGES_PER_CHUNK = 3;
    const sections = [];

    for (let startPage = 1; startPage <= doc.numPages; startPage += PAGES_PER_CHUNK) {
        const endPage = Math.min(startPage + PAGES_PER_CHUNK - 1, doc.numPages);
        let chunkText = '';
        const chunkFigures = [];

        for (let p = startPage; p <= endPage; p++) {
            const page = await doc.getPage(p);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            chunkText += pageText + '\n';

            // Find figures on this page
            for (const [figNum, figData] of Object.entries(figureMap)) {
                if (figData.page === p) {
                    chunkFigures.push({ figure: parseInt(figNum), caption: figData.caption, page: p });
                }
            }
        }

        if (chunkText.trim().length < 50) continue;

        // Auto-tag keywords
        const kws = [];
        const textLower = chunkText.toLowerCase();
        for (const [module, keywords] of Object.entries(moduleKeywordMap)) {
            if (keywords.some(kw => textLower.includes(kw))) {
                kws.push(module);
            }
        }

        // Try to detect a title
        const firstLines = chunkText.split('\n').filter(l => l.trim().length > 10).slice(0, 3);
        let title = `Páginas ${startPage}-${endPage}`;
        for (const line of firstLines) {
            const headerMatch = line.trim().match(/^(?:Chapter\s+)?(\d+\.[\d.]*)\s+(.{5,60})/);
            if (headerMatch) {
                title = `${headerMatch[1]} ${headerMatch[2]}`.trim();
                break;
            }
        }

        sections.push({
            title,
            content: chunkText.substring(0, 4000),
            page: startPage,
            keywords: kws,
            figures: chunkFigures
        });

        if (startPage % 100 === 1) {
            console.log(`  Processed pages ${startPage}-${endPage}...`);
        }
    }

    // ===== Write outputs =====
    const dataDir = path.join(ROOT, 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    // Write sections
    const sectionsPath = path.join(dataDir, 'manual-sections.json');
    fs.writeFileSync(sectionsPath, JSON.stringify(sections, null, 2), 'utf-8');

    // Write figure map (sorted by figure number)
    const sortedFigures = Object.values(figureMap).sort((a, b) => a.figure - b.figure);
    const figureMapPath = path.join(dataDir, 'figure-map.json');
    fs.writeFileSync(figureMapPath, JSON.stringify(sortedFigures, null, 2), 'utf-8');

    console.log(`\n✅ Extracted ${sections.length} text chunks`);
    console.log(`✅ Extracted ${sortedFigures.length} figure references`);
    console.log(`💾 Sections: ${sectionsPath}`);
    console.log(`💾 Figures: ${figureMapPath}`);

    // Show sample figures
    console.log('\n📋 Sample figures:');
    sortedFigures.slice(0, 15).forEach(f => {
        console.log(`  Figure ${f.figure} (p.${f.page}): ${f.caption}`);
    });
    if (sortedFigures.length > 15) {
        console.log(`  ... and ${sortedFigures.length - 15} more figures`);
    }

    await doc.destroy();
}

extractManual().catch(console.error);
