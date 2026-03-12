/**
 * Extract individual figure images from the Cerberus manual PDF.
 * Uses pdfjs-dist with the 'canvas' npm package — no external binaries required.
 *
 * Strategy:
 *  1. For each unique page in figure-map.json, render it to a high-res canvas
 *  2. Find Y-position of "Figure N" caption text in the PDF coordinate system
 *  3. Crop the canvas from top to just below the caption line
 *  4. Export as PNG to public/manual-figures/figure-{N}.png
 *
 * Run:   node scripts/extract-figures.cjs
 * Force: node scripts/extract-figures.cjs --force
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PDF_PATH = path.join(ROOT, 'Cerberus - User Guide - Version 14.5.pdf');
const OUTPUT_DIR = path.join(ROOT, 'public', 'manual-figures');
const FIGURE_MAP = path.join(ROOT, 'data', 'figure-map.json');
const RENDER_SCALE = 2.5;   // scale factor → higher = sharper image
const FORCE = process.argv.includes('--force');

// ── Canvas factory for pdfjs-dist ─────────────────────────────────────────────
function buildCanvasFactory(createCanvasFn) {
    return {
        create(width, height) {
            const canvas = createCanvasFn(width, height);
            const context = canvas.getContext('2d');
            return { canvas, context };
        },
        reset(canvasAndCtx, width, height) {
            canvasAndCtx.canvas.width = width;
            canvasAndCtx.canvas.height = height;
        },
        destroy(canvasAndCtx) {
            canvasAndCtx.canvas.width = 0;
            canvasAndCtx.canvas.height = 0;
        },
    };
}

async function extractFigures() {
    // ── Preflight ──────────────────────────────────────────────────────────────
    for (const p of [PDF_PATH, FIGURE_MAP]) {
        if (!fs.existsSync(p)) {
            console.error('❌ Not found:', p);
            process.exit(1);
        }
    }

    const { createCanvas } = require('canvas');
    const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');
    const sharp = require('sharp');

    const figureMap = JSON.parse(fs.readFileSync(FIGURE_MAP, 'utf-8'));
    console.log(`📋 ${figureMap.length} figures in map`);

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    // ── Load PDF ───────────────────────────────────────────────────────────────
    const dataBuffer = new Uint8Array(fs.readFileSync(PDF_PATH));
    const doc = await pdfjsLib.getDocument({
        data: dataBuffer,
        useWorkerFetch: false,
        isEvalSupported: false,
    }).promise;
    console.log(`📖 PDF: ${doc.numPages} pages\n`);

    const canvasFactory = buildCanvasFactory(createCanvas);

    // Group figures by page
    const pageToFigs = {};
    for (const fig of figureMap) {
        (pageToFigs[fig.page] = pageToFigs[fig.page] || []).push(fig);
    }
    const uniquePages = Object.keys(pageToFigs).map(Number).sort((a, b) => a - b);
    console.log(`🖼️  Processing ${uniquePages.length} unique pages…\n`);

    let ok = 0, fail = 0;

    for (const pageNum of uniquePages) {
        const figs = pageToFigs[pageNum].sort((a, b) => a.figure - b.figure);

        // ── Get page ──────────────────────────────────────────────────────────
        const pdfPage = await doc.getPage(pageNum);
        const viewport = pdfPage.getViewport({ scale: RENDER_SCALE });
        const imgW = Math.floor(viewport.width);
        const imgH = Math.floor(viewport.height);

        // ── Render to canvas ──────────────────────────────────────────────────
        const canvasObj = canvasFactory.create(imgW, imgH);
        try {
            await pdfPage.render({
                canvasContext: canvasObj.context,
                viewport,
                canvasFactory,
            }).promise;
        } catch (err) {
            console.error(`❌ Render error page ${pageNum}: ${err.message}`);
            canvasFactory.destroy(canvasObj);
            fail += figs.length;
            continue;
        }

        // Convert canvas to raw buffer for sharp
        const rawBuf = canvasObj.canvas.toBuffer('raw');  // RGBA raw pixels

        // ── Extract text positions ────────────────────────────────────────────
        const tc = await pdfPage.getTextContent();
        const pdfH = pdfPage.getViewport({ scale: 1 }).height;

        const textItems = tc.items
            .filter(item => 'str' in item && Array.isArray(item.transform))
            .map(item => ({
                text: item.str.trim(),
                // PDF Y is from bottom; convert to Y-from-top at render scale
                yPx: (pdfH - item.transform[5]) * RENDER_SCALE,
            }));

        // ── Crop per figure ───────────────────────────────────────────────────
        for (let fi = 0; fi < figs.length; fi++) {
            const fig = figs[fi];
            const outP = path.join(OUTPUT_DIR, `figure-${fig.figure}.png`);

            if (fs.existsSync(outP) && !FORCE) {
                console.log(`  ✓ fig ${fig.figure} exists`);
                ok++;
                continue;
            }

            // Find caption Y
            const captionY = findCaptionY(textItems, fig.figure, fig.caption, imgH);

            // Top boundary (previous figure's bottom, or page top)
            let cropTop = 0;
            if (fi > 0) {
                const prev = figs[fi - 1];
                const prevCapY = findCaptionY(textItems, prev.figure, prev.caption, imgH);
                cropTop = Math.min(prevCapY + Math.round(imgH * 0.03) + 8, imgH - 1);
            }

            const lineH = Math.round(imgH * 0.025); // ~one text line height
            const cropBot = Math.min(captionY + lineH + 10, imgH);
            const cropH = Math.max(cropBot - cropTop, 60);

            try {
                await sharp(rawBuf, {
                    raw: { width: imgW, height: imgH, channels: 4 },
                })
                    .extract({ left: 0, top: cropTop, width: imgW, height: cropH })
                    .png({ compressionLevel: 7 })
                    .toFile(outP);

                const pct = Math.round((captionY / imgH) * 100);
                console.log(
                    `  ✅ Fig ${String(fig.figure).padStart(3)} (p${pageNum})` +
                    ` crop ${cropTop}→${cropBot}px (cap@${pct}%) → figure-${fig.figure}.png`
                );
                ok++;
            } catch (err) {
                console.error(`  ❌ Crop failed fig ${fig.figure}: ${err.message}`);
                fail++;
            }
        }

        canvasFactory.destroy(canvasObj);
    }

    await doc.destroy();
    console.log(`\n${'═'.repeat(50)}`);
    console.log(`✅ ${ok} figures extracted`);
    if (fail) console.log(`⚠️  ${fail} failed`);
    console.log(`📁 ${OUTPUT_DIR}`);
}

/**
 * Find Y-position (pixels) of "Figure N" caption text in the rendered image.
 * Falls back to 75% of page height if not found.
 */
function findCaptionY(textItems, figNum, caption, imgH) {
    const captionWords = caption.toLowerCase().split(/\W+/).filter(w => w.length > 3);
    let bestY = -1;
    let bestScore = -1;

    for (const item of textItems) {
        const txt = item.text.toLowerCase();
        if (!txt) continue;

        let score = 0;
        if (txt.includes(`figure ${figNum}`)) score += 15;
        else if (txt.includes(String(figNum))) score += 4;

        // Penalise items that are very high on the page (likely headers, not captions)
        if (item.yPx < imgH * 0.1) score -= 5;

        for (const w of captionWords) {
            if (txt.includes(w)) score += 1;
        }

        if (score > bestScore) {
            bestScore = score;
            bestY = item.yPx;
        }
    }

    if (bestScore >= 4 && bestY > 0) return Math.round(bestY);
    return Math.round(imgH * 0.75); // reasonable fallback
}

extractFigures().catch(err => { console.error(err); process.exit(1); });
