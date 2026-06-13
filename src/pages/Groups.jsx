import { useState } from 'react';
import PaymentModal from '../components/PaymentModal';
import { UserPlus, Wallet } from 'lucide-react';

export default function Groups() {
  const [students, setStudents] = useState([
    { _id: '1', name: 'Aliyev Vali', phone: '+998 90 123 45 67', group: 'Ingliz tili' },
    { _id: '2', name: 'Karimova Lola', phone: '+998 90 987 65 43', group: 'Ingliz tili' },
    { _id: '3', name: 'Mamatov Jasur', phone: '+998 93 111 22 33', group: 'Matematika' },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const openPayment = (student) => {
    setSelectedStudent(student);
    setIsModalOpen(true);
  };

  return (
    <div className="p-2">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">O'quvchilar va Guruhlar</h1>
          <p className="text-slate-500 text-sm mt-1">Ro'yxat va to'lovlarni boshqarish</p>
        </div>
        <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-indigo-200">
          <UserPlus size={18} />
          Yangi o'quvchi
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
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
              {students.map((student) => (
                <tr key={student._id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold border border-indigo-100">
                        {student.name.charAt(0)}
                      </div>
                      <span className="font-semibold text-slate-800">{student.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-medium">{student.phone}</td>
                  <td className="px-6 py-4">
                    <span className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200">
                      {student.group}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => openPayment(student)}
                      className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-600 border border-emerald-200 px-4 py-2 rounded-lg hover:bg-emerald-500 hover:text-white font-semibold transition-all duration-200"
                    >
                      <Wallet size={16} />
                      To'lov qilish
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <PaymentModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        student={selectedStudent}
      />
    </div>
  );
}