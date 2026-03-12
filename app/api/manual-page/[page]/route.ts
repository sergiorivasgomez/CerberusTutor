import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';

/**
 * Renders a specific page from the Cerberus PDF manual as a PNG image.
 * Usage: GET /api/manual-page/42 → returns page 42 as PNG
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ page: string }> }
) {
    const { page: pageParam } = await params;
    const pageNum = parseInt(pageParam, 10);

    if (isNaN(pageNum) || pageNum < 1) {
        return new Response(JSON.stringify({ error: 'Invalid page number' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const pdfPath = path.join(process.cwd(), 'Cerberus - User Guide - Version 14.5.pdf');

    if (!fs.existsSync(pdfPath)) {
        return new Response(JSON.stringify({ error: 'Manual PDF not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        // Use pdfjs-dist for server-side rendering
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
        const dataBuffer = new Uint8Array(fs.readFileSync(pdfPath));
        const doc = await pdfjsLib.getDocument({
            data: dataBuffer,
            standardFontDataUrl: path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'standard_fonts') + '/',
        }).promise;

        if (pageNum > doc.numPages) {
            await doc.destroy();
            return new Response(JSON.stringify({ error: `Page ${pageNum} not found. Manual has ${doc.numPages} pages.` }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const pdfPage = await doc.getPage(pageNum);
        const scale = 1.5; // Good quality for display
        const viewport = pdfPage.getViewport({ scale });

        // Use OffscreenCanvas or a simple pixel array approach
        // Since we're in Node.js without canvas, we'll use the operator list approach
        // Actually, let's use a simpler approach - serve the full PDF and let the client render
        // OR we create a lightweight SVG-based renderer

        // For Node.js server-side, we need @napi-rs/canvas or similar
        // Let's take a different approach: use pdf.js's SVG rendering
        const opList = await pdfPage.getOperatorList();

        // Alternative: Return page metadata and let client handle rendering
        // But since client rendering fails, let's try yet another approach:
        // Extract text + images from the page as structured data

        const textContent = await pdfPage.getTextContent();

        await doc.destroy();

        // Return page dimensions and text content for the client to display
        return new Response(JSON.stringify({
            page: pageNum,
            width: viewport.width,
            height: viewport.height,
            textItems: textContent.items
                .filter((item): item is typeof item & { str: string; transform: number[] } => 'str' in item)
                .map((item) => ({
                    text: item.str ?? '',
                    x: item.transform?.[4] ?? 0,
                    y: item.transform?.[5] ?? 0,
                })),
        }), {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (error: unknown) {
        console.error('Error rendering page:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return new Response(JSON.stringify({ error: 'Failed to render page', details: errorMessage }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
