import { useState, useEffect } from "react";
import { Loader2, Bot, CalendarClock, RefreshCw, CheckCircle2, AlertCircle, UserX, Info } from "lucide-react";

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
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Bot className="text-indigo-600" size={26} /> Tizim Jurnali
          </h1>
          <p className="text-slate-500 text-sm mt-1">Avtomatlashtirilgan xabarlar bo'yicha kundalik hisobotlar</p>
        </div>
        
        <button 
          onClick={fetchCronHistory} 
          className="flex items-center gap-2 bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg hover:bg-slate-100 transition-all shadow-sm text-sm font-bold active:scale-95"
        >
          <RefreshCw size={16} className="text-slate-500" /> Yangilash
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-20 text-slate-400 font-bold bg-white rounded-xl shadow-sm border border-slate-200">
          Hali hisobotlar yo'q. Tizim ishlagach shu yerda paydo bo'ladi.
        </div>
      ) : (
        <div className="space-y-8">
          {logs.map((log, index) => (
            <div key={log._id || index} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              
              {/* Sana qismi */}
              <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-200 text-indigo-600">
                    <CalendarClock size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800 tracking-wide">
                      {new Date(log.date).toLocaleString("ru-RU", { 
                        day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" 
                      })}
                    </p>
                    <p className="text-[11px] text-slate-500 font-semibold uppercase mt-0.5">Avtomatik tizim tekshiruvi</p>
                  </div>
                </div>
                
                <div className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-md text-xs font-bold border border-emerald-100">
                  Tugallangan
                </div>
              </div>

              <div className="p-6 space-y-8">

                {/* 1. MUVAFFAQIYATLI YUBORILGANLAR */}
                {log.sent?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-emerald-700 flex items-center gap-2 mb-3 border-b border-emerald-100 pb-2">
                      <CheckCircle2 size={18} />
                      Muvaffaqiyatli yuborildi ({log.sent.length} ta)
                    </h3>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-3">
                      {log.sent.map((name, i) => (
                        <li key={i} className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> {name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 2. DUBLE RAD ETILDI */}
                {log.alreadySent?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-blue-700 flex items-center gap-2 mb-3 border-b border-blue-100 pb-2">
                      <Info size={18} />
                      Bugun allaqachon yuborilganlar ({log.alreadySent.length} ta)
                    </h3>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-3">
                      {log.alreadySent.map((name, i) => (
                        <li key={i} className="text-sm font-medium text-slate-600 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-300"></span> {name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 3. BOTGA ULANMAGANLAR */}
                {log.unlinked?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-amber-600 flex items-center gap-2 mb-1">
                      <UserX size={18} />
                      Botga ulanmaganlar ({log.unlinked.length} ta)
                    </h3>
                    <p className="text-xs text-amber-500/80 font-medium mb-3 border-b border-amber-100 pb-2">
                      Bu o'quvchilarda Telegram ID yo'q, xabar yuborish imkonsiz.
                    </p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-3">
                      {log.unlinked.map((name, i) => (
                        <li key={i} className="text-sm font-medium text-slate-600 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> {name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 4. XATOLIKLAR (Foydalanuvchi tilida) */}
                {log.failed?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-rose-600 flex items-center gap-2 mb-1">
                      <AlertCircle size={18} />
                      Xabar yetib bormaganlar ({log.failed.length} ta)
                    </h3>
                    <p className="text-xs text-rose-500/80 font-medium mb-3 border-b border-rose-100 pb-2">
                      Bu o'quvchilar botni bloklagan yoki o'chirib yuborgan bo'lishi mumkin.
                    </p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-3">
                      {/* DIQQAT: e.error (Inglizcha xato kodi) olib tashlandi, faqat ismi chiqadi */}
                      {log.failed.map((e, i) => (
                        <li key={i} className="text-sm font-semibold text-rose-700 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> {e.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Agar hech narsa bajarilmagan bo'lsa */}
                {!log.sent?.length && !log.alreadySent?.length && !log.unlinked?.length && !log.failed?.length && (
                  <div className="text-sm text-slate-500 font-medium italic text-center py-4">
                    Bu sanada hech qanday amaliyot bajarilmagan.
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