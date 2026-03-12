import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';

const PDF_PATH = path.join(process.cwd(), 'Cerberus - User Guide - Version 14.5.pdf');
const CACHE_DIR = path.join(process.cwd(), 'public', 'manual-figures');
const FIGURE_MAP = path.join(process.cwd(), 'data', 'figure-map.json');

interface FigureEntry { figure: number; caption: string; page: number; }

// In-memory cache for the figure map (loaded once)
let figureMapCache: FigureEntry[] | null = null;

function getFigureMap(): FigureEntry[] {
    if (!figureMapCache) {
        figureMapCache = JSON.parse(fs.readFileSync(FIGURE_MAP, 'utf-8'));
    }
    return figureMapCache!;
}

// Canvas factory compatible with pdfjs-dist
function makeCanvasFactory(createCanvas: (w: number, h: number) => object) {
    return {
        create(w: number, h: number) {
            const canvas = createCanvas(w, h) as { getContext: (t: string) => unknown; width: number; height: number };
            const context = canvas.getContext('2d');
            return { canvas, context };
        },
        reset(obj: { canvas: { width: number; height: number } }, w: number, h: number) {
            obj.canvas.width = w; obj.canvas.height = h;
        },
        destroy(obj: { canvas: { width: number; height: number } }) {
            obj.canvas.width = 0; obj.canvas.height = 0;
        },
    };
}

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ figure: string }> }
) {
    const { figure: figParam } = await params;
    const figNum = parseInt(figParam, 10);

    if (isNaN(figNum) || figNum < 1) {
        return new Response('Invalid figure number', { status: 400 });
    }

    // Lookup figure in map
    const figureMap = getFigureMap();
    const entry = figureMap.find(f => f.figure === figNum);
    if (!entry) {
        return new Response(`Figure ${figNum} not found in figure map`, { status: 404 });
    }

    // Check disk cache first
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    const cachePath = path.join(CACHE_DIR, `figure-${figNum}.png`);

    if (fs.existsSync(cachePath)) {
        const buf = fs.readFileSync(cachePath);
        return new Response(new Uint8Array(buf), {
            headers: {
                'Content-Type': 'image/png',
                'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
            },
        });
    }

    // Not cached → render the page and crop the figure
    try {
        const { createCanvas } = await import('canvas');
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
        const sharp = await import('sharp');

        // Load PDF (cached by Node module system across requests within same process)
        const pdfData = new Uint8Array(fs.readFileSync(PDF_PATH));
        const doc = await (pdfjsLib as unknown as {
            getDocument: (o: object) => {
                promise: Promise<{
                    getPage: (n: number) => Promise<{
                        getViewport: (o: object) => { width: number; height: number };
                        render: (o: object) => { promise: Promise<void> };
                        getTextContent: () => Promise<{ items: Array<{ str?: string; transform?: number[] }> }>;
                    }>;
                    numPages: number;
                    destroy: () => void;
                }>
            }
        }).getDocument({
            data: pdfData,
            useWorkerFetch: false,
            isEvalSupported: false,
        }).promise;

        const pageNum = entry.page;
        if (pageNum > doc.numPages) {
            await doc.destroy();
            return new Response(`Page ${pageNum} out of range`, { status: 404 });
        }

        const SCALE = 2.0;
        const pdfPage = await doc.getPage(pageNum);
        const viewport = pdfPage.getViewport({ scale: SCALE });
        const imgW = Math.floor(viewport.width);
        const imgH = Math.floor(viewport.height);

        // Render page to canvas
        const canvasFactory = makeCanvasFactory(createCanvas as unknown as (w: number, h: number) => object);
        const canvasObj = canvasFactory.create(imgW, imgH);

        await pdfPage.render({
            canvasContext: canvasObj.context,
            viewport,
            canvasFactory,
        } as object).promise;

        // Get text positions for caption detection
        const tc = await pdfPage.getTextContent();
        const pdfPageH = pdfPage.getViewport({ scale: 1.0 }).height;

        const textItems = tc.items
            .filter(item => item.str !== undefined && Array.isArray(item.transform))
            .map(item => ({
                text: (item.str ?? '').trim(),
                yPx: (pdfPageH - (item.transform?.[5] ?? 0)) * SCALE,
            }));

        // Detect figures on this same page (multiple figures possible)
        const siblingsOnPage = figureMap
            .filter(f => f.page === pageNum)
            .sort((a, b) => a.figure - b.figure);

        const myIndex = siblingsOnPage.findIndex(f => f.figure === figNum);

        // Find caption Y for our figure
        const captionYPx = findCaptionY(textItems, figNum, entry.caption, imgH);

        // Top boundary: if not the first figure on this page, use previous figure's caption as top
        let cropTop = 0;
        if (myIndex > 0) {
            const prevFig = siblingsOnPage[myIndex - 1];
            const prevCapY = findCaptionY(textItems, prevFig.figure, prevFig.caption, imgH);
            cropTop = Math.min(prevCapY + Math.round(imgH * 0.03) + 8, imgH - 10);
        }

        const lineH = Math.round(imgH * 0.025);
        const cropBot = Math.min(captionYPx + lineH + 12, imgH);
        const cropH = Math.max(cropBot - cropTop, 40);

        // Crop the rendered page
        const rawBuf = (canvasObj.canvas as unknown as { toBuffer: (t: string) => Buffer }).toBuffer('raw');

        const pngBuf = await sharp.default(rawBuf, {
            raw: { width: imgW, height: imgH, channels: 4 },
        })
            .extract({ left: 0, top: cropTop, width: imgW, height: cropH })
            .png({ compressionLevel: 7 })
            .toBuffer();

        // Save to disk cache
        fs.writeFileSync(cachePath, pngBuf);

        canvasFactory.destroy(canvasObj);
        await doc.destroy();

        return new Response(new Uint8Array(pngBuf), {
            headers: {
                'Content-Type': 'image/png',
                'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
                'X-Figure': String(figNum),
                'X-Page': String(pageNum),
            },
        });
    } catch (err: unknown) {
        console.error(`[manual-figure] Error for figure ${figNum}:`, err);
        const msg = err instanceof Error ? err.message : 'Unknown error';
        return new Response(`Failed to render figure: ${msg}`, { status: 500 });
    }
}

/**
 * Find Y-pixel position (from image top) of the caption for figure N.
 */
function findCaptionY(
    textItems: Array<{ text: string; yPx: number }>,
    figNum: number,
    caption: string,
    imgH: number
): number {
    const words = caption.toLowerCase().split(/\W+/).filter(w => w.length > 3);
    let bestY = -1, bestScore = -1;

    for (const item of textItems) {
        if (!item.text) continue;
        const txt = item.text.toLowerCase();
        let score = 0;

        if (txt.includes(`figure ${figNum}`)) score += 15;
        else if (txt.includes(String(figNum))) score += 4;

        // Penalise headers (very top of page)
        if (item.yPx < imgH * 0.08) score -= 5;

        for (const w of words) {
            if (txt.includes(w)) score += 1;
        }

        if (score > bestScore) { bestScore = score; bestY = item.yPx; }
    }

    return bestScore >= 4 && bestY > 0 ? Math.round(bestY) : Math.round(imgH * 0.75);
}
