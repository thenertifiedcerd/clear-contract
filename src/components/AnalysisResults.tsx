import React, { useState, useRef, useEffect } from "react";
import { 
  AlertTriangle, 
  CheckCircle, 
  ChevronDown, 
  ChevronUp, 
  MessageSquare, 
  Send, 
  ArrowLeft, 
  Download, 
  Bookmark, 
  BookmarkCheck, 
  Sparkles,
  Info
} from "lucide-react";
import { ContractAnalysis, ChatMessage } from "../types";

interface AnalysisResultsProps {
  analysis: ContractAnalysis;
  contractText: string;
  contractTitle: string;
  contractType: string;
  onGoBack: () => void;
  onSaveContract: () => void;
  isSaved: boolean;
}

export default function AnalysisResults({
  analysis,
  contractText,
  contractTitle,
  contractType,
  onGoBack,
  onSaveContract,
  isSaved
}: AnalysisResultsProps) {
  const [activeTab, setActiveTab] = useState<"review" | "chat">("review");
  const [expandedRedFlag, setExpandedRedFlag] = useState<number | null>(0); // Default expand first red flag
  const [expandedSimplified, setExpandedSimplified] = useState<number | null>(null);
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "ai",
      text: `Hello! I have translated this contract and discovered its key risk levels. Ask me anything about it—for instance, "Can I terminate this early?" or "What are my payment deadlines?"`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatSending, setIsChatSending] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // SVG Gauge calculations
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (analysis.riskScore / 10) * circumference;

  // Determine gauge color
  let gaugeColor = "#27AE60"; // Green
  let gaugeBackground = "bg-green-50 text-green-700 border-green-200";
  if (analysis.riskScore >= 4 && analysis.riskScore <= 6) {
    gaugeColor = "#F2994A"; // Amber
    gaugeBackground = "bg-amber-50 text-amber-700 border-amber-200";
  } else if (analysis.riskScore >= 7) {
    gaugeColor = "#EB5757"; // Red
    gaugeBackground = "bg-red-50 text-red-700 border-red-200";
  }

  // Scroll to bottom of chat
  useEffect(() => {
    if (activeTab === "chat" && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, activeTab]);

  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || isChatSending) return;

    const userMessage: ChatMessage = {
      id: Math.random().toString(),
      sender: "user",
      text: chatInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setIsChatSending(true);

    const aiMessageId = Math.random().toString();
    setChatMessages((prev) => [
      ...prev,
      {
        id: aiMessageId,
        sender: "ai",
        text: "",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);

    const updateAiMessage = (text: string) => {
      setChatMessages((prev) => prev.map((msg) => (
        msg.id === aiMessageId
          ? { ...msg, text }
          : msg
      )));
    };

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...chatMessages, userMessage].map(m => ({ sender: m.sender, text: m.text })),
          contractContext: {
            riskScore: analysis.riskScore,
            riskLabel: analysis.riskLabel,
            plainEnglishSummary: analysis.plainEnglishSummary,
            redFlags: analysis.redFlags
          }
        })
      });

      if (!response.ok || !response.body) {
        const fallbackResponse = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...chatMessages, userMessage].map(m => ({ sender: m.sender, text: m.text })),
            contractContext: {
              riskScore: analysis.riskScore,
              riskLabel: analysis.riskLabel,
              plainEnglishSummary: analysis.plainEnglishSummary,
              redFlags: analysis.redFlags
            }
          })
        });

        const fallbackData = await fallbackResponse.json();
        if (!fallbackData.success || !fallbackData.reply) {
          throw new Error(fallbackData.error || "Failed key evaluation stream");
        }

        updateAiMessage(fallbackData.reply);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamedText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        streamedText += decoder.decode(value, { stream: true });
        updateAiMessage(streamedText);
      }

      if (!streamedText.trim()) {
        throw new Error("Received an empty streamed response.");
      }

    } catch (error) {
      console.error("Chat failure:", error);
      updateAiMessage("I encountered a network issue while streaming the answer. Please try again in a moment.");
    } finally {
      setIsChatSending(false);
    }
  };

  const handleQuickQuestion = (qn: string) => {
    setChatInput(qn);
  };

  const downloadTextReport = () => {
    let reportMd = `CLEARCONTRACT AI REPORT\n=========================\n\nDOCUMENT: ${contractTitle}\nTYPE: ${contractType.toUpperCase()}\nRISK ESTIMATION: ${analysis.riskScore}/10 (${analysis.riskLabel})\n\nSUMMARY:\n--------\n${analysis.plainEnglishSummary}\n\nKEY OBLIGATIONS:\n----------------\n` + 
      analysis.keyObligations.map(k=> `- ${k}`).join("\n") + 
      "\n\n🚩 RED FLAGS NOTED:\n-------------------\n" +
      analysis.redFlags.map((rf, idx) => `${idx+1}. [SEVERITY ${rf.severity}/10] ${rf.clauseTitle}\n   Original clause: "${rf.originalClause}"\n   Risk justification: ${rf.riskReason}\n   Suggested amendment: "${rf.clearContractSuggestion}"`).join("\n\n") + 
      "\n\n---\nDisclaimer: This is NOT legal advice. Always review with a legal professional.";
    
    const blob = new Blob([reportMd], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ClearContract_Report_${contractTitle.replace(/\.[^/.]+$/, "")}.txt`;
    link.click();
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 pb-32 animate-fade-in space-y-6 select-text">
      
      {/* Title & Actions Bar */}
      <div className="flex justify-between items-center bg-[#F4F1EA]/80 backdrop-blur-sm p-4 rounded-2xl border border-[#EAE6DF]">
        <button
          onClick={onGoBack}
          className="flex items-center gap-1.5 text-xs text-[#5C4033] hover:text-[#1A1A1A] font-semibold uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to upload
        </button>

        <div className="flex items-center gap-2">
          {/* Historical Vault Save Trigger */}
          <button
            onClick={onSaveContract}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[11px] font-mono uppercase tracking-wider transition-all duration-200 ${
              isSaved 
                ? "bg-green-50 border-green-200 text-[#27AE60]" 
                : "bg-white hover:bg-[#FDFBF7] border-[#D3C2B5] text-[#5C4033] hover:text-[#1A1A1A]"
            }`}
          >
            {isSaved ? (
              <>
                <BookmarkCheck className="w-3.5 h-3.5" />
                Saved in Vault
              </>
            ) : (
              <>
                <Bookmark className="w-3.5 h-3.5" />
                Save in Vault
              </>
            )}
          </button>

          {/* Download Text files */}
          <button
            onClick={downloadTextReport}
            className="p-1.5 rounded-lg bg-white border border-[#D3C2B5] text-[#5C4033] hover:text-[#1A1A1A] transition-colors"
            title="Download plain text report summary"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Contract Description Banner */}
      <div className="bg-[#5C4033] text-[#FDFBF7] p-5 rounded-2xl shadow-sm space-y-1.5">
        <div className="font-mono text-[9px] uppercase tracking-widest text-[#D3C2B5]">
          Review Session Active
        </div>
        <h2 className="font-serif font-extrabold text-base md:text-lg leading-snug">
          {contractTitle}
        </h2>
        <div className="flex items-center gap-1.5 text-[10px] text-[#FDFBF7]/80 font-mono">
          <span className="capitalize px-1.5 py-0.5 bg-black/20 rounded">Category: {contractType}</span>
          <span>•</span>
          <span>Approx {Math.round(contractText.length / 5)} words</span>
        </div>
      </div>

      {/* Document Review Navigation Tabs */}
      <div className="flex border-b border-[#EAE6DF]">
        <button
          onClick={() => setActiveTab("review")}
          className={`flex-1 py-3 font-semibold text-xs uppercase tracking-widest transition-all ${
            activeTab === "review"
              ? "border-b-2 border-[#27AE60] text-[#1A1A1A]"
              : "border-transparent text-[#B6A293] hover:text-[#5C4033]"
          }`}
        >
          🔍 Contract Report
        </button>
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex-1 py-3 font-semibold text-xs uppercase tracking-widest transition-all flex justify-center items-center gap-1.5 ${
            activeTab === "chat"
              ? "border-b-2 border-[#27AE60] text-[#1A1A1A]"
              : "border-transparent text-[#B6A293] hover:text-[#5C4033]"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          💡 Q&A Contract Coach
        </button>
      </div>

      {activeTab === "review" ? (
        <div className="space-y-6">
          
          {/* OVERVIEW SCORE CARD */}
          <div className="bg-white rounded-3xl border border-[#EAE6DF] p-6 shadow-sm flex flex-col md:flex-row items-center gap-6">
            
            {/* SVG Circular Gauge with White middle */}
            <div className="relative flex items-center justify-center select-none w-28 h-28 shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                {/* Background Ring */}
                <circle
                  cx="56"
                  cy="56"
                  r={radius}
                  className="stroke-[#F4F1EA]"
                  strokeWidth="8"
                  fill="transparent"
                />
                {/* Colored Progress Ring */}
                <circle
                  cx="56"
                  cy="56"
                  r={radius}
                  stroke={gaugeColor}
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out-back"
                />
              </svg>
              {/* Inner Circle metrics block */}
              <div className="absolute inset-2 rounded-full bg-white flex flex-col items-center justify-center shadow-inner">
                <span className="font-serif font-extrabold text-2xl text-[#1A1A1A]">
                  {analysis.riskScore}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-widest text-[#B6A293] -mt-1">
                  OF 10
                </span>
              </div>
            </div>

            {/* Assessment descriptions */}
            <div className="text-center md:text-left space-y-1.5">
              <div className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-mono uppercase font-bold tracking-wider ${gaugeBackground}`}>
                <AlertTriangle className="w-3 h-3" />
                {analysis.riskLabel}
              </div>
              <h3 className="font-serif font-extrabold text-[#1A1A1A] text-base md:text-lg">
                Comprehensive Risk Index Matrix
              </h3>
              <p className="font-sans text-xs text-[#2C2C2C]/80 leading-relaxed">
                Our cognitive parsing engine identified {analysis.redFlags.length} primary red flags. Standard industry checklists flag contracts of this risk level as requiring negotiation.
              </p>
            </div>
          </div>

          {/* PLAIN ENGLISH SUMMARY CARD */}
          <div className="bg-[#EAE6DF] rounded-3xl p-6 border border-[#D3C2B5] shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">📖</span>
              <h4 className="font-serif font-extrabold text-[#1A1A1A] text-sm">
                The Plain English Summary (5th Grade Level Translation)
              </h4>
            </div>
            <p className="font-sans text-xs text-[#2C2C2C] leading-relaxed italic">
              "{analysis.plainEnglishSummary}"
            </p>
            <div className="font-mono text-[9px] text-[#5C4033] bg-[#F4F1EA]/80 rounded p-2 border border-[#D3C2B5]/30">
              💡 <span className="font-semibold">Core takeaway:</span> This sums up your absolute boundary constraints without deep recursive legalese clauses.
            </div>
          </div>

          {/* KEY OBLIGATIONS PANEL */}
          <div className="bg-white rounded-3xl border border-[#EAE6DF] p-6 shadow-sm space-y-4">
            <h4 className="font-serif font-bold text-[#1A1A1A] text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#27AE60]" />
              Your Primary Action Obligations
            </h4>
            <ul className="text-xs text-[#2C2C2C]/90 divide-y divide-[#EAE6DF] flex flex-col">
              {analysis.keyObligations.map((obl, idx) => (
                <li key={idx} className="py-2.5 flex gap-2.5 items-start">
                  <span className="font-mono font-bold text-[#5C4033] bg-[#F4F1EA] px-1.5 py-0.5 rounded text-[10px]">
                    0{idx + 1}
                  </span>
                  <span className="leading-relaxed">{obl}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* RED FLAGS ACCORDION */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 px-1.5">
              <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />
              <h4 className="font-serif font-bold text-sm text-[#1A1A1A]">
                Identified Red Flags & Suggestions ({analysis.redFlags.length})
              </h4>
            </div>

            <div className="space-y-3.5">
              {analysis.redFlags.map((flag, idx) => {
                const isExpanded = expandedRedFlag === idx;
                let severityBadge = "bg-red-50 text-red-700 border-red-200";
                if (flag.severity < 7) {
                  severityBadge = "bg-amber-50 text-amber-700 border-amber-200";
                }

                return (
                  <div 
                    key={idx}
                    className="bg-white rounded-2xl border border-[#D3C2B5] overflow-hidden shadow-sm transition-all duration-300"
                  >
                    {/* Collapsed Header */}
                    <button
                      onClick={() => setExpandedRedFlag(isExpanded ? null : idx)}
                      className="w-full text-left p-4 flex justify-between items-start gap-3 hover:bg-[#FDFBF7] transition-colors"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="text-sm mt-0.5">🚩</span>
                        <div className="space-y-1">
                          <h5 className="font-serif font-bold text-[#1A1A1A] text-xs md:text-sm">
                            {flag.clauseTitle}
                          </h5>
                          <p className="font-sans text-[11px] text-[#5C4033] line-clamp-1 italic">
                            "{flag.originalClause}"
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`font-mono text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border ${severityBadge}`}>
                          Sev {flag.severity}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-[#B6A293]" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-[#B6A293]" />
                        )}
                      </div>
                    </button>

                    {/* Expanded comparison detail view */}
                    {isExpanded && (
                      <div className="border-t border-[#EAE6DF] bg-[#FDFBF7] p-4 space-y-4 animate-slide-down">
                        <div className="space-y-1.5">
                          <span className="font-mono text-[9px] uppercase tracking-wider text-[#5C4033] font-bold block">
                            Original Legalese Wording:
                          </span>
                          <p className="font-mono text-[11px] leading-relaxed text-[#2C2C2C] bg-[#F4F1EA]/60 p-3 rounded-lg border border-[#EAE6DF] select-all">
                            {flag.originalClause}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Unfair logic details card */}
                          <div className="bg-red-50/70 border border-red-200/50 rounded-xl p-3.5 space-y-2">
                            <span className="font-bold text-[10px] text-red-800 uppercase font-mono tracking-widest flex items-center gap-1.5">
                              ❌ Unfair Risk Clause
                            </span>
                            <p className="font-sans text-xs leading-relaxed text-red-950">
                              {flag.riskReason}
                            </p>
                          </div>

                          {/* Suggested remedy card */}
                          <div className="bg-[#27AE60]/10 border border-[#27AE60]/20 rounded-xl p-3.5 space-y-2">
                            <span className="font-bold text-[10px] text-emerald-800 uppercase font-mono tracking-widest flex items-center gap-1.5 animate-pulse">
                              ✅ Alternate Proposal Suggestion
                            </span>
                            <p className="font-sans text-xs leading-relaxed text-emerald-950 select-all font-medium">
                              "{flag.clearContractSuggestion}"
                            </p>
                          </div>
                        </div>

                        <div className="flex justify-end pt-1">
                          <button
                            onClick={() => {
                              setActiveTab("chat");
                              handleQuickQuestion(`What's the best way to ask the client to remove or adjust the "${flag.clauseTitle}" clause?`);
                            }}
                            className="text-[10px] font-mono uppercase bg-[#EAE6DF] hover:bg-[#D3C2B5] text-[#5C4033] px-3 py-1.5 rounded-lg font-bold transition-colors"
                          >
                            Ask Assistant how to negotiate this →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* EXTRA BOILERPLATE TERMS */}
          {analysis.simplifiedTerms && analysis.simplifiedTerms.length > 0 && (
            <div className="bg-white rounded-3xl border border-[#EAE6DF] p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-1 px-1">
                <Info className="w-4 h-4 text-[#5C4033]" />
                <h4 className="font-serif font-bold text-sm text-[#1A1A1A]">
                  Key Boilerplate Terms Simplified
                </h4>
              </div>

              <div className="divide-y divide-[#EAE6DF]">
                {analysis.simplifiedTerms.map((term, sIdx) => {
                  const sExpanded = expandedSimplified === sIdx;
                  return (
                    <div key={sIdx} className="py-3">
                      <button
                        onClick={() => setExpandedSimplified(sExpanded ? null : sIdx)}
                        className="w-full flex justify-between items-center text-left"
                      >
                        <span className="font-serif font-bold text-[#1A1A1A] text-xs">
                          {term.topic}
                        </span>
                        <span className="text-[10px] font-mono text-[#5C4033] flex items-center gap-1 font-semibold">
                          {sExpanded ? "Hide legalese" : "Show translation"}
                          {sExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </span>
                      </button>

                      {sExpanded ? (
                        <div className="mt-2.5 p-3.5 bg-[#F4F1EA] rounded-xl border border-[#EAE6DF] space-y-2 text-xs">
                          <div>
                            <span className="font-mono text-[8px] uppercase font-bold text-gray-500 block mb-0.5">Original standard draft:</span>
                            <p className="font-mono text-[10px] text-gray-700 italic select-all">"{term.legaleseExplanation}"</p>
                          </div>
                          <div className="border-t border-[#D3C2B5]/50 my-1"></div>
                          <div>
                            <span className="font-mono text-[8px] uppercase font-bold text-[#27AE60] block mb-0.5">What it actually means:</span>
                            <p className="font-sans text-[#2C2C2C]/90 font-medium">{term.simplifiedExplanation}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="font-sans text-xs text-[#2C2C2C]/80 mt-1 line-clamp-2">
                          {term.simplifiedExplanation}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      ) : (
        /* ASSISTANT CHAT SCREEN VIEW */
        <div className="bg-white rounded-3xl border border-[#D3C2B5] h-[550px] shadow-sm flex flex-col overflow-hidden">
          
          {/* Header metadata details */}
          <div className="bg-[#F4F1EA] p-4 border-b border-[#D3C2B5] flex justify-between items-center select-none">
            <div className="flex items-center gap-2">
              <span className="p-1 px-1.5 rounded bg-black/5 text-xs text-center border font-mono">🛡️</span>
              <div>
                <h5 className="font-serif font-bold text-[#1A1A1A] text-xs">ClearContract Pro Coach</h5>
                <p className="text-[9px] font-mono text-[#5C4033]">Document context uploaded & synchronized</p>
              </div>
            </div>
            <span className="text-[9px] uppercase font-mono tracking-widest text-[#27AE60] font-bold bg-[#27AE60]/10 border border-[#27AE60]/20 px-2 py-0.5 rounded">
              Cognitive Active
            </span>
          </div>

          {/* Quick Query suggest shortcuts */}
          <div className="bg-[#FDFBF7] p-2 border-b border-[#EAE6DF] flex gap-2 overflow-x-auto select-none shrink-0">
            <button
              onClick={() => handleQuickQuestion("Is there an exit clause / early cancellation potential here?")}
              className="text-[10px] font-sans border border-[#D3C2B5] hover:border-[#5C4033] bg-white rounded-lg px-2.5 py-1 text-[#5C4033] hover:bg-[#FDFBF7] whitespace-nowrap active:scale-95"
            >
              Early exit rights?
            </button>
            <button
              onClick={() => handleQuickQuestion("Explain the liability limit on damages in simple terms.")}
              className="text-[10px] font-sans border border-[#D3C2B5] hover:border-[#5C4033] bg-white rounded-lg px-2.5 py-1 text-[#5C4033] hover:bg-[#FDFBF7] whitespace-nowrap active:scale-95"
            >
              How liability works?
            </button>
            <button
              onClick={() => handleQuickQuestion("Help me draft a friendly negotiation email asking to change the payment terms.")}
              className="text-[10px] font-sans border border-[#D3C2B5] hover:border-[#5C4033] bg-white rounded-lg px-2.5 py-1 text-[#5C4033] hover:bg-[#FDFBF7] whitespace-nowrap active:scale-95"
            >
              Draft email reply ✉️
            </button>
          </div>

          {/* Messages list container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FDFBF7]/50">
            {chatMessages.map((msg) => {
              const isAi = msg.sender === "ai";
              return (
                <div 
                  key={msg.id}
                  className={`flex flex-col ${isAi ? "items-start" : "items-end"}`}
                >
                  <div className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                    isAi 
                      ? "bg-[#EAE6DF] text-[#1A1A1A] border border-[#D3C2B5]/50" 
                      : "bg-[#5C4033] text-[#FDFBF7]"
                  }`}>
                    {msg.text}
                  </div>
                  <span className="font-mono text-[8px] text-gray-400 mt-1 px-1">
                    {msg.timestamp}
                  </span>
                </div>
              );
            })}
            
            {isChatSending && (
              <div className="flex items-center gap-2 text-gray-400 text-[10px] font-mono animate-pulse">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-300"></div>
                Analyzing standard clauses...
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Message input footer */}
          <div className="p-3 border-t border-[#EAE6DF] bg-white flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendChatMessage()}
              placeholder="Ask anything about termination, liability, payment details..."
              className="flex-1 text-xs bg-[#FDFBF7] border border-[#D3C2B5] rounded-xl px-4 py-3 outline-none focus:border-[#5C4033]"
            />
            <button
              onClick={handleSendChatMessage}
              disabled={!chatInput.trim() || isChatSending}
              className={`p-3 rounded-xl transition-all ${
                !chatInput.trim() || isChatSending
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-[#27AE60] hover:bg-[#219653] text-white shadow-sm"
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* MANDATORY DISCLAIMER */}
      <div className="bg-red-50/50 border border-red-200 p-4 rounded-2xl select-text relative overflow-visible">
        <p className="font-sans text-[11px] leading-relaxed text-red-900 text-center font-medium">
          ⚠️ <span className="font-bold">Disclaimer:</span> This is NOT binding legal advice. ClearContract uses automated Gemini AI pipelines to review, translate, and recommend clause adjustments. Always review summaries with an actual certified legal attorney before committing sign-offs.
        </p>
      </div>

    </div>
  );
}
