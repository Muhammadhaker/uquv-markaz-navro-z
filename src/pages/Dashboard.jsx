import { useState, useEffect } from 'react';
import { Wallet, TrendingUp, CreditCard, Pencil, Trash2, X, Loader2 } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({ payments: [], totalAmount: 0 });
  const [loading, setLoading] = useState(true);
  
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payments');
      const data = await res.json();
      
      if (data.success && data.data) {
        // Xato summa bazaga yozilib qolgan bo'lsa, uni ignor qilamiz
        const total = data.data.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        setStats({ payments: data.data, totalAmount: total });
      }
    } catch (error) {
      console.error("Xatolik:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleDelete = async (id, studentName) => {
    if (!window.confirm(`${studentName} ning to'lovini haqiqatan ham o'chirmoqchimisiz?`)) return;
    try {
      const res = await fetch('/api/payments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) fetchStats();
    } catch (error) {
      alert("O'chirishda xatolik yuz berdi");
    }
  };

  const openEdit = (payment) => {
    setEditData({ ...payment });
    setEditModalOpen(true);
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editData._id,
          amount: Number(editData.amount),
          paymentType: editData.paymentType,
          month: editData.month
        })
      });
      
      if (res.ok) {
        setEditModalOpen(false);
        fetchStats();
      } else {
        alert("Saqlashda xatolik!");
      }
    } catch (error) {
      alert("Tarmoq xatosi!");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-2">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Umumiy Statistika</h1>
        <p className="text-slate-500 text-sm mt-1">Markazning holati va oxirgi tranzaksiyalar</p>
      </div>
      
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

        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
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

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
          <CreditCard className="text-slate-400" size={20} />
          <h2 className="text-lg font-bold text-slate-800">Oxirgi to'lovlar tarixi</h2>
        </div>
        <div className="overflow-x-auto min-h-[200px]">
          {loading ? (
            <div className="flex justify-center items-center h-32 text-slate-400">Yuklanmoqda...</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-slate-500 text-sm font-medium uppercase tracking-wider">
                  <th className="px-6 py-4 border-b border-slate-100">O'quvchi</th>
                  <th className="px-6 py-4 border-b border-slate-100">Guruh / Fan</th>
                  <th className="px-6 py-4 border-b border-slate-100">Summa</th>
                  <th className="px-6 py-4 border-b border-slate-100">Admin</th>
                  <th className="px-6 py-4 border-b border-slate-100 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {stats.payments.length === 0 ? (
                  <tr><td colSpan="5" className="text-center py-8 text-slate-400">Hozircha to'lovlar yo'q</td></tr>
                ) : (
                  stats.payments.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50/80 transition-colors group">
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
                        <div className="font-bold text-emerald-600">{Number(p.amount).toLocaleString()} so'm</div>
                        <div className="text-xs text-slate-500 mt-0.5">{p.paymentType}</div>
                      </td>
                      <td className="px-6 py-4 border-b border-slate-50 text-slate-600 font-medium">
                        {p.adminName}
                      </td>
                      <td className="px-6 py-4 border-b border-slate-50 text-right space-x-2">
                        <button onClick={() => openEdit(p)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition" title="Tahrirlash">
                          <Pencil size={18} />
                        </button>
                        <button onClick={() => handleDelete(p._id, p.studentName)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition" title="O'chirish">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {editModalOpen && editData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md relative p-6">
            <button onClick={() => setEditModalOpen(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-slate-800 mb-1">To'lovni tahrirlash</h2>
            <p className="text-sm text-slate-500 mb-6">{editData.studentName} ({editData.groupName})</p>

            <form onSubmit={handleEditSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Summa (so'm)</label>
                <input 
                  type="number" required value={editData.amount} 
                  onChange={(e) => setEditData({...editData, amount: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Turi</label>
                  <select 
                    value={editData.paymentType} 
                    onChange={(e) => setEditData({...editData, paymentType: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="Naqd">Naqd pul 💵</option>
                    <option value="Plastik">Plastik 💳</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Oy</label>
                  <input 
                    type="month" required value={editData.month}
                    onChange={(e) => setEditData({...editData, month: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                <button type="button" onClick={() => setEditModalOpen(false)} className="px-4 py-2.5 bg-slate-50 text-slate-600 rounded-xl font-semibold">Bekor qilish</button>
                <button type="submit" disabled={isSaving} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold flex items-center gap-2">
                  {isSaving && <Loader2 className="animate-spin" size={16} />} Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}