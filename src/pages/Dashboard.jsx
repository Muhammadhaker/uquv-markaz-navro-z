import { useState, useEffect } from 'react';
import { Wallet, TrendingUp, CreditCard } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({ payments: [], totalAmount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/payments');
        const data = await res.json();
        if (data.success) {
          const total = data.data.reduce((sum, item) => sum + item.amount, 0);
          setStats({ payments: data.data, totalAmount: total });
        }
      } catch (error) {
        console.error("Xatolik:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="p-2">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Umumiy Statistika</h1>
        <p className="text-slate-500 text-sm mt-1">Markazning moliyaviy holati va oxirgi tranzaksiyalar</p>
      </div>
      
      {/* Chiroyli Kartochkalar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-indigo-100 text-sm font-medium mb-1">Jami Tushum</p>
              <h3 className="text-3xl font-bold">{loading ? '...' : stats.totalAmount.toLocaleString()} so'm</h3>
            </div>
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Wallet size={24} className="text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-slate-500 text-sm font-medium mb-1">Qabul qilingan to'lovlar</p>
              <h3 className="text-3xl font-bold text-slate-800">{loading ? '...' : stats.payments.length} <span className="text-lg text-slate-400 font-normal">ta</span></h3>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl">
              <TrendingUp size={24} className="text-emerald-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Zamonaviy Jadval */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
          <CreditCard className="text-slate-400" size={20} />
          <h2 className="text-lg font-bold text-slate-800">Oxirgi to'lovlar tarixi</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 text-sm font-medium uppercase tracking-wider">
                <th className="px-6 py-4 border-b border-slate-100">O'quvchi</th>
                <th className="px-6 py-4 border-b border-slate-100">Guruh / Fan</th>
                <th className="px-6 py-4 border-b border-slate-100">Summa</th>
                <th className="px-6 py-4 border-b border-slate-100">Admin</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {stats.payments.slice(0, 10).map((p, i) => (
                <tr key={i} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-4 border-b border-slate-50">
                    <div className="font-semibold text-slate-800">{p.studentName}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{p.month} uchun</div>
                  </td>
                  <td className="px-6 py-4 border-b border-slate-50">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100">
                      {p.groupName}
                    </span>
                  </td>
                  <td className="px-6 py-4 border-b border-slate-50">
                    <div className="font-bold text-emerald-600">{p.amount.toLocaleString()} so'm</div>
                    <div className="text-xs text-slate-500 mt-0.5">{p.paymentType}</div>
                  </td>
                  <td className="px-6 py-4 border-b border-slate-50 text-slate-600 font-medium">
                    {p.adminName}
                  </td>
                </tr>
              ))}
              {stats.payments.length === 0 && !loading && (
                <tr><td colSpan="4" className="text-center py-8 text-slate-400">Hozircha to'lovlar yo'q</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}