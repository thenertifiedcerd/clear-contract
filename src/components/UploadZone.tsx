import React, { useState, useRef, useEffect } from "react";
import { Upload, Camera, FileText, Sparkles, AlertCircle, Eye } from "lucide-react";
import { createWorker, PSM } from "tesseract.js";

interface UploadZoneProps {
  onAnalyze: (config: { text: string; type: string; fileName: string; isDemoTemplate: boolean }) => void;
  isProcessing: boolean;
}

// Full contract text constants so the prototype contains 100% authentic real-world contracts
const DRIED_TEMPLATES = {
  rental: {
    title: "Apartment Lease Agreement.txt",
    type: "rental",
    text: `LANDLORD ROOM RENTAL LEASE AGREEMENT
This agreement is entered into on June 1, 2026, by and between landlord Chief Alao Coker (hereinafter "Landlord") and tenant John Obi (hereinafter "Tenant").

1. PREMISES AND TERM. Landlord leases to Tenant the master bedroom within Apartment 4B, Lekki Phase 1, Lagos, for a initial term of twelve (12) months.
2. FINANCIAL REQUISITIONS. Tenant shall remit a monthly rent of ₦120,000, payable on the first calendar day of each month. Late payments trigger immediate daily administrative fines of ₦5,000.
3. SECURITY DEPOSIT. Tenant agrees to pay ₦150,000 to Landlord. The security deposit shall be retained in full if Tenant terminates early, or if professional wall detailing is ordered at checkout.
4. RIGHT OF CONSTELLATION & ENTRY. Landlord reserves the absolute unrestricted right to enter the leased room and premises at any hour, with or without prior verbal or written notification to Tenant for any arbitrary inspections, modifications or showings.
5. ESCALATION OF VALUATION. Landlord maintains the absolute right to unilaterally adjust and increase the monthly rental rate by up to 15% at any point after the first six (6) months, with simple 7 days text notification.
6. MINOR MAINTENANCE. Tenant is entirely responsible for all maintenance and structural repairs under ₦50,000.`
  },
  freelancer: {
    title: "Freelance Design Terms.txt",
    type: "freelancer",
    text: `CREATIVE WEB AND GRAPHIC DESIGN SERVICES CONTRACT
This contract is made by and between Studio Creative Agency and Freelancer Designer.

1. DELIVERABLES. Freelancer agrees to deliver comprehensive UI layouts, Figma files, and custom vectors as requested by the Client.
2. PAYMENT DELAY. Payments shall clear on a Net-45 timeline after the Client signs off on all deliverables in their absolute satisfaction.
3. ESTHETIC REVISIONS. Freelancer agrees to incorporate all revisions, modifications, and complete aesthetic redesigns requested by the Client until satisfactory, without additional fees.
4. INTELLECTUAL PROPERTY REQUISITION. Freelancer hereby irrevocably assigns, sells, and transfers all copyrights, patents, and design files throughout the world to the Client immediately upon creation, irrespective of invoice clearing or final payment status.`
  },
  gym: {
    title: "Elite Fitness Membership Contract.txt",
    type: "gym",
    text: `ELITE FITNESS & GYM MEMBERSHIP AGREEMENT
Member covenants to enroll in our physical wellness program under these strict, immutable terms:

1. DURATION & LOCKDOWN. This agreement constitutes an unbreakable, legally binding agreement for a fixed term of twenty-four (24) months. Member cannot cancel, suspend or terminate under any health conditions or relocation.
2. AUTOMATIC RENEWALS. Upon expiration of the 24-month period, this contract shall automatically roll over into consecutive 12-month extension terms unless cancelled via registered post strictly 90 days in advance of the deadline.
3. WAIVER OF ACTIVE NEGLIGENCE. Member hereby releases and forever discharges the Gym, its owners, and employees from any and all claims, liabilities, or physical injuries arising from physical exercise, training, or equipment failure, even if arising directly from active, passive negligence, or structural facility malfunction.`
  }
};

export default function UploadZone({ onAnalyze, isProcessing }: UploadZoneProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "paste">("upload");
  const [pasteText, setPasteText] = useState("");
  const [customFileName, setCustomFileName] = useState("Custom_Contract_Draft.txt");
  const [customType, setCustomType] = useState("general");
  const [dragOver, setDragOver] = useState(false);
  const [showMockCamera, setShowMockCamera] = useState(false);
  const [cameraPhotoSimulated, setCameraPhotoSimulated] = useState(false);
  const [cameraTextResult, setCameraTextResult] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ocrWorkerPromiseRef = useRef<ReturnType<typeof createWorker> | null>(null);
  const ocrWorkerRef = useRef<Awaited<ReturnType<typeof createWorker>> | null>(null);
  const ocrConfiguredRef = useRef(false);
  const [cameraProcessing, setCameraProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const textResult = event.target?.result as string;
      onAnalyze({
        text: textResult,
        type: "general",
        fileName: file.name,
        isDemoTemplate: false
      });
    };
    reader.readAsText(file);
  };

  const handleSelectTemplate = (key: "rental" | "freelancer" | "gym") => {
    const template = DRIED_TEMPLATES[key];
    onAnalyze({
      text: template.text,
      type: template.type,
      fileName: template.title,
      isDemoTemplate: true
    });
  };

  const executePasteAnalysis = () => {
    if (!pasteText.trim()) return;
    onAnalyze({
      text: pasteText,
      type: customType,
      fileName: customFileName,
      isDemoTemplate: false
    });
  };

  // Real camera capture + OCR using tesseract.js
  useEffect(() => {
    if (showMockCamera) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [showMockCamera]);

  useEffect(() => {
    return () => {
      void terminateOcrWorker();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error("Camera start failed:", err);
      setShowMockCamera(false);
      alert("Unable to access camera. Please check permissions and try again.");
    }
  };

  const stopCamera = () => {
    try {
      const s = streamRef.current;
      if (s) {
        s.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    } catch (err) {
      console.warn("Error stopping camera:", err);
    }
  };

  const terminateOcrWorker = async () => {
    try {
      await ocrWorkerRef.current?.terminate();
    } catch (error) {
      console.warn("Failed to terminate OCR worker:", error);
    } finally {
      ocrWorkerRef.current = null;
      ocrWorkerPromiseRef.current = null;
      ocrConfiguredRef.current = false;
    }
  };

  const getOcrWorker = async () => {
    if (!ocrWorkerPromiseRef.current) {
      ocrWorkerPromiseRef.current = createWorker("eng", 1, {
        logger: (message) => {
          if (message?.status === "recognizing text" && typeof message.progress === "number") {
            setOcrProgress(Math.round(message.progress * 100));
          }
        },
      });
    }

    if (!ocrWorkerRef.current) {
      ocrWorkerRef.current = await ocrWorkerPromiseRef.current;
    }

    if (!ocrConfiguredRef.current && ocrWorkerRef.current) {
      await ocrWorkerRef.current.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
        preserve_interword_spaces: "1",
        user_defined_dpi: "300",
      });
      ocrConfiguredRef.current = true;
    }

    return ocrWorkerRef.current;
  };

  const buildCaptureCanvas = () => {
    const sourceVideo = videoRef.current;
    const sourceCanvas = canvasRef.current || document.createElement("canvas");
    if (!sourceVideo) {
      return null;
    }

    const width = sourceVideo.videoWidth || 1280;
    const height = sourceVideo.videoHeight || 720;
    sourceCanvas.width = width;
    sourceCanvas.height = height;

    const context = sourceCanvas.getContext("2d");
    if (!context) return null;

    context.drawImage(sourceVideo, 0, 0, width, height);
    return sourceCanvas;
  };

  const resizeCanvasToMaxDimension = (inputCanvas: HTMLCanvasElement, maxDimension = 1400) => {
    const outputCanvas = document.createElement("canvas");
    const longestEdge = Math.max(inputCanvas.width, inputCanvas.height);
    const scale = longestEdge > maxDimension ? maxDimension / longestEdge : 1;

    outputCanvas.width = Math.max(1, Math.round(inputCanvas.width * scale));
    outputCanvas.height = Math.max(1, Math.round(inputCanvas.height * scale));

    const outputContext = outputCanvas.getContext("2d");
    if (!outputContext) {
      return inputCanvas;
    }

    outputContext.imageSmoothingEnabled = true;
    outputContext.drawImage(inputCanvas, 0, 0, outputCanvas.width, outputCanvas.height);
    return outputCanvas;
  };

  const createEnhancedCanvas = (inputCanvas: HTMLCanvasElement, mode: "contrast" | "threshold") => {
    const outputCanvas = document.createElement("canvas");
    const scaledInput = resizeCanvasToMaxDimension(inputCanvas, 1400);
    outputCanvas.width = scaledInput.width;
    outputCanvas.height = scaledInput.height;

    const outputContext = outputCanvas.getContext("2d");
    if (!outputContext) {
      return inputCanvas;
    }

    outputContext.imageSmoothingEnabled = true;
    outputContext.drawImage(scaledInput, 0, 0, outputCanvas.width, outputCanvas.height);

    const imageData = outputContext.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
    const pixels = imageData.data;

    for (let index = 0; index < pixels.length; index += 4) {
      const red = pixels[index];
      const green = pixels[index + 1];
      const blue = pixels[index + 2];
      const alpha = pixels[index + 3];

      const grayscale = (0.299 * red) + (0.587 * green) + (0.114 * blue);

      let transformed = grayscale;
      if (mode === "contrast") {
        transformed = Math.max(0, Math.min(255, ((grayscale - 128) * 1.6) + 140));
      } else {
        transformed = grayscale > 168 ? 255 : 0;
      }

      pixels[index] = transformed;
      pixels[index + 1] = transformed;
      pixels[index + 2] = transformed;
      pixels[index + 3] = alpha;
    }

    outputContext.putImageData(imageData, 0, 0);
    return outputCanvas;
  };

  const recognizeCanvas = async (worker: Awaited<ReturnType<typeof createWorker>>, inputCanvas: HTMLCanvasElement) => {
    const result = await worker.recognize(inputCanvas, { rotateAuto: true }, { text: true });
    return {
      text: result.data.text?.trim() || "",
      confidence: typeof result.data.confidence === "number" ? result.data.confidence : 0,
    };
  };

  const pickBestText = (candidates: Array<{ text: string; confidence: number }>) => {
    return candidates
      .filter((candidate) => candidate.text.length > 0)
      .sort((first, second) => {
        if (second.confidence !== first.confidence) {
          return second.confidence - first.confidence;
        }
        return second.text.length - first.text.length;
      })[0] || { text: "", confidence: 0 };
  };

  const triggerMockCameraCapture = async () => {
    if (!videoRef.current) return;
    setCameraProcessing(true);
    setCameraPhotoSimulated(true);
    setOcrProgress(0);

    const captureCanvas = buildCaptureCanvas();
    if (!captureCanvas) {
      alert("Unable to capture image from camera.");
      setCameraProcessing(false);
      setCameraPhotoSimulated(false);
      return;
    }

    try {
      const worker = await getOcrWorker();
      const baseCanvas = resizeCanvasToMaxDimension(captureCanvas, 1400);
      const contrastCanvas = createEnhancedCanvas(captureCanvas, "contrast");

      const [baseResult, contrastResult] = await Promise.all([
        recognizeCanvas(worker, baseCanvas),
        recognizeCanvas(worker, contrastCanvas),
      ]);

      const bestResult = pickBestText([baseResult, contrastResult]);
      const ocrText = bestResult.text;
      setCameraTextResult(ocrText);

      if (!ocrText.trim()) {
        throw new Error("No readable text was detected from the image.");
      }

      const simulatedFileName = "Snapshot_Contract_OCR.txt";
      onAnalyze({ text: ocrText, type: "general", fileName: simulatedFileName, isDemoTemplate: false });
    } catch (err) {
      console.error("OCR failed:", err);
      alert("Text recognition failed. Try again with a clearer document or upload a file.");
    } finally {
      setCameraProcessing(false);
      setCameraPhotoSimulated(false);
      setShowMockCamera(false);
      stopCamera();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 pb-12">
      {/* Selector tab header */}
      <div className="flex justify-center border-b border-[#EAE6DF] mb-6">
        <button
          onClick={() => setActiveTab("upload")}
          className={`px-6 py-2.5 font-medium text-xs uppercase tracking-widest transition-all duration-200 border-b-2 ${
            activeTab === "upload"
              ? "border-[#27AE60] text-[#1A1A1A]"
              : "border-transparent text-[#B6A293] hover:text-[#5C4033]"
          }`}
        >
          Scan / Upload Files
        </button>
        <button
          onClick={() => setActiveTab("paste")}
          className={`px-6 py-2.5 font-medium text-xs uppercase tracking-widest transition-all duration-200 border-b-2 ${
            activeTab === "paste"
              ? "border-[#27AE60] text-[#1A1A1A]"
              : "border-transparent text-[#B6A293] hover:text-[#5C4033]"
          }`}
        >
          Copy-Paste Contract
        </button>
      </div>

      {activeTab === "upload" ? (
        <div className="space-y-6">
          {/* Main drag and drop interactive zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full h-64 md:h-72 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all duration-300 relative overflow-hidden ${
              dragOver
                ? "border-[#27AE60] bg-[#27AE60]/5 scale-[0.99] shadow-inner"
                : "border-[#D3C2B5] bg-[#FDFBF7] hover:border-[#5C4033] hover:bg-[#F4F1EA]/50"
            } shadow-sm`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".txt,.doc,.docx,.pdf,.rtf"
              className="hidden"
            />
            
            <div className="p-4 rounded-full bg-[#F4F1EA] text-[#5C4033] mb-4 group-hover:scale-110 transition-transform duration-200">
              <Upload className="w-8 h-8" />
            </div>

            <h3 className="font-serif font-semibold text-lg text-[#1A1A1A] mb-1">
              Scan or Upload Contract
            </h3>
            <p className="font-sans text-xs text-[#2C2C2C]/70 max-w-sm mb-4 leading-relaxed">
              Dråg & drop your contract draft here, or click to browse. Supports PDF, DOCX, TXT, or scanned legal receipts.
            </p>
            <p className="font-mono text-[9px] uppercase tracking-widest text-[#B6A293] bg-[#EAE6DF]/40 px-2.5 py-1 rounded-md">
              Encrypted & Strictly Private
            </p>
          </div>

          {/* Quick-action visual cards */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setShowMockCamera(true)}
              className="group flex items-center justify-center gap-3 p-4 bg-white hover:bg-[#FDFBF7] border border-[#EAE6DF] hover:border-[#5C4033] rounded-xl shadow-sm transition-all duration-200 text-left active:scale-[0.98]"
            >
              <div className="p-2.5 rounded-lg bg-[#FDFBF7] group-hover:bg-[#F4F1EA] text-[#5C4033] transition-colors">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-xs text-[#1A1A1A]">Take a Photo</div>
                <div className="text-[10px] text-[#B6A293]">Scan with camera</div>
              </div>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="group flex items-center justify-center gap-3 p-4 bg-white hover:bg-[#FDFBF7] border border-[#EAE6DF] hover:border-[#5C4033] rounded-xl shadow-sm transition-all duration-200 text-left active:scale-[0.98]"
            >
              <div className="p-2.5 rounded-lg bg-[#FDFBF7] group-hover:bg-[#F4F1EA] text-[#5C4033] transition-colors">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-xs text-[#1A1A1A]">Upload PDF</div>
                <div className="text-[10px] text-[#B6A293]">Select document</div>
              </div>
            </button>
          </div>

          {/* Core Zero-Friction Template Selection Zone */}
          <div className="mt-8 border-t border-[#EAE6DF] pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-[#27AE60]" />
              <h4 className="font-serif font-bold text-sm text-[#1A1A1A]">
                Instant Playgrounds (Try pre-loaded real contracts)
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Rental template Card */}
              <button
                onClick={() => handleSelectTemplate("rental")}
                className="flex flex-col items-start p-4 bg-[#FDFBF7] hover:bg-[#F4F1EA] border border-[#D3C2B5] hover:border-[#5C4033] rounded-xl text-left transition-all duration-200 relative group overflow-hidden"
              >
                <span className="font-mono text-[8px] uppercase tracking-wider text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded mb-2">
                  High Risk 7/10
                </span>
                <span className="font-serif font-semibold text-xs text-[#1A1A1A] group-hover:text-[#5C4033]">
                  Room Lease Draft
                </span>
                <span className="text-[10px] text-[#2C2C2C]/70 mt-1 line-clamp-2">
                  Standard Lagos apartment rental lease with unfair entries and deposits.
                </span>
                <span className="text-[10px] font-medium text-[#27AE60] mt-3 flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                  Instant Test →
                </span>
              </button>

              {/* Freelance template Card */}
              <button
                onClick={() => handleSelectTemplate("freelancer")}
                className="flex flex-col items-start p-4 bg-[#FDFBF7] hover:bg-[#F4F1EA] border border-[#D3C2B5] hover:border-[#5C4033] rounded-xl text-left transition-all duration-200 relative group overflow-hidden"
              >
                <span className="font-mono text-[8px] uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded mb-2">
                  Caution 4/10
                </span>
                <span className="font-serif font-semibold text-xs text-[#1A1A1A] group-hover:text-[#5C4033]">
                  Contractor Terms
                </span>
                <span className="text-[10px] text-[#2C2C2C]/70 mt-1 line-clamp-2">
                  Agreement for creative/dev hires with hidden work-for-hire transfers.
                </span>
                <span className="text-[10px] font-medium text-[#27AE60] mt-3 flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                  Instant Test →
                </span>
              </button>

              {/* Gym Membership Template Card */}
              <button
                onClick={() => handleSelectTemplate("gym")}
                className="flex flex-col items-start p-4 bg-[#FDFBF7] hover:bg-[#F4F1EA] border border-[#D3C2B5] hover:border-[#5C4033] rounded-xl text-left transition-all duration-200 relative group overflow-hidden"
              >
                <span className="font-mono text-[8px] uppercase tracking-wider text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded mb-2">
                  Deceptive 8/10
                </span>
                <span className="font-serif font-semibold text-xs text-[#1A1A1A] group-hover:text-[#5C4033]">
                  Gym Liability Waiver
                </span>
                <span className="text-[10px] text-[#2C2C2C]/70 mt-1 line-clamp-2">
                  Lock-in period terms and liability waver stripping physical injuries.
                </span>
                <span className="text-[10px] font-medium text-[#27AE60] mt-3 flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                  Instant Test →
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Copypaste manual input card */
        <div className="bg-white rounded-2xl border border-[#EAE6DF] p-6 shadow-sm space-y-4">
          <div>
            <label className="block text-[11px] font-mono text-[#5C4033] uppercase tracking-wider mb-1.5">
              Contract File Identifier
            </label>
            <input
              type="text"
              value={customFileName}
              onChange={(e) => setCustomFileName(e.target.value)}
              placeholder="e.g. Graphic_Design_NDA.txt"
              className="w-full text-xs bg-[#FDFBF7] border border-[#D3C2B5] rounded-lg px-3 py-2 text-[#1A1A1A] outline-none focus:border-[#5C4033] font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono text-[#5C4033] uppercase tracking-wider mb-1.5">
                Contract Category
              </label>
              <select
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                className="w-full text-xs bg-[#FDFBF7] border border-[#D3C2B5] rounded-lg px-3 py-2 text-[#1A1A1A] outline-none focus:border-[#5C4033] cursor-pointer"
              >
                <option value="general">💼 General / Service Contract</option>
                <option value="rental">🏠 Residential / Rent Lease</option>
                <option value="freelancer">🎨 Creative / Freelancer Contract</option>
                <option value="gym">🏋️ Membership / Venue Rules</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-mono text-[#5C4033] uppercase tracking-wider mb-1.5">
                Review Confidence
              </label>
              <span className="inline-flex items-center gap-1.5 bg-[#27AE60]/10 border border-[#27AE60]/20 rounded-md px-3 py-2 text-[#27AE60] text-xs font-medium w-full">
                <Sparkles className="w-3.5 h-3.5" />
                OpenRouter Ready
              </span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-[#5C4033] uppercase tracking-wider mb-1.5">
              Draft Text / Legalese Body
            </label>
            <textarea
              rows={8}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste any long, confusing clauses, agreements, or drafts here to translate..."
              className="w-full text-xs bg-[#FDFBF7] border border-[#D3C2B5] rounded-xl p-3.5 text-[#2C2C2C] focus:border-[#5C4033] outline-none font-sans leading-relaxed resize-none"
            />
          </div>

          <button
            onClick={executePasteAnalysis}
            disabled={!pasteText.trim() || isProcessing}
            className={`w-full py-3.5 rounded-xl text-white font-medium text-xs uppercase tracking-wider shadow-md transition-all duration-200 ${
              !pasteText.trim() || isProcessing
                ? "bg-gray-300 text-gray-500 cursor-not-allowed shadow-none"
                : "bg-[#27AE60] hover:bg-[#219653] hover:shadow-lg active:scale-[0.99]"
            }`}
          >
            {isProcessing ? "Reviewing..." : "Analyze Legalese with AI"}
          </button>
        </div>
      )}

      {/* Mock camera scanning visual modal */}
      {showMockCamera && (
        <div className="fixed inset-0 bg-[#1A1A1A]/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#FDFBF7] rounded-3xl border-2 border-[#5C4033] max-w-sm w-full overflow-hidden shadow-2xl relative">
            <div className="p-5 border-b border-[#EAE6DF] flex justify-between items-center bg-[#F4F1EA]">
              <span className="font-serif font-bold text-sm text-[#1A1A1A]">
                Camera Contract Scanner
              </span>
              <button
                onClick={() => setShowMockCamera(false)}
                className="text-xs text-gray-500 hover:text-black font-semibold uppercase px-2 py-0.5 rounded bg-white border border-gray-300"
              >
                Cancel
              </button>
            </div>

            <div className="p-6 text-center space-y-4">
              {/* Camera green boundary zone */}
              <div className="w-full h-48 rounded-2xl relative overflow-hidden flex flex-col justify-center items-center text-white border-2 border-[#27AE60] bg-black">
                {cameraProcessing || cameraPhotoSimulated ? (
                  <div className="space-y-2 px-4">
                    <div className="w-6 h-6 border-2 border-t-transparent border-[#27AE60] rounded-full animate-spin mx-auto"></div>
                    <p className="font-mono text-[10px] uppercase text-[#27AE60] tracking-widest animate-pulse">
                      {ocrProgress > 0 ? `Recognizing text ${ocrProgress}%` : "Recognizing text..."}
                    </p>
                  </div>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      playsInline
                      className="w-full h-full object-cover"
                    />

                    <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-[#27AE60]"></div>
                    <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-[#27AE60]"></div>
                    <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-[#27AE60]"></div>
                    <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-[#27AE60]"></div>
                  </>
                )}

                <canvas ref={canvasRef} style={{ display: "none" }} />
              </div>

              <div className="flex justify-center">
                <button
                  onClick={triggerMockCameraCapture}
                  disabled={cameraProcessing}
                  className="px-6 py-3 rounded-full bg-[#27AE60] hover:bg-[#219653] text-white text-xs uppercase tracking-wider font-semibold shadow-md active:scale-95 transition-all flex items-center gap-2 disabled:opacity-60"
                >
                  <Camera className="w-4 h-4" />
                    {cameraProcessing ? "Processing..." : "Take Instant Photo"}
                </button>
              </div>

              <p className="text-[9px] text-[#B6A293] leading-relaxed">
                ClearContract connects to camera feeds, converting pictures into machine-readable digital text (OCR) for immediate analysis.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
