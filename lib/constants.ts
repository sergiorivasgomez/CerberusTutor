import { Wrench, BookOpen } from 'lucide-react';
import React from 'react';

export type Mode = 'ct-expert' | 'cerberus';
export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
    id: string;
    role: MessageRole;
    content: string;
    mode: Mode;
}

export interface ModalState {
    isOpen: boolean;
    pageNumber: number;
    caption: string;
}

export const QUICK_ACTIONS = [
    {
        title: '🛢️ Diseño de Programa CT',
        desc: 'Planificación de una intervención de Coiled Tubing',
        prompt: '¿Puedes ayudarme a diseñar un programa de trabajo de Coiled Tubing para una limpieza de pozo (cleanout) a 12,000 ft?',
        mode: 'ct-expert' as Mode,
    },
    {
        title: '⚙️ Crear un Pozo en Cerberus',
        desc: 'Guía paso a paso para Well Editor',
        prompt: '¿Cómo creo un pozo nuevo en Cerberus? Guíame paso a paso desde el menú principal.',
        mode: 'cerberus' as Mode,
    },
    {
        title: '🔧 Contingencia Stuck Pipe',
        desc: 'Diagnóstico y solución de atascamiento',
        prompt: 'Tengo un diferencial de 5000 psi y la tubería no se mueve al intentar sacar. ¿Qué procedimiento debo seguir?',
        mode: 'ct-expert' as Mode,
    },
    {
        title: '📊 Simulación Orpheus',
        desc: 'Análisis de fuerzas y buckling en Cerberus',
        prompt: '¿Cómo configuro una simulación en el módulo Orpheus de Cerberus para analizar el buckling? Guíame paso a paso.',
        mode: 'cerberus' as Mode,
    },
] as const;

export const MODE_CONFIG: Record<Mode, { title: string; subtitle: string; badge: string; icon: React.ReactElement }> = {
    'ct-expert': {
        title: 'CT Expert',
        subtitle: 'Experto en Coiled Tubing',
        badge: 'ct-expert',
        icon: React.createElement(Wrench, { size: 16 }),
    },
    'cerberus': {
        title: 'Cerberus Tutor',
        subtitle: 'Tutor Interactivo de Cerberus 14.5',
        badge: 'cerberus',
        icon: React.createElement(BookOpen, { size: 16 }),
    },
};

export const CERBERUS_MODULE_PROMPTS = [
    {
        prompt: '¿Cómo funciona el módulo Achilles para análisis de fatiga? Guíame paso a paso.',
        mode: 'cerberus' as Mode,
    },
    {
        prompt: 'Explícame cómo usar el módulo Hydra para análisis hidráulico. Guíame paso a paso.',
        mode: 'cerberus' as Mode,
    },
    {
        prompt: '¿Cómo configuro Orpheus para análisis de fuerzas? Guíame paso a paso.',
        mode: 'cerberus' as Mode,
    },
    {
        prompt: '¿Cómo configuro una operación de Jars en Cerberus? Guíame paso a paso.',
        mode: 'cerberus' as Mode,
    },
] as const;
