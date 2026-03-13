import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest } from 'next/server';
import { SYSTEM_PROMPT, CERBERUS_CONTEXT_INSTRUCTION } from '@/lib/system-prompt';
import { getManualContext } from '@/lib/manual-loader';

// Trigger redeploy: 2026-03-12 21:18
export async function POST(req: NextRequest) {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return new Response(JSON.stringify({ error: 'Configuración incompleta: GEMINI_API_KEY no encontrada en el servidor.' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
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

        const modelName = 'models/gemini-1.5-flash';
        
        const model = genAI.getGenerativeModel({ 
            model: modelName,
            systemInstruction: systemInstruction,
        });

        const result = await model.generateContent({
            contents: contents,
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 8192,
            },
        });

        const response = await result.response;
        const text = response.text() || 'No se pudo generar una respuesta.';

        return new Response(JSON.stringify({ response: text }), {
            headers: { 
                'Content-Type': 'application/json',
                'X-App-Version': '1.0.2-opaque-shield'
            },
        });
    } catch (error: any) {
        console.error('Error in chat API:', error);
        
        const errorMessage = error.message || '';
        const isQuotaError = errorMessage.toLowerCase().includes('quota') || 
                            errorMessage.includes('429') || 
                            errorMessage.includes('limit') ||
                            errorMessage.includes('RESOURCE_EXHAUSTED');

        return new Response(
            JSON.stringify({ 
                error: isQuotaError ? 'quota_exceeded' : 'internal_error'
            }),
            { 
                status: isQuotaError ? 429 : 500, 
                headers: { 'Content-Type': 'application/json' } 
            }
        );
    }
}
