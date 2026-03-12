'use client';

import Image from 'next/image';
import {
    Wrench,
    BookOpen,
    Home,
    MessageSquare,
    Settings,
    Activity,
    Droplets,
    Gauge,
    AlertTriangle,
    PanelLeftClose,
    PanelLeftOpen,
} from 'lucide-react';
import { Mode, CERBERUS_MODULE_PROMPTS } from '@/lib/constants';

interface SidebarProps {
    mode: Mode;
    sidebarOpen: boolean;
    onModeChange: (mode: Mode) => void;
    onSendMessage: (text: string, mode: Mode) => void;
    onToggle: () => void;
    onNewConversation: () => void;
    onOpenSettings: () => void;
    onOpenHistory: () => void;
}

const CERBERUS_MODULE_ITEMS = [
    { label: 'Achilles (Fatiga)', icon: Activity, index: 0 },
    { label: 'Hydra (Hidráulica)', icon: Droplets, index: 1 },
    { label: 'Orpheus (Buckling)', icon: Gauge, index: 2 },
    { label: 'Jars (Martilleo)', icon: AlertTriangle, index: 3 },
] as const;

export function Sidebar({
    mode,
    sidebarOpen,
    onModeChange,
    onSendMessage,
    onToggle,
    onNewConversation,
    onOpenHistory,
    onOpenSettings,
}: SidebarProps) {
    const sidebarStyle = sidebarOpen
        ? undefined
        : { width: 0, minWidth: 0, padding: 0, overflow: 'hidden' };

    return (
        <>
            {/* Toggle button — always visible outside sidebar */}
            <button
                onClick={onToggle}
                aria-label={sidebarOpen ? 'Cerrar barra lateral' : 'Abrir barra lateral'}
                className="sidebar-toggle"
                style={{
                    position: 'fixed',
                    left: sidebarOpen ? '272px' : '12px',
                    top: '14px',
                    zIndex: 200,
                    transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
            >
                {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            </button>

            <aside
                className={`sidebar ${sidebarOpen ? '' : 'sidebar-closed'}`}
                style={sidebarStyle}
            >
                <div className="sidebar-header" style={{ padding: '0', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ position: 'relative', width: '240px', height: '240px', flexShrink: 0 }}>
                        <Image
                            src="/brand-logo.png"
                            alt="CT Expert Logo"
                            fill
                            style={{ objectFit: 'contain' }}
                        />
                    </div>
                </div>

                <nav className="sidebar-nav" aria-label="Módulos de navegación">
                    <div className="sidebar-section-label">Módulos</div>

                    <button
                        className={`sidebar-item ${mode === 'ct-expert' ? 'active' : ''}`}
                        onClick={() => onModeChange('ct-expert')}
                        aria-current={mode === 'ct-expert' ? 'page' : undefined}
                    >
                        <Wrench className="sidebar-item-icon" aria-hidden="true" />
                        CT Expert
                    </button>

                    <button
                        className={`sidebar-item ${mode === 'cerberus' ? 'active' : ''}`}
                        onClick={() => onModeChange('cerberus')}
                        aria-current={mode === 'cerberus' ? 'page' : undefined}
                    >
                        <BookOpen className="sidebar-item-icon" aria-hidden="true" />
                        Cerberus Tutor
                    </button>

                    <div className="sidebar-section-label">Cerberus Modules</div>

                    {CERBERUS_MODULE_ITEMS.map(({ label, icon: Icon, index }) => (
                        <button
                            key={label}
                            className="sidebar-item"
                            onClick={() => {
                                onModeChange('cerberus');
                                onSendMessage(CERBERUS_MODULE_PROMPTS[index].prompt, 'cerberus');
                            }}
                        >
                            <Icon className="sidebar-item-icon" aria-hidden="true" />
                            {label}
                        </button>
                    ))}

                    <div className="sidebar-section-label">General</div>

                    <button className="sidebar-item" onClick={onNewConversation}>
                        <Home className="sidebar-item-icon" aria-hidden="true" />
                        Nueva Conversación
                    </button>

                    <button className="sidebar-item" onClick={onOpenHistory}>
                        <MessageSquare className="sidebar-item-icon" aria-hidden="true" />
                        Historial
                    </button>

                    <button className="sidebar-item" onClick={onOpenSettings}>
                        <Settings className="sidebar-item-icon" aria-hidden="true" />
                        Configuración
                    </button>
                </nav>

                <div className="sidebar-footer">
                    <div className="api-status" role="status" aria-label="Estado de conexión">
                        <div className="api-status-dot" aria-hidden="true" />
                        <span>Gemini API Conectada</span>
                    </div>
                    <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '11px', color: 'var(--color-text-muted)', opacity: 0.8 }}>
                        <div>Creado por Sergio Rivas</div>
                        <div style={{ marginTop: '2px' }}>&copy; 2026</div>
                    </div>
                </div>
            </aside>
        </>
    );
}
