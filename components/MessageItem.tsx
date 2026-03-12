'use client';

import { ChatMessage } from '@/lib/constants';
import { MessageContent } from '@/lib/parseGuide';

interface MessageItemProps {
    message: ChatMessage;
    onOpenModal: (page: number, caption: string) => void;
}

export function MessageItem({ message, onOpenModal }: MessageItemProps) {
    const isAssistant = message.role === 'assistant';

    return (
        <div
            className={`message ${message.role}`}
            role="article"
            aria-label={isAssistant ? 'Respuesta del asistente' : 'Mensaje del usuario'}
        >
            <div className="message-avatar" aria-hidden="true">
                {isAssistant ? '🛢️' : '👤'}
            </div>
            <div className="message-body">
                {isAssistant ? (
                    <MessageContent content={message.content} onOpenModal={onOpenModal} />
                ) : (
                    message.content
                )}
            </div>
        </div>
    );
}

export function TypingIndicator() {
    return (
        <div className="message assistant" role="status" aria-label="El asistente está escribiendo">
            <div className="message-avatar" aria-hidden="true">🛢️</div>
            <div className="message-body">
                <div className="typing-indicator" aria-hidden="true">
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                </div>
            </div>
        </div>
    );
}
