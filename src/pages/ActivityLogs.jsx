import { useState, useEffect } from "react";
import { Loader2, Trash2, Edit, PlusCircle, Clock, ShieldAlert, RotateCcw, AlertOctagon } from "lucide-react";

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/logs");
      const data = await res.json();
      if (data.success) {
        setLogs(data.data || []);
      }
    } catch (err) {
      console.error("Loglarni yuklashda xato:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // TIKLASH (RESTORE) FUNKSIYASI
  const handleRestore = async (log) => {
    if (!window.confirm("Bu ma'lumotni haqiqatan ham tiklaysizmi?")) return;
    try {
      const res = await fetch(log.targetApi, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(log.deletedData)
      });

      if (res.ok) {
        await fetch("/api/logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            adminName: localStorage.getItem("username") || "Super Admin",
            actionType: "update",
            details: `Ma'lumot TIKLANDI: ${log.details.split(':')[1] || "Obyekt"}`
          })
        });

        alert("Muvaffaqiyatli tiklandi! Endi ro'yxatga qaytib ko'rishingiz mumkin.");
        fetchLogs();
      } else {
        alert("Tiklashda xatolik yuz berdi.");
      }
    } catch (error) {
      console.error(error);
    }
  };

  // 🔥 YANGI: BARCHA TARIXNI O'CHIRISH
  const handleClearAll = async () => {
    if (!window.confirm("Barcha harakatlar tarixini o'chirib tashlamoqchimisiz? Bu amalni orqaga qaytarib bo'lmaydi!")) return;

    setClearing(true);
    try {
      const res = await fetch("/api/logs", { method: "DELETE" });
      if (res.ok) {
        setLogs([]);
      } else {
        alert("Xatolik! Backend fayli (api/logs.js) yangilanmagan bo'lishi mumkin.");
      }
    } catch (error) {
      alert("Internet aloqasida muammo.");
    } finally {
      setClearing(false);
    }
  };

  // Harakat turiga qarab dizayn tanlash
  const getActionStyles = (type) => {
    switch (type) {
      case "delete":
        return { icon: <Trash2 size={18} />, color: "text-rose-500", bg: "bg-rose-100", label: "O'chirish" };
      case "create":
        return { icon: <PlusCircle size={18} />, color: "text-emerald-500", bg: "bg-emerald-100", label: "Qo'shish" };
      case "update":
        return { icon: <Edit size={18} />, color: "text-blue-500", bg: "bg-blue-100", label: "Tahrirlash" };
      default:
        return { icon: <ShieldAlert size={18} />, color: "text-slate-500", bg: "bg-slate-100", label: "Boshqa" };
    }
  };

  const formatTime = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleString("uz-UZ", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
    });
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Clock className="text-indigo-600" /> Harakatlar tarixi
          </h1>
          <p className="text-sm text-slate-500 mt-1">Oxirgi 48 soat ichidagi o'zgarishlar va amallar</p>
        </div>

        {/* HAMMASINI O'CHIRISH TUGMASI */}
        {logs.length > 0 && (
          <button
            onClick={handleClearAll}
            disabled={clearing}
            className="flex items-center gap-2 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 w-full sm:w-auto justify-center"
          >
            {clearing ? <Loader2 size={16} className="animate-spin" /> : <AlertOctagon size={16} />}
            Tarixni tozalash
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-indigo-600" size={40} />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
          <Clock className="mx-auto text-slate-300 mb-4" size={48} />
          <p className="text-slate-500 font-bold text-lg">Hozircha tarix bo'm-bo'sh.</p>
          <p className="text-sm text-slate-400 mt-1">Harakatlar amalga oshirilganda bu yerda ko'rinadi.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {logs.map((log) => {
            const style = getActionStyles(log.actionType);
            return (
              <div
                key={log._id}
                className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4 transition-all hover:shadow-md"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-full ${style.bg} ${style.color} shrink-0`}>
                      {style.icon}
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase">Admin</p>
                      <p className="font-bold text-slate-700">{log.adminName}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md ${style.bg} ${style.color}`}>
                    {style.label}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-100">
                  <p className="text-sm font-medium text-slate-800 leading-snug">
                    {log.details}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 justify-between items-center border-t border-slate-50 pt-3">
                  <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                    <Clock size={14} />
                    {formatTime(log.createdAt)}
                  </span>

                  {/* TIKLASH TUGMASI - Faqat o'chirilgan va xotirasi bor obyektlar uchun chiqadi */}
                  {log.actionType === "delete" && log.deletedData && (
                    <button
                      onClick={() => handleRestore(log)}
                      className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors flex items-center gap-1.5"
                    >
                      <RotateCcw size={14} /> Tiklash
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}