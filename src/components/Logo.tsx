import React from 'react';
import logoImg from '../assets/kisaansetu_logo.png';

interface LogoProps {
  className?: string;
  alt?: string;
}

/**
 * KisaanSetu Brand Logo Component
 * Fits the wheat emblem from kisaansetu_logo.png and safely clips out the bottom "kisaansetu" text.
 */
export const Logo: React.FC<LogoProps> = ({ className = 'w-9 h-9', alt = 'KisaanSetu' }) => {
  return (
    <div
      className={`relative overflow-hidden flex items-center justify-center shrink-0 ${className}`}
      aria-label={alt}
    >
      <img
        src={logoImg}
        alt={alt}
        className="w-[190%] max-w-none h-auto select-none pointer-events-none transition-transform duration-300"
        style={{
          // Clip out the bottom 23% where the original image text "KISAANSETU" resides (row 315-348 of 398)
          clipPath: 'inset(0% 0% 23% 0%)',
          transform: 'translateY(-2%)',
        }}
      />
    </div>
  );
};

export default Logo;
