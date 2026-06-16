import { useState, useEffect } from "react";
import { Search, Loader2, UserPlus, Pencil, Trash2 } from "lucide-react";
import AddStudentModal from "../components/AddStudentModal";
import StudentDetailModal from "../components/StudentDetailModal";

const formatPhoneNumber = (phone) => {
  if (!phone) return "";
  const cleaned = ("" + phone).replace(/\D/g, "");
  if (cleaned.length === 12 && cleaned.startsWith("998"))
    return `+998 ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(
      8,
      10
    )} ${cleaned.slice(10, 12)}`;
  else if (cleaned.length === 9)
    return `+998 ${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(
      5,
      7
    )} ${cleaned.slice(7, 9)}`;
  return phone;
};

export default function Groups() {
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentToEdit, setStudentToEdit] = useState(null);

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
      console.error("Xato:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (e, id, name) => {
    e.stopPropagation();
    if (!window.confirm(`${name} o'quvchini o'chirmoqchimisiz?`)) return;
    try {
      await fetch("/api/students", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      fetchData();
    } catch (error) {
      console.error("O'chirishda xato:", error);
    }
  };

  const handleEdit = (e, student) => {
    e.stopPropagation();
    setStudentToEdit(student);
    setIsStudentModalOpen(true);
  };

  const currentMonth = new Date().toISOString().slice(0, 7);
  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone.includes(searchQuery)
  );

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-800">O'quvchilar</h1>
        <button
          onClick={() => {
            setStudentToEdit(null);
            setIsStudentModalOpen(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2"
        >
          <UserPlus size={20} /> Yangi o'quvchi
        </button>
      </div>

      <input
        type="text"
        placeholder="Ism yoki telefon qidiring..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full p-4 mb-6 rounded-xl border focus:border-indigo-500 outline-none shadow-sm"
      />

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="px-6 py-4">O'quvchi</th>
              <th className="px-6 py-4">Holati</th>
              <th className="px-6 py-4 text-right">Amal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {loading ? (
              <tr>
                <td colSpan="3" className="py-10 text-center">
                  <Loader2 className="animate-spin mx-auto text-slate-400" />
                </td>
              </tr>
            ) : (
              filteredStudents.map((s) => {
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
                      <div className="font-bold text-slate-800 text-base">
                        {s.name}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {s.group} • {formatPhoneNumber(s.phone)}
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
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => handleEdit(e, s)}
                          className="p-2 text-blue-500 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, s._id, s.name)}
                          className="p-2 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {isStudentModalOpen && (
        <AddStudentModal
          isOpen={true}
          studentToEdit={studentToEdit}
          onClose={() => {
            setIsStudentModalOpen(false);
            setStudentToEdit(null);
            fetchData();
          }}
        />
      )}

      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          payments={payments}
          onClose={() => setSelectedStudent(null)}
          onRefresh={fetchData}
        />
      )}
    </div>
  );
}
