import { useState, useEffect } from "react";
import { Loader2, AlertTriangle, UserX, Bot, CalendarClock, CheckCircle } from "lucide-react";

export default function CronLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCronHistory = async () => {
    setLoading(true);
    try {
      // 🔥 XAVFSIZ: Endi u faqat o'qiydi! Botni bezovta qilmaydi.
      const res = await fetch("/api/cron-logs"); 
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
          <p className="text-slate-500 text-sm mt-1">Oxirgi 30 kun ichida bot kimlarga xabar yubordi va kimlarga yo'q</p>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-20 text-slate-400 font-bold bg-white rounded-2xl shadow-sm">
          Hali hisobotlar yo'q. Tizim 10:00 da ishlagach shu yerda paydo bo'ladi.
        </div>
      ) : (
        <div className="space-y-6">
          {logs.map((log, index) => (
            <div key={log._id || index} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              {/* Sana va Vaqt */}
              <div className="flex items-center gap-2 text-indigo-700 font-black mb-4 border-b border-slate-100 pb-3">
                <CalendarClock size={20} />
                {new Date(log.date).toLocaleString("ru-RU", { 
                  day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" 
                })}
              </div>

              {/* Muvaffaqiyatli */}
              {log.sent?.length > 0 && (
                <div className="mb-4 bg-emerald-50 p-4 rounded-xl">
                  <h3 className="font-bold text-emerald-700 flex items-center gap-2 mb-2"><CheckCircle size={16}/> Muvaffaqiyatli yuborildi ({log.sent.length})</h3>
                  <div className="flex flex-wrap gap-2">
                    {log.sent.map((name, i) => (
                      <span key={i} className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">{name}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Ulanmaganlar */}
              {log.unlinked?.length > 0 && (
                <div className="mb-4 bg-amber-50 p-4 rounded-xl">
                  <h3 className="font-bold text-amber-700 flex items-center gap-2 mb-2"><UserX size={16}/> Botga ulanmaganlar ({log.unlinked.length})</h3>
                  <div className="flex flex-wrap gap-2">
                    {log.unlinked.map((name, i) => (
                      <span key={i} className="bg-white text-amber-700 px-3 py-1 rounded-full text-xs font-bold border border-amber-200">{name}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Xatoliklar */}
              {log.failed?.length > 0 && (
                <div className="bg-rose-50 p-4 rounded-xl">
                  <h3 className="font-bold text-rose-700 flex items-center gap-2 mb-2"><AlertTriangle size={16}/> Xatoliklar ({log.failed.length})</h3>
                  <div className="space-y-1">
                    {log.failed.map((e, i) => (
                      <div key={i} className="text-xs text-rose-600 font-medium">
                        <span className="font-bold">{e.name}:</span> {e.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}