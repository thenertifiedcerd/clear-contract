import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HMR_PORT = Number(process.env.VITE_HMR_PORT || 24679);
const OPENROUTER_DEFAULT_MODEL = "google/gemma-4-26b-a4b-it:free";
const EXPLABS_DEFAULT_MODEL = "gpt-6-astra";

// Set up larger limits to accept photo uploads seamlessly
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

// Pre-packaged high-fidelity analysis reports for immediate, zero-friction client demo testing
const TEMPLATE_REPORTS: Record<string, any> = {
  rental: {
    riskScore: 7,
    riskLabel: "MODERATE TO HIGH RISK",
    plainEnglishSummary: "This is a standard room rental lease but with several heavily asymmetric clauses that strongly favor the Landlord. Security deposit return terms are highly restrictive, and the landlord grants themselves unbounded entry permissions with zero notice. There is also an automatic rent escalation clause of 15% after 6 months.",
    keyObligations: [
      "Tenant must pay monthly rent strictly by the 1st of each month (with high late fees).",
      "Tenant is fully responsible for all minor maintenance under ₦50,000.",
      "Landlord may show the property to prospective tenants at any time.",
      "Tenant must provide 60 days advance notice before termination."
    ],
    redFlags: [
      {
        clauseTitle: "Unlimited Entry Rights",
        originalClause: "Landlord reserves the unrestricted right to enter the leased room and premises at any hour, with or without prior verbal or written notification to Tenant, for arbitrary inspections, repair purposes, or to demonstrate the premises to prospective renters.",
        riskReason: "Completely violates your legal right to quiet enjoyment and privacy. Standard rental laws dictate at least 24 hours written notice for any entry, except in extreme emergencies.",
        clearContractSuggestion: "Landlord shall provide Tenant with at least 24 hours advance written notice of intention to enter, and such entry must conform to reasonable daytime working hours (9 AM - 6 PM), except in cases of immediate life-threatening emergency.",
        severity: 8
      },
      {
        clauseTitle: "Non-Refundable Deposit Retainment",
        originalClause: "The security deposit of ₦150,000 shall be retained in full by the Landlord if the Tenant terminates this agreement prior to the 12-month lease completion, notwithstanding any proper notices provided, and shall also be withheld if professional wall detailing is required upon move-out.",
        riskReason: "This is an unfair penalty. If you give proper notice (60 days), you shouldn't forfeit your deposit. Furthermore, 'professional detailing' is code for shifting ordinary wear-and-tear costs to the renter.",
        clearContractSuggestion: "The security deposit shall be refunded in full within 14 days of lease termination, minus documented damages exceeding ordinary wear and tear, provided the tenant has supplied the required 60-day written notice.",
        severity: 7
      },
      {
        clauseTitle: "Unilateral Rent Escalation",
        originalClause: "Landlord maintains the absolute right to adjust and increase the monthly rental rate by up to 15% at any point after the first six (6) months of tenancy, with simple 7 days text notification.",
        riskReason: "A fixed-term lease is supposed to lock in rent for the entire duration. This clause allows the landlord to arbitrarily raise rent under threat of eviction.",
        clearContractSuggestion: "The monthly rental rate of ₦120,000 shall remain fixed and immutable for the duration of the initial 12-month lease agreement.",
        severity: 9
      }
    ],
    simplifiedTerms: [
      {
        topic: "Security Deposit",
        legaleseExplanation: "Tenant covenants to deposit with Landlord the sum of ₦150,000, to be held in secure escrow, which is unilaterally forfeitable in the event of default, material covenant breach, or early lease termination actions.",
        simplifiedExplanation: "You pay a deposit. If you leave early, or break rules, they can keep it. We improved it so they only keep it for real, documented damage."
      },
      {
        topic: "Subletting Restraints",
        legaleseExplanation: "Tenant is strictly prohibited from carrying out any assignment, subletting, partitioning, or licensing of the rooms or properties to any relative or third party whatsoever without initial written consent from Landlord.",
        simplifiedExplanation: "You cannot sublet or let anyone else live/rent there without the landlord's explicit written approval."
      },
      {
        topic: "Late Payment Penalties",
        legaleseExplanation: "Failing to pay the stipulated rental amount by 11:59PM on the first day of the calendar month triggers an instantaneous administrative fee of ₦5,000 per daily block of delay.",
        simplifiedExplanation: "If rent is even one day late, the landlord charges you an extra late fee of ₦5,000 every single day."
      }
    ]
  },
  freelancer: {
    riskScore: 4,
    riskLabel: "MILD CAUTION",
    plainEnglishSummary: "A standard graphic/software design freelance contract. It secures intellectual property ownership, but holds a sneaky 'Work-for-Hire' clause that strips you of your preliminary concept files without payment safety. It also sets payment milestones with long net-45 waiting periods after sign-off.",
    keyObligations: [
      "Freelancer must deliver designs in Adobe Illustrator and Figma formats.",
      "Client must review and sign off on deliverables within 5 working days.",
      "Freelancer represents that all artwork is entirely original and non-infringing."
    ],
    redFlags: [
      {
        clauseTitle: "IP Transfer Before Payment",
        originalClause: "Freelancer hereby irrevocably assigns, sells, and transfers all copyrights, patents, design files, and title throughout the world in the deliverables to the Client immediately upon creation, irrespective of invoice clearing status.",
        riskReason: "If they own the copyright 'immediately upon creation', they can technically take your work, fire you or run away, and never pay you. You have zero leverage.",
        clearContractSuggestion: "All copyrights and intellectual property rights in the deliverables shall remain with the Freelancer and transfer entirely to the Client ONLY upon full visual clearing and receipt of final undisputed payment.",
        severity: 8
      },
      {
        clauseTitle: "Unbounded Revision Demands",
        originalClause: "Freelancer agrees to incorporate all revisions, modifications, and aesthetic structural redesigns requested by Client until deliverables are completely satisfactory to Client, without extra fees.",
        riskReason: "This opens you up to 'scope creep', where you are stuck executing endless changes for months because the contract doesn't limit the number of free revision rounds.",
        clearContractSuggestion: "The design fee includes up to three (3) iterative rounds of revision. All further adjustment requests shall be billed separately at Freelancer's hourly rate of ₦15,000/hour.",
        severity: 5
      }
    ],
    simplifiedTerms: [
      {
        topic: "Payment Timelines",
        legaleseExplanation: "Client shall make payment to Freelancer within forty-five (45) calendar days following receipt of final invoice submission and comprehensive deliverable delivery.",
        simplifiedExplanation: "You will have to wait a long 45 days after submitting your final designs before they are legally required to pay you."
      },
      {
        topic: "Warranty of Originality",
        legaleseExplanation: "Freelancer warrants and represents that all deliverables are entirely original, do not infringe upon any third-party proprietary rights, and agrees to indemnify Client against all copyright lawsuits.",
        simplifiedExplanation: "You promise your work is original. If someone sues the client claiming you copied them, you have to pay the client's legal fees."
      }
    ]
  },
  gym: {
    riskScore: 8,
    riskLabel: "HIGH RISK / DECEPTIVE",
    plainEnglishSummary: "A highly aggressive personal membership agreement. It locks you in for a mandatory 24-month term with near-impossible termination criteria, enforces standard automatic monthly credit card billing, and attempts to strip you of all rights to sue for physical injuries—even if caused by the facility's negligent equipment maintenance.",
    keyObligations: [
      "Member must pay a non-negotiable monthly fee of ₦25,000 via direct automatic debit.",
      "Member must abide by all updated rules, uniform codes, and operating hours.",
      "Member must notify the gym at least 90 days in writing before contract expiration if they do not wish of automatic renewal."
    ],
    redFlags: [
      {
        clauseTitle: "Total Negligence Disclaimer",
        originalClause: "Member hereby releases, waives, and forever discharges the Gym, its owners, and employees from any and all claims, liabilities, or injuries arising from physical exercise, training, or equipment failure, even if arising directly from active/passive negligence or facility structural malfunction.",
        riskReason: "While you assume basic workout risks, a legal waiver shouldn't excuse the gym from negligence, like poorly maintained heavy weights or broken machinery collapsing on you.",
        clearContractSuggestion: "Member agrees to wave liability for injuries standard to general physical exercise, except where such damage is a direct result of gross negligence or faulty equipment maintenance on the part of the Gym.",
        severity: 9
      },
      {
        clauseTitle: "24-Month Binding Lockdown",
        originalClause: "This Agreement constitutes an unbreakable, legally binding agreement for a term of twenty-four (24) months. Member may not suspend or cancel payments under any conditions, including change of address, health complications, or relocation.",
        riskReason: "Extremely lock-in state. If you get injured, move to an apartment far away, or lose your job, they will legally keep billing your credit card and can sue or report you to credit bureaus.",
        clearContractSuggestion: "Member may terminate membership with 30 days written notice due to verified medical disability, job loss, or relocation beyond 10km from the gym facility, with zero early termination penalties.",
        severity: 8
      }
    ],
    simplifiedTerms: [
      {
        topic: "Automatic Renewals",
        legaleseExplanation: "Upon physical expiration of the 24-month initial period, this contract shall automatically, iteratively roll over into consecutive 12-month extension terms unless cancelled via registered post strictly 90 days in advance.",
        simplifiedExplanation: "The contract automatically renews forever unless you send a formal letter exactly 3 months before it ends."
      },
      {
        topic: "Arbitrary Hours Revision",
        legaleseExplanation: "Management reserves the exclusive right to alter operational facility timings, shut down selective zones for repair, or terminate trainer services without price reductions or rebates.",
        simplifiedExplanation: "They can close pools, change locker room access hours, or cut schedules, but you still pay the full subscription fee."
      }
    ]
  }
};

function hasRealValue(value?: string) {
  return Boolean(value && !value.startsWith("MY_") && !value.startsWith("REPLACE_"));
}

interface AiProviderConfig {
  apiKey: string;
  endpoint: string;
  model: string;
  providerName: "openrouter" | "experiential";
}

function getConfiguredApiKey() {
  const apiKey = process.env.EXPLABS_API_KEY || process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;
  if (!hasRealValue(apiKey)) {
    return null;
  }
  return apiKey || null;
}

function getAiProviderConfig(): AiProviderConfig | null {
  const apiKey = getConfiguredApiKey();
  if (!apiKey) {
    return null;
  }

  if (apiKey.startsWith("xpl_")) {
    return {
      apiKey,
      endpoint: "https://api.experientiallabs.ai/v1/chat/completions",
      model: process.env.EXPLABS_MODEL || process.env.OPENROUTER_MODEL || EXPLABS_DEFAULT_MODEL,
      providerName: "experiential",
    };
  }

  return {
    apiKey,
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    model: process.env.OPENROUTER_MODEL || OPENROUTER_DEFAULT_MODEL,
    providerName: "openrouter",
  };
}

function getAiHeaders(apiKey: string) {
  const headers: Record<string, string> = {
    Authorization: "Bearer " + apiKey,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
    "X-Title": "ClearContract",
  };

  return headers;
}

function stripCodeFences(text: string) {
  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function normalizeAnalysisText(text: string, maxCharacters = 18000) {
  const compactText = (text || "").replace(/\s+/g, " ").trim();
  if (compactText.length <= maxCharacters) {
    return { text: compactText, wasTrimmed: false };
  }

  const headLength = Math.floor(maxCharacters * 0.7);
  const tailLength = maxCharacters - headLength;
  const trimmedText = `${compactText.slice(0, headLength)}\n\n[...content omitted for brevity...]\n\n${compactText.slice(-tailLength)}`;

  return { text: trimmedText, wasTrimmed: true };
}

function extractJsonObject(text: string) {
  const cleaned = stripCodeFences(text);
  try {
    return JSON.parse(cleaned);
  } catch {
    const startIndex = cleaned.indexOf("{");
    const endIndex = cleaned.lastIndexOf("}");
    if (startIndex >= 0 && endIndex > startIndex) {
      return JSON.parse(cleaned.slice(startIndex, endIndex + 1));
    }
    throw new Error("Model response did not contain valid JSON.");
  }
}

async function callOpenRouter(messages: Array<{ role: string; content: string }>) {
  const providerConfig = getAiProviderConfig();
  if (!providerConfig) {
    throw new Error("No AI provider API key is configured.");
  }

  const response = await fetch(providerConfig.endpoint, {
    method: "POST",
    headers: getAiHeaders(providerConfig.apiKey),
    body: JSON.stringify({
      model: providerConfig.model,
      messages,
      stream: false,
      temperature: 0.2,
    }),
  });

  const rawText = await response.text();
  if (!response.ok) {
    throw new Error(`${providerConfig.providerName} request failed (${response.status}): ${rawText}`);
  }

  const payload = JSON.parse(rawText) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(`${providerConfig.providerName} response did not include assistant content.`);
  }

  return content;
}

async function streamOpenRouter(messages: Array<{ role: string; content: string }>) {
  const providerConfig = getAiProviderConfig();
  if (!providerConfig) {
    throw new Error("No AI provider API key is configured.");
  }

  const response = await fetch(providerConfig.endpoint, {
    method: "POST",
    headers: getAiHeaders(providerConfig.apiKey),
    body: JSON.stringify({
      model: providerConfig.model,
      messages,
      stream: true,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${providerConfig.providerName} request failed (${response.status}): ${errorText}`);
  }

  if (!response.body) {
    throw new Error("OpenRouter stream body was empty.");
  }

  return response.body;
}

// -------------------- API ROUTES --------------------

// Endpoint: Analyze Contract
app.post("/api/analyze", async (req, res) => {
  const { text, type, fileName, isDemoTemplate } = req.body;

  console.log(`Received analysis request for ${fileName || "unnamed document"} (Type: ${type || "Unspecified"})`);

  // If isDemoTemplate is true and matches one of our clean pre-baked items, serve it instantly
  if (isDemoTemplate && TEMPLATE_REPORTS[type]) {
    console.log(`Serving pre-baked template report for: ${type}`);
    return res.json({
      success: true,
      data: TEMPLATE_REPORTS[type],
      isDemo: true,
      message: "Fetched custom high-fidelity template analysis!"
    });
  }

  // Check if we have a real Gemini client
  const aiProviderConfig = getAiProviderConfig();
  if (!aiProviderConfig) {
    console.log("No AI provider key available. Returning analysis error.");
    return res.status(503).json({
      success: false,
      error: "AI provider API key is not configured.",
      details: "Add a valid OPENROUTER_API_KEY (or GEMINI_API_KEY), or an xpl_ key via EXPLABS_API_KEY/OPENROUTER_API_KEY, to enable live analysis."
    });
  }

  // Perform actual OpenRouter API invocation
  try {
    const documentType = type || "General Contract";
    const normalizedText = normalizeAnalysisText(text || "");
    const systemInstruction = `You are ClearContract, an elite full-scale AI legal documents translator. Your absolute specialty is simplifying complex legalese into clear, eighth-grade level, highly readable legal translations for freelancers, renters, and SMEs.
Analyze the provided contract text or document prompt. You MUST output a clean JSON object and nothing else. Ensure all risk reasons are direct, protective of the signee, and clear on any unfair or asymmetric clauses.`;

    const prompt = `Please carefully translate and analyze this contract.
Document Type Focus: ${documentType}
Document Name Reference: ${fileName || "Unnamed Contract"}

Here is the contract text to analyze:
------------------------------------------
${normalizedText.text || "No text provided. Analyze standard contract clauses matching document type focus."}
------------------------------------------`;

    const finalPrompt = normalizedText.wasTrimmed
      ? `${prompt}\n\nNote: the uploaded text exceeded the model context limit, so it has been compacted while preserving the beginning and end of the document.`
      : prompt;

    const outputText = await callOpenRouter([
      { role: "system", content: systemInstruction },
      { role: "user", content: `${finalPrompt}\n\nReturn a JSON object with these keys only: riskScore, riskLabel, plainEnglishSummary, keyObligations, redFlags, simplifiedTerms.` },
    ]);

    if (!outputText) {
      throw new Error("Received empty text response from OpenRouter.");
    }

    const parsedData = extractJsonObject(outputText);
    return res.json({
      success: true,
      data: parsedData,
      isDemo: false
    });

  } catch (error: any) {
    console.error("OpenRouter analysis error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate AI contract breakdown.",
      details: error?.message || "unknown error"
    });
  }
});

// Endpoint: Q&A Chat about the analyzed contract
app.post("/api/chat", async (req, res) => {
  const { messages, contractContext } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid messages history array" });
  }

  // Get the most recent user prompt
  const userMessage = messages[messages.length - 1]?.text || "";

  console.log(`Received user query inside contract chat: "${userMessage.substring(0, 50)}..."`);

  const aiProviderConfig = getAiProviderConfig();
  if (!aiProviderConfig) {
    // Elegant fallback simulation chat
    setTimeout(() => {
      let replyText = "I’d be happy to check that for you! However, please configure your AI API key (OPENROUTER_API_KEY, GEMINI_API_KEY, or xpl_ via EXPLABS_API_KEY) so I can run live checks on your custom queries. Based on local safety heuristics, you should ensure payment terms require client check-out within 10 days.";
      
      const promptLower = userMessage.toLowerCase();
      if (promptLower.includes("terminate") || promptLower.includes("cancel")) {
        replyText = "In this contract's default clauses, termination requires a written notice 30 to 60 days in advance. Canceling unilaterally without this timeline triggers deposit forfeiture. Make sure to negotiate a 'no-penalty mutual release' clause if possible.";
      } else if (promptLower.includes("payment") || promptLower.includes("milestone") || promptLower.includes("fee")) {
        replyText = "Look closely at the payment cycle: Client pays within 45 days after milestones are cleared. Try proposing a 50% upfront retainer and Net-15 timeline to shield your cash flow from month-long delays.";
      } else if (promptLower.includes("liability") || promptLower.includes("sue")) {
        replyText = "The contract attempts to limit client liability entirely to zero while leaving you open to massive intellectual property claims. You should balance this indemnity clause so it caps mutually at the paid amount of the project.";
      }

      return res.json({
        success: true,
        reply: replyText,
        isDemo: true
      });
    }, 1000);
    return;
  }

  try {
    // Construct rich context instructions incorporating the contract details
    const contractMeta = contractContext || {};
    const contextPrompt = `You are "ClearContract AI," acting as a friendly, expert legal translator and advisor.
The user is viewing a contract analysis with the following properties:
- Risk Score: ${contractMeta.riskScore || "N/A"}/10 (${contractMeta.riskLabel || ""})
- Plain English Summary: ${contractMeta.plainEnglishSummary || "No summary available."}

Here are the key Red Flags discovered:
${JSON.stringify(contractMeta.redFlags || [], null, 2)}

Provide a helpful, precise explanation directly answering the user's query about this contract. Maintain an encouraging and protective tone for renters/freelancers. Wrap any recommendations or suggestions in human-readable plain language. Keep the answer concise (2-4 paragraphs max). Do not output legal jargon unless you immediately explain it.
And remember: Add a soft verbal note reminding them this is not binding legal advice.`;

    const chatHistory = messages.map((m: any) => ({
      role: m.sender === "user" ? "user" : "model",
      parts: [{ text: m.text }]
    }));

    const responseText = await callOpenRouter([
      { role: "system", content: contextPrompt },
      { role: "user", content: `Here is the contract context:\n${JSON.stringify(contractMeta)}` },
      { role: "assistant", content: "Understood. I have fully digested this contract, its risk points, and simplified explanations. I am ready to help the user understand its implications and negotiate better terms." },
      ...chatHistory.slice(0, -1).map((message: any) => ({ role: message.role, content: message.parts[0]?.text || "" })),
      { role: "user", content: userMessage }
    ]);

    return res.json({
      success: true,
      reply: responseText || "I was unable to assess that query correctly. May I help clarify any other specific clause?",
      isDemo: false
    });

  } catch (error: any) {
    console.error("OpenRouter chat error:", error);
    res.status(500).json({
      success: false,
      error: "Error responding to your query.",
      details: error.message
    });
  }
});

app.post("/api/chat/stream", async (req, res) => {
  const { messages, contractContext } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid messages history array" });
  }

  const userMessage = messages[messages.length - 1]?.text || "";
  console.log(`Received streaming user query inside contract chat: "${userMessage.substring(0, 50)}..."`);

  const aiProviderConfig = getAiProviderConfig();
  if (!aiProviderConfig) {
    return res.status(503).json({
      success: false,
      error: "AI provider API key is not configured.",
      details: "Add a valid OPENROUTER_API_KEY (or GEMINI_API_KEY), or an xpl_ key via EXPLABS_API_KEY/OPENROUTER_API_KEY, to enable live streaming chat."
    });
  }

  try {
    const contractMeta = contractContext || {};
    const contextPrompt = `You are "ClearContract AI," acting as a friendly, expert legal translator and advisor.
The user is viewing a contract analysis with the following properties:
- Risk Score: ${contractMeta.riskScore || "N/A"}/10 (${contractMeta.riskLabel || ""})
- Plain English Summary: ${contractMeta.plainEnglishSummary || "No summary available."}

Here are the key Red Flags discovered:
${JSON.stringify(contractMeta.redFlags || [], null, 2)}

Provide a helpful, precise explanation directly answering the user's query about this contract. Maintain an encouraging and protective tone for renters/freelancers. Wrap any recommendations or suggestions in human-readable plain language. Keep the answer concise (2-4 paragraphs max). Do not output legal jargon unless you immediately explain it.
And remember: Add a soft verbal note reminding them this is not binding legal advice.`;

    const chatHistory = messages.map((message: any) => ({
      role: message.sender === "user" ? "user" : "assistant",
      content: message.text,
    }));

    const stream = await streamOpenRouter([
      { role: "system", content: contextPrompt },
      { role: "user", content: `Here is the contract context:\n${JSON.stringify(contractMeta)}` },
      { role: "assistant", content: "Understood. I have fully digested this contract, its risk points, and simplified explanations. I am ready to help the user understand its implications and negotiate better terms." },
      ...chatHistory.slice(0, -1),
      { role: "user", content: userMessage },
    ]);

    res.status(200);
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    const forwardToken = (token: string) => {
      if (token) {
        res.write(token);
      }
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() || "";

      for (const event of events) {
        const dataLines = event.split("\n").filter((line) => line.startsWith("data:"));
        const data = dataLines.map((line) => line.slice(5).trim()).join("\n");

        if (!data || data === "[DONE]") {
          continue;
        }

        try {
          const parsed = JSON.parse(data);
          const token = parsed?.choices?.[0]?.delta?.content;
          if (token) {
            forwardToken(token);
          }
        } catch (parseError) {
          console.warn("Unable to parse OpenRouter stream chunk:", parseError);
        }
      }
    }

    const trailing = buffer.trim();
    if (trailing.startsWith("data:")) {
      const data = trailing.slice(5).trim();
      if (data && data !== "[DONE]") {
        try {
          const parsed = JSON.parse(data);
          const token = parsed?.choices?.[0]?.delta?.content;
          if (token) {
            forwardToken(token);
          }
        } catch (parseError) {
          console.warn("Unable to parse trailing OpenRouter stream chunk:", parseError);
        }
      }
    }

    res.end();
  } catch (error: any) {
    console.error("OpenRouter streaming chat error:", error);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        error: "Error responding to your query.",
        details: error?.message || "unknown error"
      });
    }
    res.end();
  }
});


// -------------------- VITE / STATIC ROUTING --------------------

async function start() {
  if (process.env.NODE_ENV !== "production") {
    // Dev environment: mount Vite dev server as middleware to enable quick preview updates
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          port: HMR_PORT,
        },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production environment: serve built files directly from /dist
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ClearContract Server booted successfully on http://0.0.0.0:${PORT}`);
  });
}

start();
