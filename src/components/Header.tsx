import React from "react";

interface HeaderProps {
  subtitle?: string;
  onNavigateHome?: () => void;
}

export default function Header({ subtitle, onNavigateHome }: HeaderProps) {
  return (
    <div className="flex flex-col items-center justify-center py-6 px-4 text-center select-none">
      <div 
        onClick={onNavigateHome}
        className="cursor-pointer group flex flex-col items-center"
      >
        {/* Brand markup with premium custom typography pairings */}
        <div className="flex items-baseline justify-center tracking-tight">
          <span className="font-serif font-extrabold text-[34px] md:text-[40px] text-[#1A1A1A] tracking-tighter uppercase transition-colors duration-200 group-hover:text-black">
            CLEAR
          </span>
          <span className="font-cursive text-3xl md:text-4xl text-[#5C4033] ml-1 lowercase font-semibold">
            contract
          </span>
        </div>
        
        {/* Underline strike-through mimicking custom hand-drawn calligraphy strokes under the contract logo */}
        <div className="w-48 h-2 mt-1 relative overflow-visible">
          <svg
            viewBox="0 0 200 10"
            className="absolute left-0 top-0 w-full text-[#5C4033] opacity-80"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          >
            <path d="M5,4 Q80,7 195,3" />
          </svg>
        </div>
      </div>

      {subtitle && (
        <span className="font-mono text-[10px] uppercase tracking-widest text-[#B6A293] mt-2 block">
          {subtitle}
        </span>
      )}
    </div>
  );
}
