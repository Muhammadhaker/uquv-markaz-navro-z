import { useState, useEffect } from 'react';
import { Wallet, TrendingUp, CreditCard, Pencil, Trash2, X, Loader2, CalendarDays } from 'lucide-react';

export default function Dashboard() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Oylar uchun state'lar
  const [availableMonths, setAvailableMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('all'); // 'all' = Barcha oylar
  
  // Tahrirlash modali uchun
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Bazadan to'lovlarni yuklash
  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payments');
      const data = await res.json();
      
      if (data.success && data.data) {
        setPayments(data.data);
        
        // Bazadagi barcha takrorlanmas oylarni ajratib olish (Masalan: "2026-05", "2026-06")
        const monthsObj = {};
        data.data.forEach(p => {
          if (p.month) monthsObj[p.month] = true;
        });
        // Oylarni yangisidan eskisiga qarab saralash
        const uniqueMonths = Object.keys(monthsObj).sort().reverse();
        setAvailableMonths(uniqueMonths);
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

  // O'chirish
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

  // Tahrirlash
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

  // --- FILTRLASH MANTIQI ---
  // Tanlangan oy bo'yicha to'lovlarni ajratib olamiz
  const filteredPayments = selectedMonth === 'all' 
    ? payments 
    : payments.filter(p => p.month === selectedMonth);

  // Faqat ajratib olingan to'lovlarning umumiy summasi
  const totalAmount = filteredPayments.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  // Oyni chiroyli o'zbekcha formatga o'tkazish funksiyasi (Masalan: "2026-06" -> "Iyun, 2026")
  const formatMonthName = (monthStr) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const monthNames = {
      "01": "Yanvar", "02": "Fevral", "03": "Mart", "04": "Aprel",
      "05": "May", "06": "Iyun", "07": "Iyul", "08": "Avgust",
      "09": "Sentabr", "10": "Oktabr", "11": "Noyabr", "12": "Dekabr"
    };
    return `${monthNames[month]} ${year}`;
  };

  return (
    <div className="p-2">
      
      {/* Sarlavha va Oy Filtr */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Umumiy Statistika</h1>
          <p className="text-slate-500 text-sm mt-1">Markazning holati va tranzaksiyalar</p>
        </div>
        
        {/* Oy tanlash (Filtr) */}
        <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <CalendarDays className="text-indigo-500" size={20} />
          <select 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-transparent font-semibold text-slate-700 outline-none cursor-pointer"
          >
            <option value="all">Barcha oylar tarixi</option>
            {availableMonths.map((m, i) => (
              <option key={i} value={m}>{formatMonthName(m)}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Tepa qutichalar (Faqat tanlangan oy uchun hisoblanadi) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200 transition-all">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-indigo-100 text-sm font-medium mb-1">
                {selectedMonth === 'all' ? 'Jami Tushum' : `${formatMonthName(selectedMonth)}dagi tushum`}
              </p>
              <h3 className="text-3xl font-bold">{loading ? '...' : totalAmount.toLocaleString()} so'm</h3>
            </div>
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Wallet size={24} className="text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm transition-all">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-slate-500 text-sm font-medium mb-1">To'lov qilganlar soni</p>
              <h3 className="text-3xl font-bold text-slate-800">
                {loading ? '...' : filteredPayments.length} <span className="text-lg text-slate-400 font-normal">ta</span>
              </h3>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl">
              <TrendingUp size={24} className="text-emerald-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Jadval (Faqat tanlangan oyga tegishli odamlar chiqadi) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="text-slate-400" size={20} />
            <h2 className="text-lg font-bold text-slate-800">To'lovlar ro'yxati</h2>
          </div>
          {selectedMonth !== 'all' && (
            <span className="text-sm font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">
              {formatMonthName(selectedMonth)}
            </span>
          )}
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
                {filteredPayments.length === 0 ? (
                  <tr><td colSpan="5" className="text-center py-10 text-slate-400 font-medium">Bu oy uchun to'lovlar topilmadi.</td></tr>
                ) : (
                  filteredPayments.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4 border-b border-slate-50">
                        <div className="font-semibold text-slate-800">{p.studentName}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{formatMonthName(p.month)} uchun</div>
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

      {/* Tahrirlash Modali */}
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