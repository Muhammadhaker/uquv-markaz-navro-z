import { useState } from 'react';

export default function PaymentModal({ isOpen, onClose, studentId, studentName }) {
  const [amount, setAmount] = useState('');
  const [paymentType, setPaymentType] = useState('Naqd');
  const [month, setMonth] = useState('');
  const [loading, setLoading] = useState(false);

  // Agar oyna yopiq holatda bo'lsa, hech narsa ko'rsatmaydi
  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const adminName = localStorage.getItem('username') || 'Admin';

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          studentId, 
          amount: Number(amount), 
          paymentType, 
          month, 
          adminName 
        })
      });

      if (res.ok) {
        alert("To'lov muvaffaqiyatli saqlandi!");
        // Inputlarni tozalash
        setAmount('');
        setMonth('');
        onClose(); // Modalni yopish
      } else {
        alert("Xatolik yuz berdi. Qayta urinib ko'ring.");
      }
    } catch (error) {
      alert("Server xatosi!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50 transition-opacity">
      <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md transform transition-all">
        <h2 className="text-xl font-bold text-gray-800 mb-1">To'lov qabul qilish</h2>
        <p className="text-sm text-gray-500 mb-6">O'quvchi: <span className="font-semibold text-blue-600">{studentName}</span></p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Summa (so'm)</label>
            <input 
              type="number" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Masalan: 200000"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To'lov turi</label>
            <select 
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="Naqd">Naqd pul 💵</option>
              <option value="Plastik">Plastik karta 💳</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Qaysi oy uchun?</label>
            <input 
              type="text" 
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Masalan: Noyabr"
              required
            />
          </div>

          <div className="flex justify-end space-x-3 mt-8">
            <button 
              type="button" 
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition"
            >
              Bekor qilish
            </button>
            <button 
              type="submit"
              disabled={loading}
              className={`px-4 py-2 text-white rounded-lg font-medium transition ${loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {loading ? 'Saqlanmoqda...' : 'Tasdiqlash'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}