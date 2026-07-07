import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Loader2, CheckCircle, AlertCircle, Camera, X, FlipHorizontal } from "lucide-react";

export default function AttendanceScanner({ onScan }) {
  const [status, setStatus] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isMirrored, setIsMirrored] = useState(false);
  
  const scannerRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth > 768) {
      setIsMirrored(true);
    }
    
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().then(() => scannerRef.current.clear()).catch(() => {});
      }
    };
  }, []);

  const startCamera = async () => {
    setStatus({ type: "", text: "" });
    try {
      const html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" }, 
        { 
          fps: 15, 
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdgePercentage = 0.85; 
            const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
            return {
              width: minEdgeSize * minEdgePercentage,
              height: minEdgeSize * minEdgePercentage
            };
          },
          disableFlip: true 
        },
        async (decodedText) => {
          if (scannerRef.current && scannerRef.current.getState() === 2) {
             scannerRef.current.pause(true);
          }
          await processQR(decodedText);
        },
        (errorMessage) => {
          // Xatolar e'tiborga olinmaydi
        }
      );
      setIsCameraOpen(true);
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", text: "❌ Kameraga ruxsat berilmadi yoki kamera topilmadi!" });
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        setIsCameraOpen(false);
        setStatus({ type: "", text: "" });
      } catch (e) {
        console.error("Kamerani o'chirishda xatolik:", e);
      }
    }
  };

  const processQR = async (decodedText) => {
    setLoading(true);
    setStatus({ type: "", text: "" });

    let studentId = decodedText;
    if (decodedText.includes("?start=")) {
      studentId = decodedText.split("?start=")[1].trim();
    }

    // 🔥 MANA SHU YERDA XATO YASHIRINGAN EDI
    if (onScan) {
      onScan(studentId); // Davomat sahifasiga yuboradi
      setLoading(false);
      
      // Skanerni keyingi o'quvchi uchun 2 soniyadan so'ng yana ishga tushiramiz
      setTimeout(() => {
        if (scannerRef.current && scannerRef.current.getState() === 3) {
           scannerRef.current.resume();
        }
      }, 2000);
      
      return; // 🔥 DIQQAT: Ushbu RETURN so'zi bo'lmagani uchun pastki eski kodga ham tushib ketib xato berayotgan edi! Endi bu yerda aniq to'xtaydi.
    }

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: studentId, 
          date: new Date().toISOString().split("T")[0], 
          adminName: localStorage.getItem("username") || "Admin"
        }),
      });

      const result = await res.json();

      if (result.success) {
        setStatus({ type: "success", text: `✅ O'quvchi topildi va belgilandi!` });
      } else {
        setStatus({ type: "error", text: `❌ Xatolik: ${result.message}` });
      }
    } catch (error) {
      setStatus({ type: "error", text: "❌ Server bilan bog'lanishda xato." });
    } finally {
      setLoading(false);
      setTimeout(() => {
        setStatus({ type: "", text: "" });
        if (scannerRef.current && scannerRef.current.getState() === 3) {
           scannerRef.current.resume();
        }
      }, 2000);
    }
  };

  return (
    <div className="p-4 w-full max-w-lg mx-auto text-center space-y-6 pb-24 relative">
      <h2 className="text-2xl font-bold text-slate-800">QR-Davomat</h2>
      <p className="text-sm text-slate-500 -mt-4">O'quvchi bejigidagi kodni kameraga tuting</p>
      
      <div className="relative overflow-hidden rounded-3xl border-4 border-indigo-100 bg-black shadow-xl min-h-[450px] flex items-center justify-center">
        
        {isCameraOpen && (
          <button 
            onClick={() => setIsMirrored(!isMirrored)}
            className="absolute top-4 right-4 z-[60] bg-white/90 backdrop-blur p-2.5 rounded-full shadow-lg text-slate-700 hover:text-indigo-600 transition-colors"
            title="O'ng va chapni almashtirish (Ko'zgu)"
          >
            <FlipHorizontal size={24} />
          </button>
        )}

        {!isCameraOpen && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-10 p-6">
             <Camera size={56} className="text-indigo-300 mb-4" />
             <button 
               onClick={startCamera}
               className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-md active:scale-95 text-lg"
             >
               Kamerani yoqish
             </button>
             <p className="text-xs text-slate-400 mt-4 text-center px-4">
               Tugmani bosing va brauzer so'raganda <br/> <b>"Allow" (Ruxsat)</b> tugmasini tanlang.
             </p>
          </div>
        )}

        <div id="reader" className="w-full"></div>
      </div>

      {isCameraOpen && (
         <button 
           onClick={stopCamera}
           className="bg-rose-100 hover:bg-rose-200 text-rose-600 px-6 py-4 rounded-xl font-bold transition-all w-full flex items-center justify-center gap-2 text-lg"
         >
           <X size={24} /> Kamerani yopish
         </button>
      )}

      {loading && (
        <div className="flex justify-center items-center p-4 bg-indigo-50 rounded-2xl border border-indigo-100 animate-pulse">
          <Loader2 className="animate-spin text-indigo-600 mr-3" size={24} />
          <span className="font-bold text-indigo-700 text-lg">Tizimga yozilmoqda...</span>
        </div>
      )}

      {status.text && (
        <div className={`p-4 rounded-2xl font-bold text-base shadow-sm flex items-center justify-center gap-2 ${
          status.type === "success" 
            ? "bg-emerald-100 text-emerald-700 border border-emerald-200" 
            : "bg-rose-100 text-rose-700 border border-rose-200"
        }`}>
          {status.type === "success" ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
          {status.text}
        </div>
      )}

      <style jsx global>{`
        #reader {
          width: 100%;
          border-radius: 1.5rem;
          overflow: hidden;
        }
        #reader video {
          transform: ${isMirrored ? 'scaleX(-1)' : 'none'} !important; 
          width: 100% !important;
          object-fit: cover !important;
        }
        #qr-shaded-region {
          border-width: 6px !important;
          border-color: rgba(79, 70, 229, 0.8) !important;
        }
      `}</style>
    </div>
  );
}