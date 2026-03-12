import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';

const PDF_PATH = path.join(process.cwd(), 'Cerberus - User Guide - Version 14.5.pdf');

function getPdfSize(): number | null {
    try {
        return fs.statSync(PDF_PATH).size;
    } catch {
        return null;
    }
}

export async function GET(req: NextRequest) {
    const fileSize = getPdfSize();

    if (fileSize === null) {
        return new Response(JSON.stringify({ error: 'Manual PDF not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const rangeHeader = req.headers.get('range');
    const commonHeaders = {
        'Content-Type': 'application/pdf',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000, immutable',
    };

    if (rangeHeader) {
        const [startStr, endStr] = rangeHeader.replace(/bytes=/, '').split('-');
        const start = parseInt(startStr, 10);
        const end = endStr ? parseInt(endStr, 10) : fileSize - 1;
        const chunkSize = end - start + 1;

        // Stream the range — never load the full file into memory
        const stream = fs.createReadStream(PDF_PATH, { start, end });
        const chunks: Buffer[] = [];
        for await (const chunk of stream) {
            chunks.push(chunk as Buffer);
        }

        return new Response(Buffer.concat(chunks), {
            status: 206,
            headers: {
                ...commonHeaders,
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Content-Length': String(chunkSize),
            },
        });
    }

    // Full file — stream via ReadableStream instead of readFileSync
    const nodeStream = fs.createReadStream(PDF_PATH);
    const webStream = new ReadableStream({
        start(controller) {
            nodeStream.on('data', (chunk) => controller.enqueue(chunk));
            nodeStream.on('end', () => controller.close());
            nodeStream.on('error', (err) => controller.error(err));
        },
    });

    return new Response(webStream, {
        headers: {
            ...commonHeaders,
            'Content-Length': String(fileSize),
        },
    });
}
