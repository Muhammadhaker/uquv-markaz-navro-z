import { useState, useEffect } from "react";
import { Loader2, AlertTriangle, UserX, Bot, CalendarClock, CheckCircle, Info } from "lucide-react";

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
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Bot className="text-indigo-600" /> Bot xabarlari tarixi
          </h1>
          <p className="text-slate-500 text-sm mt-1">Oxirgi 30 kun ichida bot qanday amallar bajargani tarixi</p>
        </div>

        {/* Yangilash tugmasi */}
        <button onClick={fetchCronHistory} className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-20 text-slate-400 font-bold bg-white rounded-2xl shadow-sm border border-slate-100">
          Hali hisobotlar yo'q. Tizim ishlagach shu yerda paydo bo'ladi.
        </div>
      ) : (
        <div className="space-y-6">
          {logs.map((log, index) => (
            <div key={log._id || index} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">

              {/* Sana va Vaqt */}
              <div className="flex items-center gap-2 text-indigo-700 font-black mb-4 border-b border-slate-100 pb-3">
                <CalendarClock size={20} />
                {new Date(log.date).toLocaleString("ru-RU", {
                  day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
                })}
                <span className="text-xs text-slate-400 font-medium ml-2">(Tizim avtomatik tekshiruvi)</span>
              </div>

              {/* Muvaffaqiyatli yuborilganlar */}
              {log.sent?.length > 0 && (
                <div className="mb-4 bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                  <h3 className="font-bold text-emerald-700 flex items-center gap-2 mb-2"><CheckCircle size={16} /> Muvaffaqiyatli yuborildi ({log.sent.length})</h3>
                  <div className="flex flex-wrap gap-2">
                    {log.sent.map((name, i) => (
                      <span key={i} className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">{name}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Allaqachon yuborilganlar (Xotira ishladi) */}
              {log.alreadySent?.length > 0 && (
                <div className="mb-4 bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <h3 className="font-bold text-blue-700 flex items-center gap-2 mb-2"><Info size={16} /> Bugun yuborilganlar / Duble rad etildi ({log.alreadySent.length})</h3>
                  <div className="flex flex-wrap gap-2">
                    {log.alreadySent.map((name, i) => (
                      <span key={i} className="bg-white text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-200">{name}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Ulanmaganlar */}
              {log.unlinked?.length > 0 && (
                <div className="mb-4 bg-amber-50 p-4 rounded-xl border border-amber-100">
                  <h3 className="font-bold text-amber-700 flex items-center gap-2 mb-2"><UserX size={16} /> Botga ulanmaganlar ({log.unlinked.length})</h3>
                  <div className="flex flex-wrap gap-2">
                    {log.unlinked.map((name, i) => (
                      <span key={i} className="bg-white text-amber-700 px-3 py-1 rounded-full text-xs font-bold border border-amber-200">{name}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Xatoliklar */}
              {log.failed?.length > 0 && (
                <div className="bg-rose-50 p-4 rounded-xl border border-rose-100">
                  <h3 className="font-bold text-rose-700 flex items-center gap-2 mb-2"><AlertTriangle size={16} /> Xatoliklar ({log.failed.length})</h3>
                  <div className="space-y-1">
                    {log.failed.map((e, i) => (
                      <div key={i} className="text-xs text-rose-600 font-medium">
                        <span className="font-bold">{e.name}:</span> {e.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Agar hammasi bo'sh bo'lsa (Masalan hech kimni to'lov vaqti kelmagan) */}
              {!log.sent?.length && !log.alreadySent?.length && !log.unlinked?.length && !log.failed?.length && (
                <div className="text-sm text-slate-500 font-medium italic">
                  Bu vaqtda xabar yuborilishi kerak bo'lgan qarzdorlar topilmadi.
                </div>
              )}

            </div>
          ))}
        </div>
      )}
    </div>
  );
}