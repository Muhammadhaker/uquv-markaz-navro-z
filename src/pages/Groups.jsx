import { useState, useEffect } from 'react';
import PaymentModal from '../components/PaymentModal';
import AddStudentModal from '../components/AddStudentModal';
import { UserPlus, Wallet, Loader2, Trash2 } from 'lucide-react';

export default function Groups() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/students');
      const data = await res.json();
      if (data.success) setStudents(data.data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchStudents(); }, []);

  const formatDisplayPhone = (p) => {
    if (!p) return '-';
    const n = p.replace(/\D/g, '');
    return n.length >= 9 ? `+998 ${n.slice(n.length-9, n.length-7)} ${n.slice(n.length-7, n.length-4)} ${n.slice(n.length-4, n.length-2)} ${n.slice(n.length-2)}` : p;
  };

  return (
    <div className="p-4 md:p-8">
      {/* Sarlavha qismi - Mobil uchun moslashuvchan */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">O'quvchilar</h1>
          <p className="text-slate-500 text-sm">Barcha o'quvchilar ro'yxati</p>
        </div>
        <button 
          onClick={() => setIsAddOpen(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg"
        >
          <UserPlus size={18} /> Yangi o'quvchi
        </button>
      </div>

      {/* Jadval - Mobil uchun moslangan */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-4">O'quvchi</th>
                <th className="px-4 py-4 hidden sm:table-cell">Telefon</th>
                <th className="px-4 py-4 hidden sm:table-cell">Guruh</th>
                <th className="px-4 py-4 text-right">Amal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="4" className="py-10 text-center"><Loader2 className="animate-spin mx-auto" /></td></tr>
              ) : students.length === 0 ? (
                <tr><td colSpan="4" className="py-10 text-center text-slate-400">O'quvchilar topilmadi</td></tr>
              ) : (
                students.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="font-semibold">{s.name}</div>
                      <div className="text-[10px] text-indigo-600 sm:hidden">{s.group} • {formatDisplayPhone(s.phone)}</div>
                    </td>
                    <td className="px-4 py-4 hidden sm:table-cell text-slate-600 font-mono">{formatDisplayPhone(s.phone)}</td>
                    <td className="px-4 py-4 hidden sm:table-cell"><span className="bg-slate-100 px-2 py-1 rounded-lg text-xs">{s.group}</span></td>
                    <td className="px-4 py-4 text-right">
                      <button onClick={() => { setSelectedStudent(s); setIsPaymentOpen(true); }} className="bg-emerald-50 text-emerald-600 px-3 py-2 rounded-lg font-bold text-sm">To'lov</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddStudentModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} refreshData={fetchStudents} />
      <PaymentModal isOpen={isPaymentOpen} onClose={() => setIsPaymentOpen(false)} student={selectedStudent} />
    </div>
  );
}