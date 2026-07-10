import React, { useState, useEffect } from "react";
import { 
  FileText, 
  Trash2, 
  BookOpen, 
  History,
  Scale,
  LogIn,
  LogOut,
  Cloud
} from "lucide-react";
import { User, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import Header from "./components/Header";
import UploadZone from "./components/UploadZone";
import ProcessingState from "./components/ProcessingState";
import AnalysisResults from "./components/AnalysisResults";
import { ContractAnalysis, SavedContract } from "./types";
import { loadPersistentState, savePersistentState, mergeContracts } from "./lib/persistence";
import { getFirebaseAuth, getGoogleAuthProvider, isFirebaseConfigured } from "./lib/firebase";

export default function App() {
  // Navigation Routing States
  const [activeTab, setActiveTab] = useState<"scan" | "vault" | "faqs">("scan");
  const [appState, setAppState] = useState<"upload" | "loading" | "results">("upload");

  // Active Analysis State
  const [activeAnalysis, setActiveAnalysis] = useState<ContractAnalysis | null>(null);
  const [contractText, setContractText] = useState("");
  const [contractTitle, setContractTitle] = useState("");
  const [contractType, setContractType] = useState("general");

  // Local Persistent Vault Storage
  const [savedContracts, setSavedContracts] = useState<SavedContract[]>([]);
  const [selectedHistoricalId, setSelectedHistoricalId] = useState<string | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const firebaseAuth = getFirebaseAuth();

  // Load vaults from local storage plus optional Firebase cache on mount
  useEffect(() => {
    let cancelled = false;

    const bootstrapState = async () => {
      const persistentState = await loadPersistentState(firebaseUser?.uid);
      if (cancelled) return;

      setSavedContracts(persistentState.savedContracts);
    };

    void bootstrapState();

    return () => {
      cancelled = true;
    };
  }, [firebaseUser?.uid]);

  useEffect(() => {
    if (!firebaseAuth) {
      setAuthReady(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, [firebaseAuth]);

  // Save vault state changes locally and to Firebase when configured
  const savePersistentVault = (vault: SavedContract[]) => {
    setSavedContracts(vault);
    void savePersistentState({ savedContracts: vault, isPro: false }, firebaseUser?.uid);
  };

  const handleFirebaseSignIn = async () => {
    if (!firebaseAuth || !isFirebaseConfigured()) {
      alert("Firebase is not configured yet. Add the VITE_FIREBASE_* values first.");
      return;
    }

    try {
      await signInWithPopup(firebaseAuth, getGoogleAuthProvider());
    } catch (error: any) {
      console.error("Firebase sign-in failed:", error);
      alert(error?.message || "Sign-in failed.");
    }
  };

  const handleFirebaseSignOut = async () => {
    if (!firebaseAuth) return;

    try {
      await signOut(firebaseAuth);
    } catch (error: any) {
      console.error("Firebase sign-out failed:", error);
      alert(error?.message || "Sign-out failed.");
    }
  };

  // Analyze Action Trigger
  const handleAnalyzeContract = async (config: { 
    text: string; 
    type: string; 
    fileName: string; 
    isDemoTemplate: boolean 
  }) => {
    setAppState("loading");
    setContractText(config.text);
    setContractTitle(config.fileName || "Draft_Receipt.txt");
    setContractType(config.type || "general");
    setSelectedHistoricalId(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: config.text,
          type: config.type,
          fileName: config.fileName,
          isDemoTemplate: config.isDemoTemplate
        })
      });

      const resData = await response.json();
      if (resData.success && resData.data) {
        setActiveAnalysis(resData.data);
        setAppState("results");
        
        // Auto save to history for maximum prototype experience
        const holdsAuto = savedContracts.some(v => v.title === config.fileName);
        if (!holdsAuto) {
          const autoVaultItem: SavedContract = {
            id: Math.random().toString(),
            title: config.fileName,
            originalFileName: config.fileName,
            originalText: config.text,
            type: config.type as any,
            createdAt: new Date().toLocaleDateString("en-NG", {
              year: "numeric",
              month: "short",
              day: "numeric"
            }),
            analysis: resData.data
          };
          const updated = mergeContracts([autoVaultItem], savedContracts);
          savePersistentVault(updated);
        }
      } else {
        throw new Error(resData.error || "Draft analysis failed to render");
      }
    } catch (error: any) {
      console.error("Analysis Error:", error);
      alert(`Connection Error: ${error?.message || "Failed to contact analysis server."}`);
      setAppState("upload");
    }
  };

  // Manual Trigger to save/remove from vaulted list
  const handleToggleSaveContract = () => {
    if (!activeAnalysis) return;

    const existingId = selectedHistoricalId || savedContracts.find(v => v.title === contractTitle)?.id;
    if (existingId) {
      // Remove it from vault list
      const filtered = savedContracts.filter(v => v.id !== existingId);
      savePersistentVault(filtered);
      setSelectedHistoricalId(null);
    } else {
      // Create new vault entry
      const newSavedItem: SavedContract = {
        id: Math.random().toString(),
        title: contractTitle,
        originalFileName: contractTitle,
        originalText: contractText,
        type: contractType as any,
        createdAt: new Date().toLocaleDateString("en-NG", {
          year: "numeric",
          month: "short",
          day: "numeric"
        }),
        analysis: activeAnalysis
      };
      const updated = mergeContracts([newSavedItem], savedContracts);
      savePersistentVault(updated);
      setSelectedHistoricalId(newSavedItem.id);
    }
  };

  const handleSelectHistoricalContract = (sc: SavedContract) => {
    setActiveAnalysis(sc.analysis);
    setContractText(sc.originalText);
    setContractTitle(sc.title);
    setContractType(sc.type);
    setSelectedHistoricalId(sc.id);
    setActiveTab("scan");
    setAppState("results");
  };

  const handleDeleteHistoricalContract = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = savedContracts.filter(c => c.id !== id);
    savePersistentVault(filtered);
    if (selectedHistoricalId === id) {
      setSelectedHistoricalId(null);
      setActiveAnalysis(null);
      setAppState("upload");
    }
  };

  const isActiveSaved = !!(selectedHistoricalId || savedContracts.some(v => v.title === contractTitle));

  return (
    <div className="min-h-screen font-sans parchment-paper text-[#2C2C2C] flex flex-col justify-between pb-16 relative">
      
      {/* Top Level visual brand header */}
      <div className="shrink-0">
        <Header 
          subtitle="Simple AI Legalese Translator" 
          onNavigateHome={() => {
            setAppState("upload");
            setActiveAnalysis(null);
            setContractText("");
            setActiveTab("scan");
          }}
        />
      </div>

      <div className="mx-4 md:mx-auto max-w-2xl mb-4 bg-white/80 backdrop-blur-sm border border-[#EAE6DF] rounded-2xl px-4 py-3 flex items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2 text-xs text-[#5C4033] min-w-0">
          <Cloud className="w-4 h-4 shrink-0" />
          <div className="min-w-0">
            <div className="font-semibold text-[#1A1A1A]">{firebaseUser ? `Signed in as ${firebaseUser.email || firebaseUser.displayName || "Firebase user"}` : "Cloud sync is local-only right now"}</div>
            <div className="text-[10px] text-[#B6A293] truncate">
              {authReady
                ? (firebaseUser ? "Firestore vault sync is active." : "Sign in to sync vault entries to Firestore.")
                : "Checking Firebase auth state..."}
            </div>
          </div>
        </div>

        {firebaseUser ? (
          <button
            onClick={handleFirebaseSignOut}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#D3C2B5] bg-[#FDFBF7] px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#5C4033] hover:border-[#5C4033]"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        ) : (
          <button
            onClick={handleFirebaseSignIn}
            disabled={!authReady}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#27AE60] px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-white hover:bg-[#219653] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogIn className="w-3.5 h-3.5" />
            Sign in with Google
          </button>
        )}
      </div>

      {/* Primary Display Screen Content Router */}
      <main className="flex-1 w-full flex flex-col justify-start">
        {activeTab === "scan" && (
          <>
            {appState === "upload" && (
              <UploadZone 
                onAnalyze={handleAnalyzeContract} 
                isProcessing={false} 
              />
            )}

            {appState === "loading" && (
              <ProcessingState />
            )}

            {appState === "results" && activeAnalysis && (
              <AnalysisResults
                analysis={activeAnalysis}
                contractText={contractText}
                contractTitle={contractTitle}
                contractType={contractType}
                onGoBack={() => {
                  setAppState("upload");
                  setActiveAnalysis(null);
                }}
                onSaveContract={handleToggleSaveContract}
                isSaved={isActiveSaved}
              />
            )}
          </>
        )}

        {/* VAULTS: HISTORY VIEW */}
        {activeTab === "vault" && (
          <div className="w-full max-w-2xl mx-auto px-4 pb-12 animate-fade-in space-y-6">
            <div className="space-y-1">
              <h2 className="font-serif font-extrabold text-xl text-[#1A1A1A]">
                Your Saved Contract Vaults
              </h2>
              <p className="text-xs text-[#2C2C2C]/70">
                Review previous translations, contract analyses, or access Coach history.
              </p>
            </div>

            {savedContracts.length === 0 ? (
              <div className="bg-white/80 border border-[#D3C2B5] rounded-3xl p-12 text-center space-y-4">
                <FileText className="w-12 h-12 text-[#B6A293] mx-auto animate-pulse" />
                <div className="space-y-1">
                  <h3 className="font-serif font-bold text-[#1A1A1A] text-sm">No Saved drafts found</h3>
                  <p className="text-xs text-[#2C2C2C]/60 max-w-xs mx-auto text-center">
                    Any contracts you analyze will automatically map here. Upload a file to begin.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("scan")}
                  className="px-4 py-2.5 bg-[#27AE60] hover:bg-[#219653] text-[#FDFBF7] text-xs font-semibold rounded-lg shadow uppercase tracking-wider"
                >
                  Create first review
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {savedContracts.map((sc) => (
                  <div
                    key={sc.id}
                    onClick={() => handleSelectHistoricalContract(sc)}
                    className="group bg-white hover:bg-[#FDFBF7] border border-[#D3C2B5] hover:border-[#5C4033] rounded-2xl p-4 flex justify-between items-center cursor-pointer transition-all duration-200 shadow-sm"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="p-3 bg-[#F4F1EA] group-hover:bg-[#EAE6DF] text-[#5C4033] rounded-xl transition-colors shrink-0">
                        <Scale className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-serif font-bold text-xs md:text-sm text-[#1A1A1A] group-hover:text-[#5C4033] transition-colors leading-tight line-clamp-1">
                          {sc.title}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-[#B6A293] font-mono capitalize">
                          <span>{sc.type}</span>
                          <span>•</span>
                          <span>Created {sc.createdAt}</span>
                          <span>•</span>
                          <span className="text-red-500 font-bold">Risk {sc.analysis.riskScore}/10</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-[#27AE60] opacity-0 group-hover:opacity-100 transition-opacity">
                        View Report →
                      </span>
                      <button
                        onClick={(e) => handleDeleteHistoricalContract(sc.id, e)}
                        className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                        title="Delete from local vault history"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* FAQS TAB OUTLINE */}
        {activeTab === "faqs" && (
          <div className="w-full max-w-2xl mx-auto px-4 pb-12 animate-fade-in space-y-6">
            <div className="space-y-1">
              <h2 className="font-serif font-extrabold text-xl text-[#1A1A1A]">
                Common Legal Scrutiny FAQs
              </h2>
              <p className="text-xs text-[#2C2C2C]/70">
                Understand basic contract standards so you never sign unsafe asymmetric liabilities.
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-[#D3C2B5] p-5 space-y-2 shadow-sm">
                <h3 className="font-serif font-bold text-[#1A1A1A] text-sm">
                  Q: What are asymmetric "Unilateral Revisions"?
                </h3>
                <p className="text-xs text-[#2C2C2C]/80 leading-relaxed">
                  These are clauses giving one partner (such as a landlord/client) the absolute rights to unilaterally adjust payment durations, operational limits, or access terms under single notify metrics, without you being able to terminate or object. It leaves you legally bound while they enjoy total freedom. ClearContract immediately alerts you to these with a High Severity Red Flag.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-[#D3C2B5] p-5 space-y-2 shadow-sm">
                <h3 className="font-serif font-bold text-[#1A1A1A] text-sm">
                  Q: Why are "Work-for-Hire" copyrights hazardous for artists?
                </h3>
                <p className="text-xs text-[#2C2C2C]/80 leading-relaxed">
                  Under strict Work-for-Hire legal models, the hiring agency legally inherits copyright titles Immediately Upon Creation. If payment is delayed, canceled, or disputed, you have already lost intellectual property leverage. A protective contract forces copyright to clear ONLY after all final invoice balances are proved to have completely settled in cash.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-[#D3C2B5] p-5 space-y-2 shadow-sm">
                <h3 className="font-serif font-bold text-[#1A1A1A] text-sm">
                  Q: Can AI replace standard physical retainers?
                </h3>
                <p className="text-xs text-[#2C2C2C]/80 leading-relaxed">
                  No. ClearContract acts as an automated triage tool. It parses complex verbiage into simplified cognitive terms so you have rapid negotiations insights. For high-value mergers or high-liability leases, always consult a qualified lawyer.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modern bottom tab micro-navigation bar */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-[#D3C2B5] py-2 px-4 shadow-xl z-20 select-none shrink-0 flex justify-around max-w-lg mx-auto rounded-t-3xl">
        <button
          onClick={() => {
            setActiveTab("scan");
            setAppState("upload");
            setActiveAnalysis(null);
          }}
          className={`flex flex-col items-center justify-center p-2.5 rounded-xl transition-all duration-200 ${
            activeTab === "scan"
              ? "text-[#27AE60] font-bold"
              : "text-[#B6A293] hover:text-[#5C4033]"
          }`}
        >
          <Scale className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] uppercase font-mono tracking-wider">Scanner</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("vault");
          }}
          className={`flex flex-col items-center justify-center p-2.5 rounded-xl transition-all duration-200 ${
            activeTab === "vault"
              ? "text-[#27AE60] font-bold"
              : "text-[#B6A293] hover:text-[#5C4033]"
          }`}
        >
          <div className="relative">
            <History className="w-5 h-5 mb-0.5" />
            {savedContracts.length > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-emerald-500 text-white font-serif font-bold text-[8px] px-1.5 py-0.5 rounded-full">
                {savedContracts.length}
              </span>
            )}
          </div>
          <span className="text-[10px] uppercase font-mono tracking-wider">Vaults</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("faqs");
          }}
          className={`flex flex-col items-center justify-center p-2.5 rounded-xl transition-all duration-200 ${
            activeTab === "faqs"
              ? "text-[#27AE60] font-bold"
              : "text-[#B6A293] hover:text-[#5C4033]"
          }`}
        >
          <BookOpen className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] uppercase font-mono tracking-wider">Help</span>
        </button>
      </footer>

    </div>
  );
}
