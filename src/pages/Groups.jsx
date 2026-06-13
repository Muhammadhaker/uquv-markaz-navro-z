import { useState, useEffect } from 'react';
import PaymentModal from '../components/PaymentModal';

export default function Groups() {
  // Oddiylik uchun o'quvchilar ro'yxatini vaqtinchalik (Mock Data) qilib yozamiz. 
  // Aslida bularni "/api/students" dan olib kelasiz.
  const [students, setStudents] = useState([
    { _id: '1', name: 'Aliyev Vali', phone: '+998901234567', group: 'Ingliz tili' },
    { _id: '2', name: 'Karimova Lola', phone: '+998909876543', group: 'Ingliz tili' },
    { _id: '3', name: 'Mamatov Jasur', phone: '+998931112233', group: 'Matematika' },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const openPayment = (student) => {
    setSelectedStudent(student);
    setIsModalOpen(true);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">O'quvchilar va Guruhlar</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm">
                <th className="px-6 py-3 border-b">F.I.O</th>
                <th className="px-6 py-3 border-b">Telefon</th>
                <th className="px-6 py-3 border-b">Guruh</th>
                <th className="px-6 py-3 border-b text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {students.map((student) => (
                <tr key={student._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 border-b font-medium text-gray-800">{student.name}</td>
                  <td className="px-6 py-4 border-b text-gray-600">{student.phone}</td>
                  <td className="px-6 py-4 border-b">
                    <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                      {student.group}
                    </span>
                  </td>
                  <td className="px-6 py-4 border-b text-right">
                    <button 
                      onClick={() => openPayment(student)}
                      className="bg-green-100 text-green-700 px-4 py-2 rounded hover:bg-green-200 font-medium transition"
                    >
                      To'lov qilish
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* To'lov Oynasi (Modal) */}
      <PaymentModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        studentId={selectedStudent?._id}
        studentName={selectedStudent?.name}
      />
    </div>
  );
}