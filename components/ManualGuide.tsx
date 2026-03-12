'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

// =============================================
// ManualGuideLink Component
// =============================================
interface ManualGuideLinkProps {
    pageNumber: number;
    caption: string;
    onOpenModal: (pageNumber: number, caption: string) => void;
}

export function ManualGuideLink({ pageNumber, caption, onOpenModal }: ManualGuideLinkProps) {
    const [showTooltip, setShowTooltip] = useState(false);
    const linkRef = useRef<HTMLSpanElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleMouseEnter = () => {
        hoverTimeoutRef.current = setTimeout(() => {
            setShowTooltip(true);
        }, 300);
    };

    const handleMouseLeave = () => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }
        setShowTooltip(false);
    };

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onOpenModal(pageNumber, caption);
    };

    // Position tooltip
    useEffect(() => {
        if (!showTooltip || !tooltipRef.current || !linkRef.current) return;
        const linkRect = linkRef.current.getBoundingClientRect();
        const tooltip = tooltipRef.current;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Try positioning above the link first
        const tooltipHeight = 300; // approximate height
        let top = linkRect.top - tooltipHeight - 8;

        // If it would go off the top, position below instead
        if (top < 10) {
            top = linkRect.bottom + 8;
        }

        // Clamp to viewport
        if (top + tooltipHeight > viewportHeight - 10) {
            top = viewportHeight - tooltipHeight - 10;
        }

        tooltip.style.top = `${top}px`;

        // Center horizontally, but keep within viewport
        let left = linkRect.left + linkRect.width / 2 - 160;
        if (left < 10) left = 10;
        if (left + 320 > viewportWidth - 10) left = viewportWidth - 330;
        tooltip.style.left = `${left}px`;
    }, [showTooltip]);

    // Build the PDF URL with page parameter
    const pdfUrl = `/api/manual-pdf#page=${pageNumber}`;

    return (
        <>
            <span
                ref={linkRef}
                className="guide-link"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={handleClick}
                role="button"
                tabIndex={0}
                title={`Ver: ${caption}`}
            >
                📸 Guía
            </span>

            {showTooltip && (
                <div ref={tooltipRef} className="guide-tooltip" onMouseLeave={handleMouseLeave}>
                    <div className="guide-tooltip-header">{caption}</div>
                    <div className="guide-tooltip-body">
                        <iframe
                            src={pdfUrl}
                            className="guide-tooltip-iframe"
                            title={caption}
                        />
                    </div>
                    <div className="guide-tooltip-footer">Clic para ver en tamaño completo</div>
                </div>
            )}
        </>
    );
}

// =============================================
// ManualImageModal Component
// =============================================
interface ManualImageModalProps {
    isOpen: boolean;
    pageNumber: number;
    caption: string;
    onClose: () => void;
}

export function ManualImageModal({ isOpen, pageNumber, caption, onClose }: ManualImageModalProps) {
    const [zoom, setZoom] = useState(100);
    const [isLoading, setIsLoading] = useState(true);
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            const timer = setTimeout(() => {
                setZoom(100);
                setIsLoading(true);
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const handleIframeLoad = useCallback(() => {
        setIsLoading(false);
    }, []);

    if (!isOpen) return null;

    const handleZoomIn = () => setZoom(z => Math.min(z + 25, 200));
    const handleZoomOut = () => setZoom(z => Math.max(z - 25, 50));
    const handleZoomReset = () => setZoom(100);

    const pdfUrl = `/api/manual-pdf#page=${pageNumber}`;

    return (
        <div className="guide-modal-overlay" onClick={onClose}>
            <div className={`guide-modal ${isMaximized ? 'maximized' : ''}`} onClick={e => e.stopPropagation()}>
                {/* Modal Header */}
                <div className="guide-modal-header">
                    <div className="guide-modal-title">
                        <span className="guide-modal-icon">📖</span>
                        <div>
                            <div className="guide-modal-caption">{caption}</div>
                            <div className="guide-modal-page">Manual Cerberus 14.5 — Página {pageNumber}</div>
                        </div>
                    </div>
                    <div className="guide-modal-controls">
                        <button onClick={() => setIsMaximized(!isMaximized)} className="guide-modal-btn" title={isMaximized ? "Restaurar" : "Maximizar"}>
                            {isMaximized ? '🗗' : '🗖'}
                        </button>
                        <button onClick={handleZoomOut} className="guide-modal-btn" title="Reducir">−</button>
                        <button onClick={handleZoomReset} className="guide-modal-btn" title="Restablecer">{zoom}%</button>
                        <button onClick={handleZoomIn} className="guide-modal-btn" title="Ampliar">+</button>
                        <button onClick={onClose} className="guide-modal-close" title="Cerrar">✕</button>
                    </div>
                </div>

                {/* Modal Body */}
                <div className="guide-modal-body">
                    {isLoading && (
                        <div className="guide-modal-loading-overlay">
                            <div className="guide-tooltip-spinner large" />
                            <span>Cargando página {pageNumber}...</span>
                        </div>
                    )}
                    <iframe
                        src={pdfUrl}
                        className="guide-modal-iframe"
                        style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
                        title={`${caption} - Página ${pageNumber}`}
                        onLoad={handleIframeLoad}
                    />
                </div>
            </div>
        </div>
    );
}
