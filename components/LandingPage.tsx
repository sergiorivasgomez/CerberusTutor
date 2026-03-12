'use client';

import React, { useState } from 'react';

interface LandingPageProps {
  onEnter: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  const [isExiting, setIsExiting] = useState(false);

  React.useEffect(() => {
    const handleFirstClick = () => {
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      // Remove listener after first interaction
      document.removeEventListener('click', handleFirstClick);
    };

    document.addEventListener('click', handleFirstClick);
    return () => document.removeEventListener('click', handleFirstClick);
  }, []);

  const handleEnter = () => {
    setIsExiting(true);
    
    // Attempt to enter fullscreen
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    }

    setTimeout(onEnter, 600); // Match CSS transition
  };

  return (
    <div 
      className={`landing-wrapper ${isExiting ? 'landing-exit' : ''}`}
      style={{ backgroundImage: 'url("/Fondo_LP.png")' }}
    >
      <div className="landing-content">
        <button 
          className="landing-button-large"
          onClick={handleEnter}
          aria-label="Entrar a CT Expert"
        >
          Prueba Gratis
        </button>
      </div>
    </div>
  );
};
