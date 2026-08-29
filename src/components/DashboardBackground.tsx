import React from 'react';

interface DashboardBackgroundProps {
  variant: 'centre' | 'farmer';
}

export const DashboardBackground: React.FC<DashboardBackgroundProps> = ({ variant }) => {
  return (
    <div className="hidden md:block fixed inset-0 pointer-events-none z-[-1] overflow-hidden bg-slate-50">
      {/* Decorative colorful glow blobs */}
      {variant === 'centre' ? (
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
      {variant === 'centre' ? (
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
