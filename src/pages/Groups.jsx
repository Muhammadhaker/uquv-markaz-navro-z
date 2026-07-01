import { useState, useEffect } from "react";
import { Search, Loader2, UserPlus, Pencil, Trash2, Filter, CalendarDays, Users, X, Wallet, ShieldAlert } from "lucide-react";
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

const calculateCycles = (addedAtStr) => {
  if (!addedAtStr) return 1;
  const added = new Date(addedAtStr);
  if (isNaN(added.getTime())) return 1;
  
  const today = new Date();
  let m = (today.getFullYear() - added.getFullYear()) * 12 + today.getMonth() - added.getMonth();
  
  if (today.getDate() < added.getDate()) {
    m--;
  }
  return Math.max(1, m + 1);
};

export default function Groups() {
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilterGroup, setSelectedFilterGroup] = useState("Barchasi");
  
  // 🔥 YANGI: To'lov holati bo'yicha filtr
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState("Barchasi");

  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentToEdit, setStudentToEdit] = useState(null);

  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    "x-user-role": localStorage.getItem("userRole") || "",
    "x-user-id": localStorage.getItem("userId") || "",
    "x-parent-id": localStorage.getItem("parentTeacherId") || ""
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sRes, pRes] = await Promise.all([
        fetch("/api/students", { headers: getAuthHeaders() }),
        fetch("/api/payments", { headers: getAuthHeaders() }),
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
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: s._id }),
      });

      const adminName = localStorage.getItem("username") || "Noma'lum Admin";
      await fetch("/api/logs", {
        method: "POST",
        headers: getAuthHeaders(),
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

  const getStudentGroupPrice = (student, groupName) => {
    if (student.groupsData && Array.isArray(student.groupsData)) {
      const found = student.groupsData.find(g => g.name?.trim().toLowerCase() === groupName?.trim().toLowerCase());
      if (found && found.price !== undefined) return Number(found.price);
    }
    return 300000;
  };

  const allGroups = students.flatMap(s => 
    s.group ? s.group.split(',').map(g => g.trim()) : []
  );
  const uniqueGroups = ["Barchasi", ...new Set(allGroups)].filter(Boolean);

  // 🔥 1-QADAM: Har bir o'quvchining joriy to'lov holatini hisoblab chiqamiz
  const studentsWithStatus = students.map((s) => {
    const studentGroups = s.group ? s.group.split(',').map(g => g.trim()).filter(Boolean) : [];
    const activeCycles = calculateCycles(s.addedAt);
    
    let EXPECTED_TOTAL = 0;
    studentGroups.forEach(g => { EXPECTED_TOTAL += getStudentGroupPrice(s, g) * activeCycles; });
    if (studentGroups.length === 0) EXPECTED_TOTAL = 300000 * activeCycles;

    const studentPaymentsAllTime = payments.filter((p) => p.studentId === s._id);
    let totalPaid = 0;
    studentPaymentsAllTime.forEach(p => { totalPaid += Number(p.amount) || 0; });

    const qarz = EXPECTED_TOTAL - totalPaid;
    
    // Istisno holatini aniqlash (Joriy oy uchun)
    const today = new Date();
    let year = today.getFullYear();
    let month = today.getMonth() + 1;
    if (today.getDate() <= 5) { month -= 1; if (month === 0) { month = 12; year -= 1; } }
    const targetMonth = `${year}-${String(month).padStart(2, "0")}`;
    
    const isExcepted = s.exceptionMonths && s.exceptionMonths.includes(targetMonth);
    
    let payStatus = "unpaid"; // qarz
    if (isExcepted) payStatus = "excepted";
    else if (qarz <= 0) payStatus = "paid";

    return { ...s, qarz, EXPECTED_TOTAL, totalPaid, payStatus, isPartial: totalPaid > 0 && qarz > 0 };
  });

  // 🔥 2-QADAM: Guruh va Qidiruv bo'yicha birlamchi filtrlash
  const baseFilteredStudents = studentsWithStatus.filter((s) => {
    const studentGroups = s.group ? s.group.split(',').map(g => g.trim()) : [];
    const matchesGroup = selectedFilterGroup === "Barchasi" || studentGroups.includes(selectedFilterGroup);
    
    const lowerQuery = searchQuery.toLowerCase();
    const matchesSearch = s.name.toLowerCase().includes(lowerQuery) || (s.phone && s.phone.includes(searchQuery));
    
    return matchesGroup && matchesSearch;
  });

  // 🔥 3-QADAM: To'lov statistikasini hisoblash (Tanlangan guruh ichida)
  const paidCount = baseFilteredStudents.filter(s => s.payStatus === "paid").length;
  const unpaidCount = baseFilteredStudents.filter(s => s.payStatus === "unpaid").length;
  const exceptedCount = baseFilteredStudents.filter(s => s.payStatus === "excepted").length;

  // 🔥 4-QADAM: To'lov holati bo'yicha yakuniy filtrlash
  const finalFilteredStudents = baseFilteredStudents.filter(s => {
    if (selectedPaymentFilter === "Barchasi") return true;
    return s.payStatus === selectedPaymentFilter;
  });

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-800">O'quvchilar jadvali</h1>
        <button
          onClick={() => {
            setStudentToEdit(null);
            setIsStudentModalOpen(true);
          }}
          className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-md"
        >
          <UserPlus size={20} /> Yangi o'quvchi
        </button>
      </div>

      {!loading && students.length > 0 && (
        <div className="flex gap-4 mb-6 overflow-x-auto pb-2 custom-scrollbar">
          <div className="min-w-[150px] bg-indigo-600 text-white p-4 rounded-2xl shadow-sm flex-shrink-0 relative overflow-hidden">
            <Users className="absolute -right-2 -bottom-2 text-indigo-500 opacity-50" size={64} />
            <div className="text-indigo-200 text-[10px] font-bold uppercase tracking-wider mb-1 relative z-10">Jami O'quvchilar</div>
            <div className="text-3xl font-black relative z-10">{students.length} <span className="text-sm font-medium opacity-80">ta</span></div>
          </div>

          {uniqueGroups.filter(g => g !== "Barchasi").map(group => {
            const count = students.filter(s => {
              const sGroups = s.group ? s.group.split(',').map(g => g.trim()) : [];
              return sGroups.includes(group);
            }).length;

            return (
              <div key={group} className="min-w-[140px] bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex-shrink-0">
                <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1 truncate" title={group}>
                  {group}
                </div>
                <div className="text-2xl font-black text-slate-700">{count} <span className="text-xs font-medium text-slate-400">ta</span></div>
              </div>
            );
          })}
        </div>
      )}

      {/* 🔥 QIDIRUV VA IKKITA FILTR BLOKI */}
      <div className="flex flex-col lg:flex-row gap-3 mb-6 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        
        {/* Qidiruv (X tugmasi bilan) */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Ism yoki telefon qidiring..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-10 py-3.5 rounded-xl border focus:border-indigo-500 outline-none transition-all bg-slate-50 font-medium"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")} 
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Guruhlar filtri */}
        <div className="relative lg:w-56">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={20} />
          <select
            value={selectedFilterGroup}
            onChange={(e) => setSelectedFilterGroup(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none appearance-none bg-slate-50 text-slate-700 font-bold cursor-pointer transition-all"
          >
            {uniqueGroups.map((group) => (
              <option key={group} value={group}>{group}</option>
            ))}
          </select>
        </div>

        {/* 🔥 YANGI: To'lov holati filtri va Statistika */}
        <div className="relative lg:w-64">
          <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={20} />
          <select
            value={selectedPaymentFilter}
            onChange={(e) => setSelectedPaymentFilter(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-emerald-200 focus:border-emerald-500 outline-none appearance-none bg-emerald-50/30 text-emerald-900 font-bold cursor-pointer transition-all"
          >
            <option value="Barchasi">💰 Barcha to'lov holati</option>
            <option value="paid">✅ To'laganlar ({paidCount} ta)</option>
            <option value="unpaid">❌ Qarzdorlar ({unpaidCount} ta)</option>
            <option value="excepted">🛡️ Istisnolar ({exceptedCount} ta)</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="py-10 text-center">
            <Loader2 className="animate-spin mx-auto text-slate-400" />
          </div>
        ) : finalFilteredStudents.length === 0 ? (
          <div className="py-10 text-center text-slate-500 font-medium">
            {searchQuery || selectedFilterGroup !== "Barchasi" || selectedPaymentFilter !== "Barchasi" 
              ? "Filtr bo'yicha o'quvchi topilmadi." 
              : "O'quvchilar yo'q."}
          </div>
        ) : (
          finalFilteredStudents.map((s, index) => { // 🔥 TARTIB RAQAM UCHUN INDEX QO'SHILDI
            return (
              <div
                key={s._id}
                onClick={() => setSelectedStudent(s)}
                className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col sm:flex-row justify-between sm:items-center hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer gap-3"
              >
                <div className="flex items-start sm:items-center gap-3">
                  
                  {/* 🔥 TARTIB RAQAM KUBIGI */}
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 font-black rounded-xl flex items-center justify-center flex-shrink-0 border border-indigo-100 shadow-sm mt-1 sm:mt-0">
                    {index + 1}
                  </div>

                  <div>
                    <div className="font-bold text-slate-800 text-lg">
                      {s.name}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {s.group} • {formatPhoneNumber(s.phone)}
                    </div>
                    
                    <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1 mt-1">
                      <CalendarDays size={12} />
                      Ro'yxat: {formatDate(s.addedAt)} ({calculateCycles(s.addedAt)} oylik)
                    </div>

                    <div
                      className={`text-[11px] font-bold mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-md ${
                        s.payStatus === "paid" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : 
                        s.payStatus === "excepted" ? "bg-amber-50 text-amber-600 border border-amber-100" :
                        s.isPartial ? "bg-orange-50 text-orange-600 border border-orange-100" : 
                        "bg-rose-50 text-rose-600 border border-rose-100"
                      }`}
                    >
                      {s.payStatus === "paid" ? "✅ To'liq to'langan" : 
                       s.payStatus === "excepted" ? <><ShieldAlert size={12}/> Istisno (Ruxsat berilgan)</> :
                       `❌ Qarz: ${s.qarz.toLocaleString()} so'm`}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-1 justify-end">
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

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div> 
  );
}