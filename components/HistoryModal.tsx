'use client';

import { X, Clock, MessageSquare, Trash2 } from 'lucide-react';
import { ChatMessage, Mode } from '@/lib/constants';

export interface ChatSession {
    id: string;
    date: string;
    preview: string;
    mode: Mode;
    messages: ChatMessage[];
}

interface HistoryModalProps {
    isOpen: boolean;
    sessions: ChatSession[];
    onClose: () => void;
    onSelectSession: (session: ChatSession) => void;
    onDeleteSession: (id: string) => void;
}

export function HistoryModal({ isOpen, sessions, onClose, onSelectSession, onDeleteSession }: HistoryModalProps) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose} style={overlayStyle}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={contentStyle}>
                <button className="modal-close" onClick={onClose} style={closeBtnStyle}>
                    <X size={20} />
                </button>

                <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={20} className="text-cerberus" style={{ color: 'var(--color-cerberus)' }} /> Historial de Conversaciones
                </h2>

                <div style={listStyle}>
                    {sessions.length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '40px 0', fontSize: '14px' }}>
                            No hay conversaciones previas guardadas.
                        </p>
                    ) : (
                        sessions.map(session => (
                            <div key={session.id} style={sessionCardStyle}>
                                <div
                                    style={{ flex: 1, cursor: 'pointer', overflow: 'hidden' }}
                                    onClick={() => { onSelectSession(session); onClose(); }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                        <MessageSquare size={14} color={session.mode === 'ct-expert' ? 'var(--color-accent)' : 'var(--color-cerberus)'} />
                                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                                            {session.mode === 'ct-expert' ? 'CT Expert' : 'Cerberus'}
                                        </span>
                                        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                                            {new Date(session.date).toLocaleString()}
                                        </span>
                                    </div>
                                    <p style={{ fontSize: '14px', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {session.preview}
                                    </p>
                                </div>
                                <button
                                    onClick={() => onDeleteSession(session.id)}
                                    style={deleteBtnStyle}
                                    aria-label="Eliminar conversación"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0,
    backgroundColor: 'rgba(5, 7, 10, 0.8)',
    backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
    opacity: 1, animation: 'fadeIn 0.2s ease',
};

const contentStyle: React.CSSProperties = {
    position: 'relative',
    width: '90%', maxWidth: '560px', maxHeight: '80vh',
    display: 'flex', flexDirection: 'column',
    backgroundColor: 'var(--color-bg-card)',
    border: '1px solid var(--color-border)',
    borderRadius: '16px',
    padding: '28px',
    boxShadow: 'var(--shadow-lg)',
};

const closeBtnStyle: React.CSSProperties = {
    position: 'absolute', top: '20px', right: '20px',
    background: 'transparent', border: 'none',
    color: 'var(--color-text-muted)', cursor: 'pointer',
};

const listStyle: React.CSSProperties = {
    flex: 1, overflowY: 'auto',
    display: 'flex', flexDirection: 'column', gap: '12px',
    paddingRight: '4px',
};

const sessionCardStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '16px',
    backgroundColor: 'var(--color-bg-primary)',
    border: '1px solid var(--color-border)',
    borderRadius: '12px',
    transition: 'border-color 0.2s, transform 0.2s',
};

const deleteBtnStyle: React.CSSProperties = {
    background: 'none', border: 'none',
    color: 'var(--color-text-muted)',
    cursor: 'pointer', padding: '8px',
    borderRadius: '8px',
    transition: 'background 0.2s, color 0.2s',
};
