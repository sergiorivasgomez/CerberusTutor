'use client';

import { Send } from 'lucide-react';
import { Mode } from '@/lib/constants';

interface InputBarProps {
    input: string;
    isLoading: boolean;
    mode: Mode;
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
    onChange: (value: string) => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
    onSend: () => void;
}

const PLACEHOLDERS: Record<Mode, string> = {
    'ct-expert': 'Pregunta sobre Coiled Tubing, diseño de programas, contingencias...',
    'cerberus': 'Pregunta sobre Cerberus: "¿Cómo creo un pozo?", "Guíame en Orpheus"...',
};

export function InputBar({
    input,
    isLoading,
    mode,
    textareaRef,
    onChange,
    onKeyDown,
    onSend,
}: InputBarProps) {
    return (
        <div className="input-area">
            <div className="input-container">
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder={PLACEHOLDERS[mode]}
                    rows={1}
                    disabled={isLoading}
                    aria-label="Escribe tu pregunta aquí"
                    aria-multiline="true"
                />
                <button
                    className="send-button"
                    onClick={onSend}
                    disabled={!input.trim() || isLoading}
                    aria-label="Enviar mensaje"
                    title="Enviar (Enter)"
                >
                    <Send size={18} aria-hidden="true" />
                </button>
            </div>
        </div>
    );
}
