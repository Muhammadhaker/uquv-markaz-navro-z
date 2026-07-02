import { useState, useEffect } from "react";
import { Loader2, Bot, CalendarClock, RefreshCw } from "lucide-react";

export default function CronLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCronHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cron-reminders?action=history"); 
      const json = await res.json();
      if (json.success) setLogs(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCronHistory(); }, []);

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto pb-20">
      
      {/* Jiddiy Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Bot className="text-indigo-600" size={26} /> Tizim Jurnali
          </h1>
          <p className="text-slate-500 text-sm mt-1">Avtomatlashtirilgan xabarlar va xatoliklar auditi</p>
        </div>
        
        <button 
          onClick={fetchCronHistory} 
          className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg hover:bg-slate-50 transition-all shadow-sm text-sm font-bold active:scale-95"
        >
          <RefreshCw size={16} className="text-slate-500" /> Yangilash
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-20 text-slate-400 font-bold bg-white rounded-xl shadow-sm border border-slate-200">
          Hali hisobotlar yo'q. Tizim ishlagach shu yerda paydo bo'ladi.
        </div>
      ) : (
        <div className="space-y-6">
          {logs.map((log, index) => (
            <div key={log._id || index} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              
              {/* Log Header - Qat'iy va toza */}
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-200">
                    <CalendarClock size={18} className="text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {new Date(log.date).toLocaleString("ru-RU", { 
                        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" 
                      })}
                    </p>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">Avtomatik tizim tekshiruvi</p>
                  </div>
                </div>
                
                <div className="bg-slate-100 text-slate-600 px-3 py-1 rounded-md text-xs font-bold border border-slate-200">
                  Tugallangan
                </div>
              </div>

              {/* Log Content - Ixcham bloklar */}
              <div className="p-6 space-y-6">

                {/* Muvaffaqiyatli yuborilganlar */}
                {log.sent?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Muvaffaqiyatli yuborildi ({log.sent.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {log.sent.map((name, i) => (
                        <span key={i} className="bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-md text-xs font-semibold">
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Allaqachon yuborilganlar */}
                {log.alreadySent?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      Duble rad etildi / Bugun yuborilgan ({log.alreadySent.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {log.alreadySent.map((name, i) => (
                        <span key={i} className="bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-md text-xs font-semibold">
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ulanmaganlar (Sariq emas, jiddiy to'q sariq aksent) */}
                {log.unlinked?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      Botga ulanmaganlar ({log.unlinked.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {log.unlinked.map((name, i) => (
                        <span key={i} className="bg-white border border-amber-200 text-amber-700 px-3 py-1.5 rounded-md text-xs font-semibold">
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Xatoliklar (Jadval ko'rinishida) */}
                {log.failed?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      Xatoliklar ({log.failed.length})
                    </h3>
                    <div className="bg-rose-50/50 border border-rose-100 rounded-lg p-1">
                      {log.failed.map((e, i) => (
                        <div key={i} className="flex justify-between items-center text-xs py-2 px-3 border-b border-rose-100/50 last:border-0 hover:bg-rose-50 transition-colors">
                          <span className="font-bold text-slate-800">{e.name}</span>
                          <span className="text-rose-500 font-mono text-[10px] bg-rose-100/50 px-2 py-0.5 rounded">{e.error}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Agar amallar bo'lmasa */}
                {!log.sent?.length && !log.alreadySent?.length && !log.unlinked?.length && !log.failed?.length && (
                  <div className="text-sm text-slate-500 font-medium py-2">
                    Tizim tekshiruvi davomida hech qanday harakat amalga oshirilmadi.
                  </div>
                )}

              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}