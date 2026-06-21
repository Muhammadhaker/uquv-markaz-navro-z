import { useState, useEffect } from "react";
import { Search, Loader2, UserPlus, Pencil, Trash2, Filter, CalendarDays } from "lucide-react";
import AddStudentModal from "../components/AddStudentModal";
import StudentDetailModal from "../components/StudentDetailModal";

const formatPhoneNumber = (phone) => {
  if (!phone) return "";
  const cleaned = ("" + phone).replace(/\D/g, "");
  if (cleaned.length === 12 && cleaned.startsWith("998"))
    return `+998 ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8, 10)} ${cleaned.slice(10, 12)}`;
  else if (cleaned.length === 9)
    return `+998 ${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 7)} ${cleaned.slice(7, 9)}`;
  return phone;
};

const formatDate = (dateString) => {
  if (!dateString) return "Sana yo'q";
  const d = new Date(dateString);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
};

export default function Groups() {
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilterGroup, setSelectedFilterGroup] = useState("Barchasi");
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentToEdit, setStudentToEdit] = useState(null);

  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const lastMonthStr = today.getMonth() === 0
    ? `${today.getFullYear() - 1}-12`
    : `${today.getFullYear()}-${String(today.getMonth()).padStart(2, "0")}`;

  const targetMonth = today.getDate() <= 5 ? lastMonthStr : currentMonthStr;

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

  const handleDelete = async (e, s) => {
    e.stopPropagation();
    if (!window.confirm(`${s.name} o'quvchini o'chirmoqchimisiz?`)) return;

    try {
      await fetch("/api/students", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: s._id }),
      });

      const adminName = localStorage.getItem("username") || "Noma'lum Admin";
      await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminName: adminName,
          actionType: "delete",
          details: `O'quvchi o'chirildi: ${s.name} (Fani: ${s.group})`,
          targetApi: "/api/students",
          deletedData: s
        })
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

  const allGroups = students.flatMap(s =>
    s.group ? s.group.split(',').map(g => g.trim()) : []
  );
  const uniqueGroups = ["Barchasi", ...new Set(allGroups)].filter(Boolean);

  const filteredStudents = students.filter((s) => {
    const studentGroups = s.group ? s.group.split(',').map(g => g.trim()) : [];
    const matchesGroup = selectedFilterGroup === "Barchasi" || studentGroups.includes(selectedFilterGroup);

    const lowerQuery = searchQuery.toLowerCase();
    const matchesSearch = s.name.toLowerCase().includes(lowerQuery) || (s.phone && s.phone.includes(searchQuery));
    return matchesGroup && matchesSearch;
  });

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-800">O'quvchilar</h1>
        <button
          onClick={() => {
            setStudentToEdit(null);
            setIsStudentModalOpen(true);
          }}
          className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
        >
          <UserPlus size={20} /> Yangi o'quvchi
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Ism yoki telefon qidiring..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 rounded-xl border focus:border-indigo-500 outline-none shadow-sm transition-all"
          />
        </div>

        <div className="relative sm:w-64">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={20} />
          <select
            value={selectedFilterGroup}
            onChange={(e) => setSelectedFilterGroup(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-indigo-200 focus:border-indigo-500 outline-none shadow-sm appearance-none bg-indigo-50/30 text-indigo-900 font-medium cursor-pointer transition-all"
          >
            {uniqueGroups.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="py-10 text-center">
            <Loader2 className="animate-spin mx-auto text-slate-400" />
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="py-10 text-center text-slate-500">
            {searchQuery || selectedFilterGroup !== "Barchasi" ? "Bunday o'quvchi topilmadi." : "O'quvchilar yo'q."}
          </div>
        ) : (
          filteredStudents.map((s) => {
            // 🔥 YANGI LOGIKA: Nechta fanga borsa, shunchaga ko'paytiriladi
            const studentGroups = s.group ? s.group.split(',').map(g => g.trim()).filter(Boolean) : [];
            const EXPECTED_TOTAL = Math.max(1, studentGroups.length) * 300000;

            const studentPaymentsThisMonth = payments.filter(
              (p) => p.studentId === s._id && p.month === targetMonth
            );

            let totalPaid = 0;
            studentPaymentsThisMonth.forEach(p => {
              totalPaid += Number(p.amount) || 0;
            });

            const qarz = EXPECTED_TOTAL - totalPaid;
            const isPaid = qarz <= 0;
            const isPartial = totalPaid > 0 && qarz > 0;

            return (
              <div
                key={s._id}
                onClick={() => setSelectedStudent(s)}
                className="bg-white p-4 rounded-2xl border shadow-sm flex justify-between items-center hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
              >
                <div>
                  <div className="font-bold text-slate-800 text-lg">
                    {s.name}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {s.group} • {formatPhoneNumber(s.phone)}
                  </div>

                  <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1 mt-1">
                    <CalendarDays size={12} />
                    Ro'yxatdan o'tgan: {formatDate(s.addedAt)}
                  </div>

                  <div
                    className={`text-xs font-bold mt-2 inline-block px-2 py-0.5 rounded-md ${isPaid ? "bg-emerald-50 text-emerald-600" :
                        isPartial ? "bg-orange-50 text-orange-600" :
                          "bg-rose-50 text-rose-600"
                      }`}
                  >
                    {isPaid ? "To'liq to'langan" : qarz > 0 ? `Qarz: ${qarz.toLocaleString()} so'm` : "To'lanmagan"}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={(e) => handleEdit(e, s)}
                    className="p-3 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                  >
                    <Pencil size={20} />
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, s)}
                    className="p-3 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            );
          })
        )}
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