import { useEffect, useState } from "react";
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

export default function AttendanceScanner() {
  const [scanResult, setScanResult] = useState(null);
  const [status, setStatus] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 🔥 AQLLI SKANYER SOZLAMALARI:
    const scanner = new Html5QrcodeScanner("reader", {
      fps: 10,             // Soniyasiga 10 marta kadr o'qiydi (tezlik uchun ideal)
      qrbox: { width: 250, height: 250 }, // O'quvchi kodni tutishi kerak bo'lgan ramka
      rememberLastUsedCamera: true, // Telefon/Noutbukning oxirgi ishlatilgan kamerasini eslab qoladi
      supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA] // Faqat kamerani yoqadi, rasmdan qidirishni o'chirib turadi
    });

    scanner.render(onScanSuccess, onScanFailure);

    async function onScanSuccess(decodedText) {
      // Kod o'qilgan zahoti kamerani pauza qilamiz (2-3 marta o'qib yubormasligi uchun)
      scanner.pause(true); 
      setScanResult(decodedText);
      await markAttendanceViaQR(decodedText);
    }

    function onScanFailure(error) {
      // Skanyer har soniyada kod izlaydi, topolmasa xato beradi. 
      // Konsol to'lib ketmasligi uchun buni bo'sh qoldiramiz.
    }

    return () => {
      scanner.clear().catch(err => console.error("Scanner o'chirishda xato", err));
    };
  }, []);

  const markAttendanceViaQR = async (studentId) => {
    setLoading(true);
    setStatus({ type: "", text: "" });

    try {
      const res = await fetch("/api/attendance/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          date: new Date().toISOString().split("T")[0], 
          adminName: localStorage.getItem("username") || "Admin"
        }),
      });

      const result = await res.json();

      if (result.success) {
        setStatus({ type: "success", text: `✅ ${result.message}` });
      } else {
        setStatus({ type: "error", text: `❌ Xatolik: ${result.message}` });
      }
    } catch (error) {
      setStatus({ type: "error", text: "❌ Server bilan bog'lanishda xatolik yuz berdi." });
    } finally {
      setLoading(false);
      // 🔥 O'quvchini "Keldi" qilgach, 2 soniyadan keyin keyingi o'quvchi uchun oynani tozalab beradi
      setTimeout(() => {
        window.location.reload(); 
      }, 2000);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto text-center space-y-6 pb-24">
      <h2 className="text-2xl font-bold text-slate-800">QR-Davomat</h2>
      <p className="text-sm text-slate-500 -mt-4">O'quvchi telefonidagi kodni kameraga tuting</p>
      
      {/* Kamera ekrani mana shu ramka ichida ochiladi */}
      <div id="reader" className="overflow-hidden rounded-3xl border-4 border-indigo-100 bg-white shadow-xl"></div>

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