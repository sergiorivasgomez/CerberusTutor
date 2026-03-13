import { GoogleGenAI } from '@google/genai';
import { NextRequest } from 'next/server';
import { SYSTEM_PROMPT, CERBERUS_CONTEXT_INSTRUCTION } from '@/lib/system-prompt';
import { getManualContext } from '@/lib/manual-loader';

export async function POST(req: NextRequest) {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return new Response(JSON.stringify({ error: 'Configuración incompleta: GEMINI_API_KEY no encontrada en el servidor.' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const genAI = new GoogleGenAI({ apiKey });
        const { message, mode, history } = await req.json();

        let systemInstruction = SYSTEM_PROMPT;

        // If Cerberus mode, add manual context
        if (mode === 'cerberus') {
            const manualContent = await getManualContext(message);
            systemInstruction += `\n\n${CERBERUS_CONTEXT_INSTRUCTION}\n\n${manualContent}`;
        }

        // Build conversation history for the API
        const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

        if (history && history.length > 0) {
            for (const msg of history) {
                contents.push({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.content }],
                });
            }
        }

        // Add current user message
        contents.push({
            role: 'user',
            parts: [{ text: message }],
        });

        const response = await genAI.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.7,
                maxOutputTokens: 8192,
            },
        });

        const text = response?.text || 'No se pudo generar una respuesta.';

        return new Response(JSON.stringify({ response: text }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: unknown) {
        console.error('Error in chat API:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        return new Response(
            JSON.stringify({ error: 'Error al procesar la solicitud', details: errorMessage }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
