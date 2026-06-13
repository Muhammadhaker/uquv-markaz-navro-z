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
      if (data.success) {
        setStudents(data.data || []);
      }
    } catch (error) {
      console.error("Xatolik:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const openPayment = (student) => {
    setSelectedStudent(student);
    setIsPaymentOpen(true);
  };

  const deleteStudent = async (id, name) => {
    if(!window.confirm(`${name || "Bu"} o'quvchini ro'yxatdan o'chirmoqchimisiz?`)) return;
    try {
      await fetch('/api/students', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      fetchStudents(); 
    } catch (error) {
      alert("O'chirishda xatolik yuz berdi");
    }
  };

  // Jadvalda raqamni doim chiroyli qilib ko'rsatuvchi funksiya
  const formatDisplayPhone = (phoneStr) => {
    if (!phoneStr) return '-';
    const num = phoneStr.replace(/\D/g, ''); // faqat raqamlarni olamiz
    if (num.length === 12 && num.startsWith('998')) {
      return `+998 ${num.slice(3, 5)} ${num.slice(5, 8)} ${num.slice(8, 10)} ${num.slice(10, 12)}`;
    }
    return phoneStr; // agar formatga tushmasa, o'zini qaytaradi
  };

  return (
    <div className="p-2">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">O'quvchilar va Guruhlar</h1>
          <p className="text-slate-500 text-sm mt-1">Ro'yxatni boshqarish va to'lov qabul qilish</p>
        </div>
        <button 
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-indigo-200"
        >
          <UserPlus size={18} />
          Yangi o'quvchi
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden min-h-[300px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
            <p className="font-medium">O'quvchilar yuklanmoqda...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 text-sm font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4 border-b border-slate-100">F.I.O</th>
                  <th className="px-6 py-4 border-b border-slate-100">Telefon</th>
                  <th className="px-6 py-4 border-b border-slate-100">Guruh</th>
                  <th className="px-6 py-4 border-b border-slate-100 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-50">
                {!students || students.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-10 text-slate-400 font-medium">Hozircha o'quvchilar yo'q. Yangi qo'shing!</td>
                  </tr>
                ) : (
                  students.map((student) => (
                    <tr key={student._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold border border-indigo-100">
                            {student?.name ? student.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <span className="font-semibold text-slate-800">{student?.name || 'Ismsiz'}</span>
                        </div>
                      </td>
                      {/* FUNKSIYANI SHU YERDA ISHLATAMIZ */}
                      <td className="px-6 py-4 text-slate-600 font-medium tracking-wide">
                        {formatDisplayPhone(student?.phone)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200">
                          {student?.group || 'Guruhsiz'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button 
                          onClick={() => deleteStudent(student._id, student?.name)}
                          className="inline-flex p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="O'chirish"
                        >
                          <Trash2 size={18} />
                        </button>
                        <button 
                          onClick={() => openPayment(student)}
                          className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-600 border border-emerald-200 px-4 py-2 rounded-lg hover:bg-emerald-500 hover:text-white font-semibold transition-all duration-200"
                        >
                          <Wallet size={16} /> To'lov
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PaymentModal isOpen={isPaymentOpen} onClose={() => setIsPaymentOpen(false)} student={selectedStudent} />
      <AddStudentModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} refreshData={fetchStudents} />
    </div>
  );
}