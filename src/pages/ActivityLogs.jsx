import { useState, useEffect } from "react";
import { History, Trash2, Edit, AlertCircle, Loader2, User, Clock, FileText, RotateCcw } from "lucide-react";

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // TIKLASH (RESTORE) FUNKSIYASI MANA SHU:
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

  const getActionIcon = (action) => {
    switch (action) {
      case "delete":
        return <Trash2 size={16} className="text-rose-500" />;
      case "update":
        return <Edit size={16} className="text-amber-500" />;
      default:
        return <AlertCircle size={16} className="text-slate-500" />;
    }
  };

  const getActionBadge = (action) => {
    switch (action) {
      case "delete":
        return <span className="bg-rose-50 text-rose-600 px-3 py-1 rounded-lg text-xs font-bold">O'CHIRILDI</span>;
      case "update":
        return <span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-lg text-xs font-bold">O'ZGARTIRILDI</span>;
      default:
        return <span className="bg-slate-50 text-slate-600 px-3 py-1 rounded-lg text-xs font-bold">BOSHQA</span>;
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto pb-20">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <History className="text-indigo-600" size={28} />
          Harakatlar Tarixi
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Tizimda so'nggi 48 soat ichida qilingan barcha o'zgarishlar va o'chirishlar (Faqat Super Admin uchun).
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-slate-400" size={32} />
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-slate-100 shadow-sm">
          <History className="mx-auto text-slate-300 mb-4" size={48} />
          <h3 className="text-lg font-bold text-slate-700">Tarix bo'm-bo'sh</h3>
          <p className="text-slate-500 text-sm mt-2">So'nggi 48 soat ichida hech qanday harakat bajarilmagan.</p>
        </div>
      ) : (
        <>
          {/* DESKTOP UCHUN JADVAL */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="px-6 py-4">Vaqt</th>
                  <th className="px-6 py-4">Kim qildi? (Admin)</th>
                  <th className="px-6 py-4">Harakat turi</th>
                  <th className="px-6 py-4">Nima o'zgardi?</th>
                  <th className="px-6 py-4 text-right">Amal</th> {/* YANGI USTUN */}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-500 font-medium">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-slate-400" />
                        {new Date(log.createdAt).toLocaleString("ru-RU", {
                          day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800">
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-indigo-500" />
                        {log.adminName}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getActionBadge(log.actionType)}
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium max-w-xs truncate">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-slate-400" />
                        {log.details}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {/* TIKLASH TUGMASI (DESKTOP) */}
                      {log.actionType === "delete" && log.deletedData && (
                        <button 
                          onClick={() => handleRestore(log)}
                          className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors inline-flex items-center gap-1.5"
                        >
                          <RotateCcw size={14} /> Tiklash
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBIL UCHUN KARTOCHKA */}
          <div className="md:hidden space-y-4">
            {logs.map((log) => (
              <div key={log._id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <User size={16} className="text-indigo-500" />
                    {log.adminName}
                  </div>
                  {getActionBadge(log.actionType)}
                </div>
                
                <div className="bg-slate-50 p-3 rounded-xl text-sm text-slate-600 font-medium flex gap-2 items-start">
                  {getActionIcon(log.actionType)}
                  <span>{log.details}</span>
                </div>

                <div className="flex justify-between items-center border-t border-slate-50 pt-3">
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                    <Clock size={12} />
                    {new Date(log.createdAt).toLocaleString("ru-RU", {
                      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
                    })}
                  </div>
                  
                  {/* TIKLASH TUGMASI (MOBIL) */}
                  {log.actionType === "delete" && log.deletedData && (
                    <button 
                      onClick={() => handleRestore(log)}
                      className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors inline-flex items-center gap-1.5"
                    >
                      <RotateCcw size={14} /> Tiklash
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}