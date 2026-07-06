import React from 'react';

interface ZenOSLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'custom';
  showText?: boolean;
  textColor?: string;
  className?: string;
  customSize?: number;
}

export default function ZenOSLogo({ 
  size = 'md', 
  showText = true, 
  textColor = 'text-slate-900 dark:text-white',
  className = '', 
  customSize 
}: ZenOSLogoProps) {
  
  const sizeMap = {
    sm: { symbol: 24, text: 'text-sm', sub: 'text-[7px]' },
    md: { symbol: 36, text: 'text-xl', sub: 'text-[9px]' },
    lg: { symbol: 56, text: 'text-3xl', sub: 'text-[11px]' },
    xl: { symbol: 96, text: 'text-5xl', sub: 'text-[13px]' },
    '2xl': { symbol: 140, text: 'text-6xl', sub: 'text-[15px]' },
    custom: { symbol: customSize || 36, text: 'text-xl', sub: 'text-[9px]' }
  };

  const current = sizeMap[size];

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {/* Beautiful High-Fidelity SVG Z Logo */}
      <svg 
        viewBox="0 0 100 100" 
        width={current.symbol} 
        height={current.symbol} 
        className="drop-shadow-[0_0_15px_rgba(56,189,248,0.25)] select-none transition-transform duration-300 hover:scale-105"
      >
        <defs>
          {/* Silver metallic chrome gradient */}
          <linearGradient id="silver-metal-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="30%" stopColor="#cbd5e1" />
            <stop offset="60%" stopColor="#64748b" />
            <stop offset="85%" stopColor="#334155" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* Electric blue neon gradient for the slash */}
          <linearGradient id="neon-electric-blue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="40%" stopColor="#0ea5e9" />
            <stop offset="80%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>

          {/* Ambient cyan backlight */}
          <radialGradient id="cyan-backglow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#0ea5e9" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Outer orbital decorative ring */}
        <circle 
          cx="50" 
          cy="50" 
          r="46" 
          fill="none" 
          stroke="url(#neon-electric-blue)" 
          strokeWidth="0.5" 
          strokeDasharray="3 6" 
          className="opacity-20 animate-[spin_120s_linear_infinite]" 
        />

        {/* Ambient Backglow */}
        <circle cx="50" cy="50" r="30" fill="url(#cyan-backglow)" className="mix-blend-screen" />

        {/* Stylized "Z" - Metallic Base Frame */}
        {/* Top Plate */}
        <path d="M 22 24 H 74 L 66 36 H 29 Z" fill="url(#silver-metal-grad)" />
        {/* Bottom Plate */}
        <path d="M 26 64 H 78 L 70 76 H 22 Z" fill="url(#silver-metal-grad)" />
        {/* Core Metal Diagonal Bar */}
        <path d="M 66 36 L 31 64 H 43 L 72 36 Z" fill="url(#silver-metal-grad)" opacity="0.85" />

        {/* Electric Glowing Blue Overlay Slash (The glass neon blade) */}
        <path 
          d="M 57 36 L 25 64 H 36 L 68 36 Z" 
          fill="url(#neon-electric-blue)" 
          filter="drop-shadow(0 0 6px rgba(56, 189, 248, 0.8))"
        />

        {/* Bright metallic specular reflection/glint */}
        <path d="M 56 37 L 33 63 H 37 L 61 37 Z" fill="#ffffff" opacity="0.4" />
      </svg>

      {/* Brand Typography */}
      {showText && (
        <div className="mt-2 select-none animate-in fade-in duration-500">
          <div className="flex items-center justify-center font-sans tracking-tight">
            <span className={`font-medium ${current.text} ${textColor}`}>Zen</span>
            <span className={`font-black ${current.text} bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(56,189,248,0.3)]`}>OS</span>
          </div>
          
          <div className="flex items-center justify-center gap-1.5 mt-0.5 opacity-80">
            <div className="h-[0.5px] w-3 bg-gradient-to-r from-transparent to-sky-400/50" />
            <span className={`font-mono font-bold tracking-[0.25em] uppercase text-slate-400 dark:text-slate-500 ${current.sub}`}>
              Finance
            </span>
            <div className="h-[0.5px] w-3 bg-gradient-to-l from-transparent to-sky-400/50" />
          </div>
        </div>
      )}
    </div>
  );
}
