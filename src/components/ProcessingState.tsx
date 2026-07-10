import React, { useState, useEffect } from "react";
import { Sparkles, FileText } from "lucide-react";

const STAGES = [
  "Opening digital vault and authenticating payload...",
  "Translating unstructured text to machine readable formats...",
  "Scanning clauses for deceptive asymmetry modifiers...",
  "Running cognitive checks against best-practice legal benchmarks...",
  "Simplifying dense vocabulary into fifth-grade readability...",
  "Formulating safe, balanced replacement drafts...",
  "Summation of risk vectors and calculating final risk metric..."
];

export default function ProcessingState() {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStageIndex((prev) => (prev + 1) % STAGES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-lg mx-auto py-16 px-4 text-center select-none space-y-8 animate-fade-in">
      
      {/* Cycling stage notification */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#27AE60]/10 border border-[#27AE60]/20 text-[#27AE60] text-xs font-semibold uppercase tracking-wider rounded-full">
          <Sparkles className="w-3.5 h-3.5 animate-spin" />
          Analyzing Draft
        </div>
        <p className="font-serif font-bold text-lg text-[#1A1A1A] h-8 duration-300 transition-all">
          {STAGES[currentStageIndex]}
        </p>
        <p className="text-[10px] uppercase font-mono text-[#B6A293] tracking-widest animate-pulse">
          Usually takes around 3-5 seconds
        </p>
      </div>

      {/* Structured documents pulsing skeleton loader mapping standard contract pages */}
      <div className="bg-white rounded-3xl border border-[#D3C2B5] shadow-lg p-6 relative overflow-hidden text-left max-w-sm mx-auto">
        
        {/* Subtle physical paper layout markers */}
        <div className="absolute top-0 bottom-0 left-6 border-l border-red-200 opacity-60"></div>
        <div className="absolute top-4 right-4 font-mono text-[9px] text-[#B6A293]">
          PAGE 1 OF 1
        </div>

        {/* Pulsing content rows */}
        <div className="space-y-6 pl-6 animate-pulse">
          {/* Header Title blocks */}
          <div className="space-y-2">
            <div className="h-4 bg-[#EAE6DF] rounded-md w-3/4"></div>
            <div className="h-3 bg-[#F4F1EA] rounded-md w-1/2"></div>
          </div>

          <div className="border-t border-[#EAE6DF] pt-4"></div>

          {/* Body Block 1 */}
          <div className="space-y-2.5">
            <div className="h-2.5 bg-[#EAE6DF] rounded w-full"></div>
            <div className="h-2.5 bg-[#F4F1EA] rounded w-full"></div>
            <div className="h-2.5 bg-[#F4F1EA] rounded w-5/6"></div>
          </div>

          {/* Marked Unfair block highlighted representation inside skeleton */}
          <div className="p-3 bg-red-50/70 border border-red-100 rounded-lg space-y-2">
            <div className="h-2.5 bg-red-200/60 rounded w-1/4"></div>
            <div className="h-2.5 bg-red-100/50 rounded w-full"></div>
            <div className="h-2.5 bg-red-100/50 rounded w-11/12"></div>
          </div>

          {/* Body Block 2 */}
          <div className="space-y-2.5">
            <div className="h-2.5 bg-[#EAE6DF] rounded w-11/12"></div>
            <div className="h-2.5 bg-[#F4F1EA] rounded w-full"></div>
          </div>

          {/* Sig line representing contract end */}
          <div className="pt-6 flex justify-between items-center opacity-60">
            <div className="space-y-1">
              <div className="h-2 bg-[#EAE6DF] rounded w-12"></div>
              <div className="h-1 bg-[#F4F1EA] rounded w-20"></div>
            </div>
            <div className="space-y-1">
              <div className="h-2 bg-[#EAE6DF] rounded w-12"></div>
              <div className="h-1 bg-[#F4F1EA] rounded w-20"></div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
