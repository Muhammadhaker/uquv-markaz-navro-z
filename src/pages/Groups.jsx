import { useState, useEffect } from 'react';
import { Search, AlertCircle, CheckCircle2, Loader2, UserPlus, CreditCard } from 'lucide-react';
import StudentModal from '../components/StudentModal'; // O'zingizdagi yo'lga qarab o'zgartiring
import PaymentModal from '../components/PaymentModal'; // O'zingizdagi yo'lga qarab o'zgartiring

export default function Groups() {
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modallar uchun state'lar
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [studentsRes, paymentsRes] = await Promise.all([
        fetch('/api/students'),
        fetch('/api/payments')
      ]);
      
      const studentsData = await studentsRes.json();
      const paymentsData = await paymentsRes.json();

      if (studentsData.success) setStudents(studentsData.data);
      if (paymentsData.success) setPayments(paymentsData.data);
    } catch (error) {
      console.error("Ma'lumot yuklashda xato:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const currentMonth = new Date().toISOString().slice(0, 7);

  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    student.phone.includes(searchQuery)
  );

  const openPaymentModal = (student) => {
    setSelectedStudent(student);
    setIsPaymentModalOpen(true);
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Sarlavha va O'quvchi qo'shish tugmasi */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800"><span>O'quvchilar</span></h1>
          <p className="text-slate-500 text-sm"><span>Barcha o'quvchilar ro'yxati</span></p>
        </div>
        
        <button 
          onClick={() => setIsStudentModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md w-full md:w-auto"
        >
          <UserPlus size={20} /> <span>Yangi o'quvchi</span>
        </button>
      </div>

      {/* QIDIRUV QATORI */}
      <div className="mb-6 relative w-full">
        <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Ism yoki telefon raqami orqali qidiring..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 transition-all bg-white shadow-sm font-medium"
        />
      </div>

      {/* JADVAL */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="px-6 py-4"><span>O'quvchi</span></th>
                <th className="px-6 py-4"><span>Holati</span></th>
                <th className="px-6 py-4 text-right"><span>Amal</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr><td colSpan="3" className="py-10 text-center text-slate-400"><div className="flex items-center justify-center gap-2"><Loader2 className="animate-spin" /> <span>Yuklanmoqda...</span></div></td></tr>
              ) : filteredStudents.length === 0 ? (
                <tr><td colSpan="3" className="py-10 text-center text-slate-400"><span>O'quvchi topilmadi.</span></td></tr>
              ) : (
                filteredStudents.map(s => {
                  const hasPaid = payments.some(p => p.studentId === s._id && p.month === currentMonth);

                  return (
                    <tr key={s._id} className="hover:bg-slate-50 transition-colors">
                      {/* O'quvchi ma'lumotlari */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800 text-base"><span>{s.name}</span></div>
                        <div className="text-xs text-slate-500 mt-1 font-medium flex items-center gap-2">
                          <span>{s.group}</span> • <span>{s.phone}</span>
                        </div>
                      </td>
                      
                      {/* To'lov Holati (Qarz / To'langan) */}
                      <td className="px-6 py-4">
                        {hasPaid ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold">
                            <CheckCircle2 size={16} /> <span>To'langan</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-100 text-rose-700 rounded-lg text-xs font-bold">
                            <AlertCircle size={16} /> <span>Qarz</span>
                          </span>
                        )}
                      </td>

                      {/* To'lov tugmasi */}
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => openPaymentModal(s)}
                          className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 px-4 py-2 rounded-lg font-bold transition-all"
                        >
                          <span>To'lov</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modallarni chaqirish */}
      {isStudentModalOpen && (
        <StudentModal 
          isOpen={isStudentModalOpen} 
          onClose={() => {
            setIsStudentModalOpen(false);
            fetchData(); // Yangi o'quvchi qo'shilgach ro'yxatni yangilash
          }} 
        />
      )}

      {isPaymentModalOpen && selectedStudent && (
        <PaymentModal 
          student={selectedStudent} 
          isOpen={isPaymentModalOpen} 
          onClose={() => {
            setIsPaymentModalOpen(false);
            fetchData(); // To'lov qilingach qarz statusini yangilash
          }} 
        />
      )}
    </div>
  );
}