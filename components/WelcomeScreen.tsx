'use client';

import { QUICK_ACTIONS, Mode } from '@/lib/constants';

interface WelcomeScreenProps {
    onSendMessage: (text: string, mode: Mode) => void;
}

const STATS = [
    { value: '14.5', label: 'Cerberus\nVersion' },
    { value: '6+', label: 'Módulos\nEspecializados' },
    { value: '24/7', label: 'Asistencia\nDisponible' },
];

export function WelcomeScreen({ onSendMessage }: WelcomeScreenProps) {
    return (
        <div className="welcome-screen">

            {/* ── HERO SECTION ─────────────────────────────── */}
            <div className="welcome-hero">
                <div className="welcome-eyebrow">
                    <span className="eyebrow-dot" aria-hidden="true" />
                    Sistema de Asistencia Técnica · Intervención de Pozos
                </div>

                <h1 className="welcome-title">
                    <span className="title-line-1">CT Expert</span>
                    <span className="title-divider" aria-hidden="true">&</span>
                    <span className="title-line-2">Cerberus Tutor</span>
                </h1>

                <p className="welcome-subtitle">
                    Ingeniero Senior de Intervención de Pozos. Especializado en Coiled Tubing,
                    diseño de programas, contingencias y la suite completa de simulación
                    <strong> Cerberus 14.5</strong>.
                </p>

                {/* STATS BAR */}
                <div className="welcome-stats" role="list" aria-label="Estadísticas del sistema">
                    {STATS.map(({ value, label }) => (
                        <div key={value} className="stat-item" role="listitem">
                            <span className="stat-value">{value}</span>
                            <span className="stat-label">{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── CERBERUS HINT ────────────────────────────── */}
            <div className="welcome-hint-card">
                <div className="hint-icon" aria-hidden="true">📸</div>
                <p>
                    En modo <strong>Cerberus Tutor</strong>, cada instrucción incluye
                    capturas interactivas del manual oficial. Pasa el cursor sobre{' '}
                    <span className="guide-link-demo" aria-label="Ejemplo de enlace de guía">
                        📸 Guía
                    </span>{' '}
                    para la miniatura, o haz clic para pantalla completa.
                </p>
            </div>

            {/* ── QUICK ACTIONS ────────────────────────────── */}
            <div className="quick-actions-label">Temas frecuentes — elige uno para comenzar</div>
            <div className="quick-actions" role="list" aria-label="Acciones rápidas">
                {QUICK_ACTIONS.map((action, i) => (
                    <button
                        key={action.title}
                        className={`quick-action qa-delay-${i}`}
                        role="listitem"
                        onClick={() => onSendMessage(action.prompt, action.mode)}
                    >
                        <span className="quick-action-mode-dot" data-mode={action.mode} aria-hidden="true" />
                        <div className="quick-action-title">{action.title}</div>
                        <div className="quick-action-desc">{action.desc}</div>
                    </button>
                ))}
            </div>

        </div>
    );
}
