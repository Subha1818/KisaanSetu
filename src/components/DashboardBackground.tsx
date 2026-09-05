import React from 'react';

interface DashboardBackgroundProps {
  variant: 'centre' | 'farmer' | 'admin';
}

export const DashboardBackground: React.FC<DashboardBackgroundProps> = ({ variant }) => {
  return (
    <div className="hidden md:block fixed inset-0 pointer-events-none z-[-1] overflow-hidden bg-slate-50">
      {/* Decorative colorful glow blobs */}
      {variant === 'admin' ? (
        <>
          <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-to-br from-slate-300/40 via-indigo-100/25 to-blue-50/10 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-gradient-to-tl from-indigo-200/25 via-slate-200/30 to-amber-100/20 rounded-full blur-[120px] translate-x-1/3 translate-y-1/3" />
        </>
      ) : variant === 'centre' ? (
        <>
          <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-to-br from-indigo-200/40 to-blue-100/10 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-gradient-to-tl from-blue-200/30 to-indigo-100/10 rounded-full blur-[120px] translate-x-1/3 translate-y-1/3" />
        </>
      ) : (
        <>
          <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-to-br from-emerald-200/40 to-teal-100/10 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-gradient-to-tl from-teal-200/30 to-emerald-100/10 rounded-full blur-[120px] translate-x-1/3 translate-y-1/3" />
        </>
      )}

      {/* Margin Illustrations (Full Color) */}
      {variant === 'admin' ? (
        <>
          {/* Left illustration: Official Civic Colonnade & Ministry Seal */}
          <svg className="absolute top-28 -left-12 w-[420px] h-[420px] opacity-45 mix-blend-multiply" viewBox="0 0 400 400" fill="none">
            {/* Concentric official seal rings */}
            <circle cx="150" cy="250" r="140" stroke="#818CF8" strokeWidth="2.5" strokeDasharray="8 6" opacity="0.4" />
            <circle cx="150" cy="250" r="120" stroke="#6366F1" strokeWidth="1.5" opacity="0.3" />
            <circle cx="150" cy="250" r="105" fill="#EEF2FF" opacity="0.4" />
            
            {/* Classical Pediment & Columns (Government Building) */}
            <path d="M 60 210 L 150 155 L 240 210 Z" fill="#94A3B8" />
            <path d="M 50 210 L 250 210 L 250 222 L 50 222 Z" fill="#CBD5E1" />
            <circle cx="150" cy="188" r="9" fill="#F59E0B" opacity="0.6" />
            
            {/* 4 Stately Columns */}
            <rect x="75" y="226" width="18" height="90" rx="3" fill="#CBD5E1" />
            <rect x="115" y="226" width="18" height="90" rx="3" fill="#E2E8F0" />
            <rect x="165" y="226" width="18" height="90" rx="3" fill="#E2E8F0" />
            <rect x="205" y="226" width="18" height="90" rx="3" fill="#CBD5E1" />
            
            {/* Plinth Steps */}
            <rect x="45" y="320" width="210" height="12" rx="2" fill="#94A3B8" />
            <rect x="35" y="334" width="230" height="15" rx="3" fill="#64748B" />
          </svg>

          {/* Right illustration: Balance of Weights & Administrative Registry Ledger */}
          <svg className="absolute bottom-8 -right-16 w-[480px] h-[480px] opacity-45 mix-blend-multiply" viewBox="0 0 500 500" fill="none">
            {/* Balance scales of fair procurement */}
            <circle cx="280" cy="185" r="9" fill="#F59E0B" opacity="0.8" />
            <rect x="276" y="194" width="8" height="160" rx="3" fill="#64748B" />
            <line x1="200" y1="215" x2="360" y2="215" stroke="#475569" strokeWidth="6" strokeLinecap="round" />
            
            {/* Left scale pan */}
            <line x1="210" y1="215" x2="190" y2="265" stroke="#94A3B8" strokeWidth="2" />
            <line x1="210" y1="215" x2="230" y2="265" stroke="#94A3B8" strokeWidth="2" />
            <path d="M 180 265 Q 210 285 240 265 Z" fill="#818CF8" opacity="0.65" />
            
            {/* Right scale pan */}
            <line x1="350" y1="215" x2="330" y2="265" stroke="#94A3B8" strokeWidth="2" />
            <line x1="350" y1="215" x2="370" y2="265" stroke="#94A3B8" strokeWidth="2" />
            <path d="M 320 265 Q 350 285 380 265 Z" fill="#6366F1" opacity="0.65" />
            
            {/* Base pedestal */}
            <path d="M 250 354 L 310 354 L 325 372 L 235 372 Z" fill="#475569" />

            {/* Official Administrative Ledger Book */}
            <rect x="330" y="300" width="130" height="150" rx="10" fill="#F1F5F9" stroke="#94A3B8" strokeWidth="2.5" />
            <line x1="350" y1="330" x2="435" y2="330" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" />
            <line x1="350" y1="350" x2="415" y2="350" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" />
            <line x1="350" y1="370" x2="430" y2="370" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" />
            <line x1="350" y1="390" x2="400" y2="390" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" />
            <line x1="350" y1="410" x2="425" y2="410" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" />
            
            {/* Official seal & ribbon stamp on registry */}
            <circle cx="425" cy="415" r="16" fill="#F59E0B" opacity="0.8" />
            <path d="M 420 427 L 415 448 L 425 442 L 430 448 L 430 427 Z" fill="#D97706" opacity="0.8" />
          </svg>
        </>
      ) : variant === 'centre' ? (
        <>
          {/* Left illustration: Abstract stacked grain silos or fields */}
          <svg className="absolute top-32 -left-16 w-96 h-96 opacity-60 mix-blend-multiply" viewBox="0 0 400 400" fill="none">
            <path d="M50 300 Q150 250 250 350 L50 350 Z" fill="#E0E7FF" />
            <path d="M0 250 Q100 200 200 300 L0 300 Z" fill="#C7D2FE" />
            <path d="M100 350 Q200 280 300 380 L100 380 Z" fill="#A5B4FC" />
            <circle cx="80" cy="150" r="40" fill="#FDBA74" className="opacity-40" />
            <path d="M60 180 L80 120 L100 180 Z" fill="#818CF8" />
            <path d="M120 200 L140 140 L160 200 Z" fill="#6366F1" />
          </svg>
          
          {/* Right illustration: Farm & Depot motif */}
          <svg className="absolute bottom-10 -right-20 w-[500px] h-[500px] opacity-50 mix-blend-multiply" viewBox="0 0 500 500" fill="none">
            <path d="M300 450 Q400 350 500 400 L500 500 L300 500 Z" fill="#DBEAFE" />
            <path d="M200 500 Q350 400 450 500 Z" fill="#BFDBFE" />
            <rect x="350" y="300" width="80" height="100" fill="#93C5FD" rx="8" />
            <path d="M340 300 L390 250 L440 300 Z" fill="#60A5FA" />
            <circle cx="430" cy="200" r="60" fill="#FDE047" className="opacity-30" />
            <rect x="370" y="330" width="20" height="30" fill="#3B82F6" />
          </svg>
        </>
      ) : (
        <>
          {/* Left illustration: Leaves and nature */}
          <svg className="absolute top-32 -left-16 w-96 h-96 opacity-60 mix-blend-multiply" viewBox="0 0 400 400" fill="none">
            <path d="M50 300 Q150 250 250 350 L50 350 Z" fill="#D1FAE5" />
            <path d="M0 250 Q100 200 200 300 L0 300 Z" fill="#A7F3D0" />
            <path d="M100 350 Q200 280 300 380 L100 380 Z" fill="#6EE7B7" />
            <path d="M100 200 C50 150 100 100 150 150 C120 180 100 200 100 200 Z" fill="#34D399" />
            <path d="M150 250 C100 200 150 150 200 200 C170 230 150 250 150 250 Z" fill="#10B981" />
            <circle cx="80" cy="150" r="40" fill="#FDE047" className="opacity-40" />
          </svg>
          
          {/* Right illustration: Crops */}
          <svg className="absolute bottom-10 -right-20 w-[500px] h-[500px] opacity-50 mix-blend-multiply" viewBox="0 0 500 500" fill="none">
            <path d="M300 450 Q400 350 500 400 L500 500 L300 500 Z" fill="#CCFBF1" />
            <path d="M200 500 Q350 400 450 500 Z" fill="#99F6E4" />
            <path d="M380 400 Q400 300 420 400" stroke="#14B8A6" strokeWidth="8" strokeLinecap="round" />
            <path d="M350 380 Q370 280 390 380" stroke="#0D9488" strokeWidth="8" strokeLinecap="round" />
            <path d="M410 420 Q430 320 450 420" stroke="#0F766E" strokeWidth="8" strokeLinecap="round" />
            <circle cx="430" cy="200" r="60" fill="#FEF08A" className="opacity-30" />
          </svg>
        </>
      )}

      {/* Central fade mask overlay - protects inner content readability by fading out the illustration in the middle */}
      <div className="absolute inset-0 bg-slate-50" style={{
        maskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)'
      }}></div>
      
      {/* Top and Bottom fade masks so it blends cleanly with the header/footer */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-slate-50 to-transparent"></div>
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-50 to-transparent"></div>
    </div>
  );
};
