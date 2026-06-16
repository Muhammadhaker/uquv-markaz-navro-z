import { useState, useEffect } from "react";
import {
  Search,
  AlertCircle,
  CheckCircle2,
  Loader2,
  UserPlus,
} from "lucide-react";
import AddStudentModal from "../components/AddStudentModal";
import PaymentModal from "../components/PaymentModal";
import StudentDetailModal from "../components/StudentDetailModal"; // Yangi modalni chaqiramiz

export default function Groups() {
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null); // O'quvchi kartasi uchun

  // ... (fetchData funksiyasi o'zgarishsiz qoladi)
  const fetchData = async () => {
    setLoading(true);
    try {
      const [studentsRes, paymentsRes] = await Promise.all([
        fetch("/api/students"),
        fetch("/api/payments"),
      ]);
      const studentsData = await studentsRes.json();
      const paymentsData = await paymentsRes.json();
      if (studentsData.success) setStudents(studentsData.data);
      if (paymentsData.success) setPayments(paymentsData.data);
    } catch (error) {
      console.error("Xato:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone.includes(searchQuery)
  );

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* ... (Header qismi o'zgarishsiz) */}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            {/* ... (thead qismi o'zgarishsiz) */}
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredStudents.map((s) => {
                const hasPaid = payments.some(
                  (p) => p.studentId === s._id && p.month === currentMonth
                );
                return (
                  <tr
                    key={s._id}
                    onClick={() => setSelectedStudent(s)}
                    className="hover:bg-indigo-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{s.name}</div>
                      <div className="text-xs text-slate-500">
                        {s.group} • {s.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {hasPaid ? (
                        <span className="text-emerald-600 font-bold">
                          To'langan
                        </span>
                      ) : (
                        <span className="text-rose-600 font-bold">Qarz</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">To'lov</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modallar */}
      {isStudentModalOpen && (
        <AddStudentModal
          isOpen={true}
          onClose={() => {
            setIsStudentModalOpen(false);
            fetchData();
          }}
        />
      )}

      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          onRefresh={fetchData}
        />
      )}
    </div>
  );
}
