import { useState, useEffect } from "react";
import { Loader2, Trash2, Edit, PlusCircle, Clock, ShieldAlert, RotateCcw, AlertOctagon, Search, CreditCard, UserCheck, CheckCircle2 } from "lucide-react";

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

  const handleClearAll = async () => {
    if (!window.confirm("Barcha harakatlar tarixini o'chirib tashlamoqchimisiz? Bu amalni orqaga qaytarib bo'lmaydi!")) return;

    setClearing(true);
    try {
      const res = await fetch("/api/logs", { method: "DELETE" });
      if (res.ok) {
        setLogs([]);
      } else {
        alert("Xatolik! Backend bilan bog'lanib bo'lmadi.");
      }
    } catch (error) {
      alert("Internet aloqasida muammo.");
    } finally {
      setClearing(false);
    }
  };

  const getActionStyles = (type, details) => {
    const text = (type + " " + details).toLowerCase();
    
    if (text.includes("delete") || text.includes("o'chiril")) 
      return { icon: <Trash2 size={16} />, color: "text-rose-600", bg: "bg-rose-100", label: "O'chirilgan" };
    if (text.includes("create") || text.includes("yangi") || text.includes("qo'shil") || text.includes("saqlandi")) 
      return { icon: <PlusCircle size={16} />, color: "text-emerald-600", bg: "bg-emerald-100", label: "Qo'shilgan" };
    if (text.includes("update") || text.includes("tahrir") || text.includes("tiklandi")) 
      return { icon: <Edit size={16} />, color: "text-blue-600", bg: "bg-blue-100", label: "Tahrirlangan" };
    if (text.includes("to'lov") || text.includes("pay")) 
      return { icon: <CreditCard size={16} />, color: "text-amber-600", bg: "bg-amber-100", label: "To'lov" };
    if (text.includes("davomat") || text.includes("keldi") || text.includes("ketdi")) 
      return { icon: <UserCheck size={16} />, color: "text-indigo-600", bg: "bg-indigo-100", label: "Davomat" };
      
    return { icon: <CheckCircle2 size={16} />, color: "text-slate-600", bg: "bg-slate-100", label: "Harakat" };
  };

  const formatTime = (dateString) => {
    const d = new Date(dateString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year}, ${hours}:${minutes}`;
  };

  // 🔥 Matnni chiroyli qilib ikki qismga bo'lish (O'qish oson bo'lishi uchun)
  const renderFormattedDetails = (detailsText) => {
    if (!detailsText.includes(':')) {
      return <span className="font-bold text-slate-800">{detailsText}</span>;
    }
    const [action, ...rest] = detailsText.split(':');
    const target = rest.join(':').trim();

    return (
      <span className="leading-snug">
        <span className="text-slate-500 font-medium">{action}: </span>
        <span className="font-bold text-slate-800">{target}</span>
      </span>
    );
  };

  const filteredLogs = logs.filter(log => 
    log.details.toLowerCase().includes(searchQuery.toLowerCase()) || 
    log.adminName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto pb-24">
      
      {/* HEADER QISMI */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-2">
            <Clock className="text-indigo-600" /> Harakatlar tarixi
          </h1>
          <p className="text-sm text-slate-500 mt-1">Barcha tizim o'zgarishlari va amallar ro'yxati</p>
        </div>

        {logs.length > 0 && (
          <button
            onClick={handleClearAll}
            disabled={clearing}
            className="flex items-center justify-center gap-2 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 px-5 py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 w-full sm:w-auto shadow-sm"
          >
            {clearing ? <Loader2 size={18} className="animate-spin" /> : <AlertOctagon size={18} />}
            Tarixni tozalash
          </button>
        )}
      </div>

      {/* QIDIRUV QISMI */}
      <div className="mb-6 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Harakat turi, ism yoki xodim bo'yicha qidiring..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 font-medium transition-all shadow-sm text-slate-700"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-indigo-600" size={40} />
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <Clock className="mx-auto text-slate-300 mb-4" size={56} />
          <p className="text-slate-600 font-bold text-xl">Harakatlar topilmadi.</p>
          <p className="text-sm text-slate-400 mt-2">Qidiruv so'zini o'zgartiring yoki tizimda amal bajaring.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredLogs.map((log) => {
            const style = getActionStyles(log.actionType, log.details);
            return (
              <div
                key={log._id}
                className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:border-indigo-200 hover:shadow-md transition-all flex flex-col"
              >
                {/* 1. Tepa qism (Admin va Holati) */}
                <div className="flex justify-between items-center px-4 py-3 border-b border-slate-50/80 bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${style.bg} ${style.color}`}>
                      {style.icon}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">KIM BAJARDI:</p>
                      <p className="text-sm font-bold text-slate-800">{log.adminName}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-bold uppercase tracking-wider ${style.bg} ${style.color}`}>
                    {style.label}
                  </span>
                </div>

                {/* 2. Markaziy qism (Asosiy harakat matni) */}
                <div className="px-4 py-4 sm:px-5">
                  <p className="text-sm sm:text-base text-slate-700">
                    {renderFormattedDetails(log.details)}
                  </p>
                </div>

                {/* 3. Pastki qism (Vaqt va Tiklash tugmasi) */}
                <div className="flex justify-between items-center px-4 py-3 bg-slate-50/50 border-t border-slate-50/80">
                  <span className="text-[11px] sm:text-xs font-bold text-slate-400 flex items-center gap-1.5">
                    <Clock size={14} />
                    {formatTime(log.createdAt)}
                  </span>

                  {log.actionType === "delete" && log.deletedData && (
                    <button
                      onClick={() => handleRestore(log)}
                      className="bg-white border border-indigo-100 text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-50 transition-colors flex items-center gap-1.5 shadow-sm"
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