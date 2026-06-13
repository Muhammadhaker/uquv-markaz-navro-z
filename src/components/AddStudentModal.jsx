import { useState } from 'react';
import { X, Loader2, UserPlus } from 'lucide-react';

export default function AddStudentModal({ isOpen, onClose, refreshData }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+998');
  const [group, setGroup] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, group })
      });

      const data = await res.json();
      if (data.success) {
        setName('');
        setPhone('+998');
        setGroup('');
        refreshData(); // Ro'yxatni yangilash
        onClose(); // Oynani yopish
      } else {
        setError(data.error || "Xatolik yuz berdi");
      }
    } catch (err) {
      setError("Server bilan aloqa yo'q!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md relative">
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
          <X size={20} />
        </button>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="border-b pb-3 flex items-center gap-2">
            <UserPlus className="text-indigo-600" size={24} />
            <h2 className="text-xl font-bold text-slate-800">Yangi o'quvchi qo'shish</h2>
          </div>

          {error && <div className="text-rose-600 text-sm font-semibold bg-rose-50 p-3 rounded-xl">{error}</div>}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">F.I.O</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Masalan: Aliyev Vali" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Telefon raqam</label>
            <input type="text" required value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="+998901234567" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Guruh (Fan)</label>
            <input type="text" required value={group} onChange={(e) => setGroup(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ingliz tili" />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-semibold">Bekor qilish</button>
            <button type="submit" disabled={loading} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold flex items-center gap-2">
              {loading && <Loader2 className="animate-spin" size={16} />} Saqlash
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}