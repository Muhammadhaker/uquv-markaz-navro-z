import { useState, useEffect } from 'react';
import { Wallet, TrendingUp, CreditCard, Pencil, Trash2, X, Loader2, CalendarDays } from 'lucide-react';

export default function Dashboard() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payments');
      const data = await res.json();
      if (data.success && data.data) {
        setPayments(data.data);
        const uniqueMonths = [...new Set(data.data.map(p => p.month))].sort().reverse();
        setAvailableMonths(uniqueMonths);
      }
    } catch (error) { console.error("Xatolik:", error); } finally { setLoading(false); }
  };

  useEffect(() => { fetchStats(); }, []);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`${name} ning to'lovini o'chirmoqchimisiz?`)) return;
    await fetch('/api/payments', { method: 'DELETE', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ id }) });
    fetchStats();
  };

  const filtered = selectedMonth === 'all' ? payments : payments.filter(p => p.month === selectedMonth);
  const total = filtered.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const formatMonth = (m) => {
    if (!m) return '';
    const [y, mm] = m.split('-');
    const names = ["Yan", "Fev", "Mar", "Apr", "May", "Iyun", "Iyul", "Avg", "Sen", "Okt", "Noy", "Dek"];
    return `${names[parseInt(mm)-1]} ${y}`;
  };

  return (
    <div className="p-4 md:p-8">
      {/* Sarlavha va Filtr */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Umumiy Statistika</h1>
        </div>
        <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="p-3 border rounded-xl font-bold bg-white">
          <option value="all">Barcha oylar</option>
          {availableMonths.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
        </select>
      </div>
      
      {/* Qutichalar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-indigo-600 text-white p-6 rounded-2xl shadow-lg">
          <p className="text-indigo-100 text-sm">Jami Tushum</p>
          <h3 className="text-2xl font-bold">{total.toLocaleString()} so'm</h3>
        </div>
        <div className="bg-white border p-6 rounded-2xl shadow-sm">
          <p className="text-slate-500 text-sm">To'lovlar soni</p>
          <h3 className="text-2xl font-bold">{filtered.length} ta</h3>
        </div>
      </div>

      {/* Jadval - Mobil uchun moslangan */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-4">O'quvchi</th>
                <th className="px-4 py-4 hidden sm:table-cell">Guruh</th>
                <th className="px-4 py-4">Summa</th>
                <th className="px-4 py-4 text-right">Amal</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(p => (
                <tr key={p._id} className="hover:bg-slate-50 text-sm">
                  <td className="px-4 py-4 font-semibold">{p.studentName}<div className="text-[10px] text-slate-400 sm:hidden">{p.groupName}</div></td>
                  <td className="px-4 py-4 hidden sm:table-cell">{p.groupName}</td>
                  <td className="px-4 py-4 font-bold text-emerald-600">{Number(p.amount).toLocaleString()}</td>
                  <td className="px-4 py-4 text-right flex justify-end gap-2">
                    <button onClick={() => { setEditData(p); setEditModalOpen(true); }} className="p-2 text-indigo-500"><Pencil size={16}/></button>
                    <button onClick={() => handleDelete(p._id, p.studentName)} className="p-2 text-rose-500"><Trash2 size={16}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Edit Modal (oldingi kodingiz bilan bir xil) */}
      {/* ... */}
    </div>
  );
}