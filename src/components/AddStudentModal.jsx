import { useState } from 'react';
import { Loader2, X, User, Phone, Users } from 'lucide-react';

export default function AddStudentModal({ isOpen, onClose }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+998');
  const [group, setGroup] = useState('');
  const [loading, setLoading] = useState(false);

  // Agar modal yopiq bo'lsa, hech narsa ko'rsatmaydi
  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, group })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Muvaffaqiyatli saqlansa: Inputlarni tozalaymiz va modalni yopamiz
        setName('');
        setPhone('+998');
        setGroup('');
        onClose(); // Bu Groups.jsx ga "yangilan" degan buyruqni beradi
      } else {
        // Bazada bunday raqam bor bo'lsa yoki xato bo'lsa
        alert(data.error || data.message || "Ushbu ma'lumotni saqlashda xatolik yuz berdi. (Raqam takrorlanmaganini tekshiring)");
      }
    } catch (error) {
      // Internet yo'q bo'lsa
      console.error("Saqlashda xato:", error);
      alert("Server bilan aloqa yo'q. Internetni tekshiring.");
    } finally {
      // Nima bo'lsa ham oxirida "Loading" ni o'chiramiz
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Modal Sarlavhasi */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-800"><span>Yangi o'quvchi qo'shish</span></h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Forma qismi */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Ism */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2"><span>F.I.SH</span></label>
            <div className="relative">
              <User className="absolute left-4 top-3.5 text-slate-400" size={20} />
              <input 
                type="text" 
                required 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masalan: Tursunov Muhammad"
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 transition-all font-medium text-slate-700"
              />
            </div>
          </div>

          {/* Telefon */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2"><span>Telefon raqam</span></label>
            <div className="relative">
              <Phone className="absolute left-4 top-3.5 text-slate-400" size={20} />
              <input 
                type="text" 
                required 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+998 90 123 45 67"
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 transition-all font-medium text-slate-700"
              />
            </div>
          </div>

          {/* Guruh */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2"><span>Guruh nomi</span></label>
            <div className="relative">
              <Users className="absolute left-4 top-3.5 text-slate-400" size={20} />
              <input 
                type="text" 
                required 
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                placeholder="Masalan: Ingliz tili"
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 transition-all font-medium text-slate-700"
              />
            </div>
          </div>

          {/* Tugmalar */}
          <div className="flex gap-3 pt-4">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
            >
              <span>Bekor qilish</span>
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-md flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : null}
              <span>{loading ? "Saqlanmoqda..." : "Saqlash"}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}