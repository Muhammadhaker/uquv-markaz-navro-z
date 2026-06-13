import { useState } from 'react';
import { X, Loader2, UserPlus } from 'lucide-react';

export default function AddStudentModal({ isOpen, onClose, refreshData }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+998 ');
  const [group, setGroup] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePhoneChange = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.startsWith('998')) val = val.slice(3);
    let f = '+998 ';
    if (val.length > 0) f += val.slice(0, 2) + ' ';
    if (val.length > 2) f += val.slice(2, 5) + ' ';
    if (val.length > 5) f += val.slice(5, 7) + ' ';
    if (val.length > 7) f += val.slice(7, 9);
    setPhone(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await fetch('/api/students', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name, phone, group}) });
    refreshData();
    onClose();
    setLoading(false);
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute right-4 top-4"><X size={20} /></button>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><UserPlus /> Yangi o'quvchi</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input className="w-full border p-3 rounded-xl" placeholder="F.I.O" required onChange={(e) => setName(e.target.value)} />
          <input className="w-full border p-3 rounded-xl" value={phone} onChange={handlePhoneChange} />
          <input className="w-full border p-3 rounded-xl" placeholder="Guruh" required onChange={(e) => setGroup(e.target.value)} />
          <button className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold" disabled={loading}>
            {loading ? <Loader2 className="animate-spin mx-auto" /> : "Saqlash"}
          </button>
        </form>
      </div>
    </div>
  );
}