'use client';

import { X, Key, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onClearHistory: () => void;
}

export function SettingsModal({ isOpen, onClose, onClearHistory }: SettingsModalProps) {
    const [apiKey, setApiKey] = useState('');

    useEffect(() => {
        if (isOpen) {
            setApiKey(localStorage.getItem('gemini_api_key') || '');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (apiKey.trim()) {
            localStorage.setItem('gemini_api_key', apiKey.trim());
        } else {
            localStorage.removeItem('gemini_api_key');
        }
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={overlayStyle}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={contentStyle}>
                <button className="modal-close" onClick={onClose} style={closeBtnStyle}>
                    <X size={20} />
                </button>

                <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px', color: 'var(--color-accent)' }}>
                    Configuración
                </h2>

                <div style={sectionStyle}>
                    <label style={labelStyle}>
                        <Key size={16} /> Clave API de Gemini (Opcional)
                    </label>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
                        Guarda tu propia clave API para usarla en lugar de la proporcionada por el servidor.
                    </p>
                    <input
                        type="password"
                        value={apiKey}
                        onChange={e => setApiKey(e.target.value)}
                        placeholder="AIzaSy..."
                        style={inputStyle}
                        autoComplete="off"
                    />
                </div>

                <div style={{ ...sectionStyle, borderBottom: 'none' }}>
                    <label style={labelStyle}>
                        <Trash2 size={16} /> Datos Locales
                    </label>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
                        Borrar todas las conversaciones guardadas de este navegador.
                    </p>
                    <button
                        onClick={() => {
                            if (window.confirm('¿Seguro que deseas borrar el historial? Esta acción no se puede deshacer.')) {
                                onClearHistory();
                                onClose();
                            }
                        }}
                        style={dangerBtnStyle}
                    >
                        Borrar Historial
                    </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                    <button onClick={onClose} style={cancelBtnStyle}>Cancelar</button>
                    <button onClick={handleSave} style={saveBtnStyle}>Guardar</button>
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
    width: '90%', maxWidth: '440px',
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

const sectionStyle: React.CSSProperties = {
    paddingBottom: '20px', marginBottom: '20px',
    borderBottom: '1px solid var(--color-border)',
};

const labelStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '8px',
    fontSize: '14px', fontWeight: 600, color: 'var(--color-text)',
    marginBottom: '8px',
};

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px',
    backgroundColor: 'var(--color-bg-primary)',
    border: '1px solid var(--color-border-light)',
    borderRadius: '8px',
    color: 'var(--color-text)',
    fontSize: '14px',
    outline: 'none',
};

const dangerBtnStyle: React.CSSProperties = {
    padding: '8px 16px',
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    color: 'var(--color-danger)',
    border: '1px solid rgba(255, 71, 87, 0.3)',
    borderRadius: '8px',
    fontSize: '13px', fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
};

const cancelBtnStyle: React.CSSProperties = {
    padding: '10px 18px',
    backgroundColor: 'transparent', color: 'var(--color-text-muted)',
    border: '1px solid var(--color-border)', borderRadius: '8px',
    fontSize: '14px', fontWeight: 500, cursor: 'pointer',
};

const saveBtnStyle: React.CSSProperties = {
    padding: '10px 18px',
    backgroundColor: 'var(--color-accent)', color: '#000',
    border: 'none', borderRadius: '8px',
    fontSize: '14px', fontWeight: 600, cursor: 'pointer',
};
