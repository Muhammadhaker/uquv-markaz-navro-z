import { useEffect, useState, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Loader2, CheckCircle, AlertCircle, Camera, X } from "lucide-react";

// 🔥 DIQQAT: onScan propsini qabul qilyapmiz!
export default function AttendanceScanner({ onScan }) {
  const [status, setStatus] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const scannerRef = useRef(null);

  const startCamera = async () => {
    setStatus({ type: "", text: "" });
    try {
      const html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" }, 
        { fps: 10, qrbox: { width: 250, height: 250 } },
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

  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().then(() => scannerRef.current.clear()).catch(() => {});
      }
    };
  }, []);

  // 🔥 QR KODNI QAYTA ISHLASH VA BAZAGA YUBORISH
  const processQR = async (decodedText) => {
    setLoading(true);
    setStatus({ type: "", text: "" });

    // 1. URL ICHIDAN FAQAT "ID" QISMINI QIRQIB OLISH!
    let studentId = decodedText;
    if (decodedText.includes("?start=")) {
      studentId = decodedText.split("?start=")[1].trim();
    }

    try {
      // 2. PARENT (Attendance.jsx) GA ID NI YUBORISH (Kechikdi/Keldi rangini o'zgartirish uchun)
      if (onScan) {
        onScan(studentId);
      }

      // 3. API GA TO'G'RI ID BILAN SO'ROV YUBORISH
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: studentId, // Ochiq toza ID ketadi
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
      // Skanerni yana yangi o'quvchini kutish uchun ishga tushirish
      setTimeout(() => {
        setStatus({ type: "", text: "" });
        if (scannerRef.current && scannerRef.current.getState() === 3) {
           scannerRef.current.resume();
        }
      }, 2000);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto text-center space-y-6 pb-24">
      <h2 className="text-2xl font-bold text-slate-800">QR-Davomat</h2>
      <p className="text-sm text-slate-500 -mt-4">O'quvchi bejigidagi kodni kameraga tuting</p>
      
      <div className="relative overflow-hidden rounded-3xl border-4 border-indigo-100 bg-white shadow-xl min-h-[300px] flex items-center justify-center">
        
        {!isCameraOpen && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-10 p-6">
             <Camera size={48} className="text-indigo-300 mb-4" />
             <button 
               onClick={startCamera}
               className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 rounded-xl font-bold transition-all shadow-md active:scale-95"
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
           className="bg-rose-100 hover:bg-rose-200 text-rose-600 px-6 py-3 rounded-xl font-bold transition-all w-full flex items-center justify-center gap-2"
         >
           <X size={20} /> Kamerani yopish
         </button>
      )}

      {loading && (
        <div className="flex justify-center items-center p-4 bg-indigo-50 rounded-2xl border border-indigo-100 animate-pulse">
          <Loader2 className="animate-spin text-indigo-600 mr-3" size={24} />
          <span className="font-bold text-indigo-700">Tizimga yozilmoqda...</span>
        </div>
      )}

      {status.text && (
        <div className={`p-4 rounded-2xl font-bold text-sm shadow-sm flex items-center justify-center gap-2 ${
          status.type === "success" 
            ? "bg-emerald-100 text-emerald-700 border border-emerald-200" 
            : "bg-rose-100 text-rose-700 border border-rose-200"
        }`}>
          {status.type === "success" ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {status.text}
        </div>
      )}
    </div>
  );
}