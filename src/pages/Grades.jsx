import { useState, useEffect } from "react";
import { GraduationCap, Plus, Trash2, Loader2, X, Send, Search } from "lucide-react";

export default function Grades() {
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [score, setScore] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  const [comment, setComment] = useState("");
  const [notifyParent, setNotifyParent] = useState(true);

  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    "x-user-role": localStorage.getItem("userRole") || "",
    "x-user-id": localStorage.getItem("userId") || "",
    "x-parent-id": localStorage.getItem("parentTeacherId") || ""
  });

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/students", { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) {
        setStudents(data.data);
        const allGroups = data.data.flatMap(s => s.group ? s.group.split(',').map(g => g.trim()) : []);
        const unique = [...new Set(allGroups)].filter(Boolean);
        setGroups(unique);
        if (unique.length > 0) setSelectedGroup(unique[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGrades = async (groupName) => {
    if (!groupName) return;
    try {
      const res = await fetch(`/api/students?resource=grade&groupName=${encodeURIComponent(groupName)}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setGrades(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchStudents(); }, []);
  useEffect(() => { if (selectedGroup) fetchGrades(selectedGroup); }, [selectedGroup]);

  const currentGroupStudents = students.filter(s => {
    const studentGroups = s.group ? s.group.split(',').map(g => g.trim()) : [];
    return studentGroups.includes(selectedGroup) && s.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getStudentGrades = (studentId) => grades.filter(g => g.studentId === studentId);

  const openGradeModal = (student) => {
    setSelectedStudent(student);
    setScore("");
    setMaxScore("100");
    setComment("");
    setError("");
    setIsOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (score === "" || Number(score) < 0) {
      setError("To'g'ri baho kiriting!");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/students?resource=grade", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          studentId: selectedStudent._id,
          groupName: selectedGroup,
          score: Number(score),
          maxScore: Number(maxScore) || 100,
          comment: comment.trim(),
          notifyParent
        })
      });
      const data = await res.json();

      if (data.success) {
        setIsOpen(false);
        fetchGrades(selectedGroup);
      } else {
        setError(data.message || "Xatolik yuz berdi");
      }
    } catch (err) {
      setError("Server bilan bog'lanishda xato!");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGrade = async (id) => {
    if (!window.confirm("Bu bahoni o'chirmoqchimisiz?")) return;
    try {
      await fetch(`/api/students?resource=grade&id=${id}`, { method: "DELETE", headers: getAuthHeaders() });
      fetchGrades(selectedGroup);
    } catch (err) {
      console.error(err);
    }
  };

  const scoreColor = (score, max) => {
    const pct = (score / (max || 100)) * 100;
    if (pct >= 80) return "text-emerald-600 bg-emerald-50";
    if (pct >= 50) return "text-amber-600 bg-amber-50";
    return "text-rose-600 bg-rose-50";
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto pb-20">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Baholar</h1>
        <p className="text-slate-500 text-sm">O'quvchilarga baho qo'yish va ko'rish</p>
      </div>

      <div className="bg-white p-4 rounded-2xl border mb-6 shadow-sm flex flex-col sm:flex-row gap-3">
        <select
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          className="p-3 border rounded-xl font-bold bg-slate-50 flex-1 outline-none focus:border-indigo-500"
        >
          {groups.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Ism bo'yicha qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 border rounded-xl bg-slate-50 outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-slate-400" size={32} /></div>
      ) : currentGroupStudents.length === 0 ? (
        <div className="bg-white rounded-2xl border p-10 text-center text-slate-400 font-medium">
          Bu guruhda o'quvchi topilmadi
        </div>
      ) : (
        <div className="space-y-3">
          {currentGroupStudents.map((s) => {
            const studentGrades = getStudentGrades(s._id);
            return (
              <div key={s._id} className="bg-white rounded-2xl border shadow-sm p-5">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <GraduationCap size={18} className="text-indigo-500" /> {s.name}
                  </h3>
                  <button
                    onClick={() => openGradeModal(s)}
                    className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center gap-1"
                  >
                    <Plus size={14} /> Baho qo'yish
                  </button>
                </div>
                {studentGrades.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {studentGrades.map((g) => (
                      <div key={g._id} className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 ${scoreColor(g.score, g.maxScore)}`}>
                        {g.score}/{g.maxScore}
                        {g.comment && <span className="text-xs font-normal opacity-70">— {g.comment}</span>}
                        <button onClick={() => handleDeleteGrade(g._id)} className="hover:opacity-60">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Hali baho qo'yilmagan</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isOpen && selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-[60] p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold text-xl text-slate-800">{selectedStudent.name}ga baho</h2>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-sm font-medium">{error}</div>}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Baho</label>
                  <input
                    type="number"
                    required
                    min="0"
                    className="w-full border-2 border-indigo-200 p-3 rounded-xl font-black text-lg text-center outline-none focus:border-indigo-500 bg-indigo-50/30"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Maksimal</label>
                  <input
                    type="number"
                    className="w-full border p-3 rounded-xl font-bold text-lg text-center outline-none focus:border-indigo-500 bg-slate-50"
                    value={maxScore}
                    onChange={(e) => setMaxScore(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Izoh (ixtiyoriy)</label>
                <input
                  placeholder="Masalan: A'lo bajardi"
                  className="w-full border p-3 rounded-xl outline-none focus:border-indigo-500 bg-slate-50"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={notifyParent} onChange={(e) => setNotifyParent(e.target.checked)} className="w-4 h-4" />
                <span className="text-sm font-medium text-slate-700 flex items-center gap-1">
                  <Send size={14} /> Ota-onaga Telegram orqali xabar berish
                </span>
              </label>

              <button type="submit" disabled={submitting} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 flex justify-center">
                {submitting ? <Loader2 className="animate-spin" size={24} /> : "Saqlash"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}