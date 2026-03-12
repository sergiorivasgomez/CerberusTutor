/**
 * Script to extract text content from the Cerberus PDF manual
 * and split it into searchable sections.
 * 
 * Run with: node scripts/extract-manual.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

async function extractManual() {
    const pdfPath = path.join(ROOT, 'Cerberus - User Guide - Version 14.5.pdf');

    if (!fs.existsSync(pdfPath)) {
        console.error('❌ PDF not found:', pdfPath);
        process.exit(1);
    }

    console.log('📖 Loading PDF...');
    const pdfModule = await import('pdf-parse');
    const pdfParse = pdfModule.default || pdfModule;
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdfParse(dataBuffer);

    console.log(`📄 Total pages: ${data.numpages}`);
    console.log(`📝 Total characters: ${data.text.length}`);

    // Split content into sections by detecting headers
    // Cerberus manual typically uses numbered sections like "1.1", "2.3.1", etc.
    const lines = data.text.split('\n');
    const sections = [];
    let currentSection = {
        title: 'Introduction',
        content: '',
        page: 1,
        keywords: ['introduction', 'cerberus', 'overview']
    };

    // Common Cerberus module keywords for tagging
    const moduleKeywordMap = {
        'achilles': ['achilles', 'fatigue', 'fatiga', 'cycle', 'life', 'running meter'],
        'hydra': ['hydra', 'hydraulic', 'hidráulica', 'pressure', 'flow', 'annular velocity'],
        'orpheus': ['orpheus', 'force', 'buckling', 'lock-up', 'friction', 'spider plot'],
        'jars': ['jars', 'jar', 'impact', 'martilleo', 'fishing'],
        'nitrogen': ['nitrogen', 'nitrógeno', 'n2', 'underbalanced'],
        'clean_out': ['clean out', 'cleanout', 'solid', 'milling', 'fresado'],
        'general': ['well', 'tubing', 'string', 'bha', 'equipment', 'setup']
    };

    const sectionPattern = /^(\d+\.[\d.]*)\s+(.+)/;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const match = trimmed.match(sectionPattern);
        if (match && match[2].length > 3 && match[2].length < 120) {
            // Save previous section
            if (currentSection.content.trim().length > 50) {
                // Auto-tag keywords
                const contentLower = currentSection.content.toLowerCase();
                for (const [module, keywords] of Object.entries(moduleKeywordMap)) {
                    if (keywords.some(kw => contentLower.includes(kw))) {
                        currentSection.keywords.push(module);
                    }
                }
                sections.push({ ...currentSection });
            }

            // Start new section
            currentSection = {
                title: `${match[1]} ${match[2]}`,
                content: '',
                page: Math.max(1, Math.floor(sections.length / 2) + 1), // Approximate page
                keywords: []
            };
        } else {
            currentSection.content += trimmed + '\n';
        }
    }

    // Don't forget the last section
    if (currentSection.content.trim().length > 50) {
        sections.push({ ...currentSection });
    }

    // Write to data directory
    const dataDir = path.join(ROOT, 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    const outputPath = path.join(dataDir, 'manual-sections.json');
    fs.writeFileSync(outputPath, JSON.stringify(sections, null, 2), 'utf-8');

    console.log(`✅ Extracted ${sections.length} sections`);
    console.log(`💾 Saved to: ${outputPath}`);

    // Print section titles for verification
    console.log('\n📋 Sections found:');
    sections.slice(0, 20).forEach((s, i) => {
        console.log(`  ${i + 1}. ${s.title} (keywords: ${s.keywords.join(', ')})`);
    });
    if (sections.length > 20) {
        console.log(`  ... and ${sections.length - 20} more sections`);
    }
}

extractManual().catch(console.error);
