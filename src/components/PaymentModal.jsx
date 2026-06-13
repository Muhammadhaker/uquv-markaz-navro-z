import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, X } from 'lucide-react';

export default function PaymentModal({ isOpen, onClose, student }) {
  const [amount, setAmount] = useState('');
  const [paymentType, setPaymentType] = useState('Naqd');
  const [paymentMonth, setPaymentMonth] = useState('');
  const [group, setGroup] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen && student) {
      const today = new Date();
      setPaymentMonth(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);
      setGroup(student.group || '');
      setAmount('');
      setSuccess(false);
      setErrorMessage('');
    }
  }, [isOpen, student]);

  if (!isOpen || !student) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Professional Cheklovlar (Validation)
    if (Number(amount) <= 0) {
      setErrorMessage("To'lov summasi noldan katta bo'lishi shart!");
      return;
    }

    setLoading(true);
    setErrorMessage('');
    const adminName = localStorage.getItem('username') || 'Admin';

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          studentId: student._id,
          studentName: student.name,
          groupName: group,
          amount: Number(amount), 
          paymentType, 
          month: paymentMonth, 
          adminName 
        })
      });
      const result = await res.json();

      if (res.ok && result.success) {
        setSuccess(true);
        // 1.5 soniyadan keyin avtomat yopiladi
        setTimeout(() => { onClose(); }, 1500);
      } else {
        setErrorMessage(result.error || "To'lovni saqlashda server xatosi.");
      }
    } catch (error) {
      setErrorMessage("Tarmoq xatosi. Server bilan ulanish muvaffaqiyatsiz.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all relative">
        
        {/* Yopish tugmasi */}
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition">
          <X size={20} />
        </button>

        {success ? (
          /* Muvaffaqiyatli To'lov Holati */
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 shadow-inner">
              <CheckCircle size={36} />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Muvaffaqiyatli yakunlandi!</h3>
            <p className="text-sm text-slate-500">To'lov qabul qilindi va bazaga muhrlandi.</p>
          </div>
        ) : (
          /* Asosiy Forma */
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="border-b pb-3">
              <h2 className="text-xl font-bold text-slate-800">To'lov Qabul Qilish</h2>
              <p className="text-xs text-slate-500 mt-1">O'quvchi: <span className="font-bold text-indigo-600">{student.name}</span></p>
            </div>

            {errorMessage && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold p-3 rounded-xl text-center">
                ⚠️ {errorMessage}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Fan / Guruh</label>
              <input 
                type="text" 
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Summa (so'm)</label>
                <input 
                  type="number" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Masalan: 300000"
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Turi</label>
                <select 
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm font-semibold text-slate-700 outline-none bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Naqd">Naqd pul 💵</option>
                  <option value="Plastik">Plastik 💳</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Qaysi oy uchun? (Kalendar)</label>
              <input 
                type="month" 
                value={paymentMonth}
                onChange={(e) => setPaymentMonth(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-3 text-sm font-semibold text-slate-700 outline-none cursor-pointer focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button 
                type="button" 
                onClick={onClose} 
                disabled={loading}
                className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold rounded-xl text-sm transition"
              >
                Bekor qilish
              </button>
              <button 
                type="submit" 
                disabled={loading}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold rounded-xl text-sm transition shadow-md shadow-indigo-100"
              >
                {loading && <Loader2 className="animate-spin" size={16} />}
                Tasdiqlash
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}