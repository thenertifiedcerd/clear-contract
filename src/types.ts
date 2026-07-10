export interface RedFlag {
  clauseTitle: string;
  originalClause: string;
  riskReason: string;
  clearContractSuggestion: string;
  severity: number; // 1 to 10
}

export interface SimplifiedTerm {
  topic: string;
  legaleseExplanation: string;
  simplifiedExplanation: string;
}

export interface ContractAnalysis {
  riskScore: number; // 1 to 10
  riskLabel: string; // e.g. "SAFE", "HIGH RISK"
  plainEnglishSummary: string;
  keyObligations: string[];
  redFlags: RedFlag[];
  simplifiedTerms: SimplifiedTerm[];
}

export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

export interface SavedContract {
  id: string;
  title: string;
  originalFileName: string;
  originalText: string;
  type: "rental" | "freelancer" | "gym" | "general";
  createdAt: string;
  analysis: ContractAnalysis;
}
