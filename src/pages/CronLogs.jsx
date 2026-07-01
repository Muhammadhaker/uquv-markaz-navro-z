import { useState, useEffect } from "react";
import { Loader2, Send, AlertTriangle, UserX, Bot, RefreshCw } from "lucide-react";

export default function CronLogs() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCronReport = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cron-reminders"); 
      const data = await res.json();
      setReport(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCronReport(); }, []);

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto pb-20">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Bot className="text-indigo-600" /> Bot hisoboti
        </h1>
        <button onClick={fetchCronReport} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100">
          <RefreshCw size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
          <p className="text-emerald-600 text-xs font-bold uppercase">Yuborildi</p>
          <p className="text-2xl font-black text-emerald-700">{report.muvaffaqiyatli_yuborildi?.length || 0}</p>
        </div>
        <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100">
          <p className="text-rose-600 text-xs font-bold uppercase">Xatoliklar</p>
          <p className="text-2xl font-black text-rose-700">{report.xatolik_berdi?.length || 0}</p>
        </div>
        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
          <p className="text-amber-600 text-xs font-bold uppercase">Ulanmaganlar</p>
          <p className="text-2xl font-black text-amber-700">{report.botga_ulanmaganlar?.length || 0}</p>
        </div>
      </div>

      <div className="space-y-6">
        {report.botga_ulanmaganlar?.length > 0 && (
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="font-bold text-amber-700 flex items-center gap-2 mb-3"><UserX size={18}/> Ulanmaganlar</h3>
            <div className="flex flex-wrap gap-2">
              {report.botga_ulanmaganlar.map((name, i) => (
                <span key={i} className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-bold">{name}</span>
              ))}
            </div>
          </div>
        )}
        
        {report.xatolik_berdi?.length > 0 && (
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="font-bold text-rose-700 flex items-center gap-2 mb-3"><AlertTriangle size={18}/> Xatoliklar</h3>
            {report.xatolik_berdi.map((e, i) => (
              <div key={i} className="flex justify-between text-xs py-2 border-b last:border-0">
                <span className="font-bold text-slate-700">{e.name}</span>
                <span className="text-rose-500 italic">{e.error}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}