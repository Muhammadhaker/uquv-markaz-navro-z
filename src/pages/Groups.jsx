import { useState, useEffect } from "react";
import { Search, Loader2, UserPlus } from "lucide-react";
import AddStudentModal from "../components/AddStudentModal";
import StudentDetailModal from "../components/StudentDetailModal";

export default function Groups() {
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sRes, pRes] = await Promise.all([
        fetch("/api/students"),
        fetch("/api/payments"),
      ]);
      const sData = await sRes.json();
      const pData = await pRes.json();
      if (sData.success) setStudents(sData.data);
      if (pData.success) setPayments(pData.data);
    } catch (err) {
      console.error("Xatolik:", err);
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
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">O'quvchilar</h1>
          <p className="text-slate-500 text-sm">Barcha o'quvchilar ro'yxati</p>
        </div>
        <button
          onClick={() => setIsStudentModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md w-full md:w-auto"
        >
          <UserPlus size={20} /> Yangi o'quvchi
        </button>
      </div>

      <div className="mb-6 relative w-full">
        <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Ism yoki telefon raqami..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 transition-all bg-white shadow-sm font-medium"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="px-6 py-4">O'quvchi</th>
                <th className="px-6 py-4">Holati</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="2" className="py-10 text-center">
                    <Loader2 className="animate-spin mx-auto" />
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => {
                  const hasPaid = payments.some(
                    (p) =>
                      p.studentId === s._id &&
                      p.month === currentMonth &&
                      p.groupName === s.group
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
                        <span
                          className={`font-bold ${
                            hasPaid ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {hasPaid ? "To'langan" : "Qarz"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

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
