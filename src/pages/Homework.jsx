import { useState, useEffect } from "react";
import { BookOpenCheck, Plus, Trash2, Loader2, X, Send, Calendar } from "lucide-react";

export default function Homework() {
  const [homeworks, setHomeworks] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [selectedGroup, setSelectedGroup] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [notifyStudents, setNotifyStudents] = useState(true);

  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    "x-user-role": localStorage.getItem("userRole") || "",
    "x-user-id": localStorage.getItem("userId") || "",
    "x-parent-id": localStorage.getItem("parentTeacherId") || ""
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [hwRes, studRes] = await Promise.all([
        fetch("/api/students?resource=homework", { headers: getAuthHeaders() }),
        fetch("/api/students", { headers: getAuthHeaders() })
      ]);
      const hwData = await hwRes.json();
      const studData = await studRes.json();

      if (hwData.success) setHomeworks(hwData.data);

      if (studData.success) {
        const allGroups = studData.data.flatMap(s => s.group ? s.group.split(',').map(g => g.trim()) : []);
        const unique = [...new Set(allGroups)].filter(Boolean);
        setGroups(unique);
        if (unique.length > 0 && !selectedGroup) setSelectedGroup(unique[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!selectedGroup) return setError("Guruhni tanlang!");
    if (!title.trim()) return setError("Mavzuni kiriting!");
    if (!dueDate) return setError("Topshirish muddatini tanlang!");

    setSubmitting(true);
    try {
      const res = await fetch("/api/students?resource=homework", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          groupName: selectedGroup,
          title: title.trim(),
          description: description.trim(),
          dueDate,
          notifyStudents
        })
      });
      const data = await res.json();

      if (data.success) {
        setTitle("");
        setDescription("");
        setIsOpen(false);
        fetchData();
      } else {
        setError(data.message || "Xatolik yuz berdi");
      }
    } catch (err) {
      setError("Server bilan bog'lanishda xato!");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bu uy vazifasini o'chirmoqchimisiz?")) return;
    try {
      await fetch(`/api/students?resource=homework&id=${id}`, { method: "DELETE", headers: getAuthHeaders() });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const formatDate = (d) => {
    if (!d) return "";
    const [y, m, day] = d.split("-");
    return `${day}.${m}.${y}`;
  };

  const isOverdue = (d) => new Date(d) < new Date(new Date().toISOString().split("T")[0]);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto pb-20">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Uy Vazifalari</h1>
          <p className="text-slate-500 text-sm">Guruhlarga uy vazifasi berish va kuzatish</p>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 shadow-sm"
        >
          <Plus size={18} /> Vazifa berish
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-slate-400" size={32} /></div>
      ) : homeworks.length === 0 ? (
        <div className="bg-white rounded-2xl border p-10 text-center text-slate-400 font-medium">
          Hozircha uy vazifasi berilmagan
        </div>
      ) : (
        <div className="space-y-3">
          {homeworks.map((hw) => (
            <div key={hw._id} className="bg-white rounded-2xl border shadow-sm p-5">
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpenCheck size={18} className="text-indigo-500" />
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{hw.groupName}</span>
                    {isOverdue(hw.dueDate) && (
                      <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">Muddati o'tgan</span>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-800">{hw.title}</h3>
                  {hw.description && <p className="text-sm text-slate-500 mt-1">{hw.description}</p>}
                  <div className="flex items-center gap-1 text-xs text-slate-400 mt-2">
                    <Calendar size={12} /> Muddati: {formatDate(hw.dueDate)}
                  </div>
                </div>
                <button onClick={() => handleDelete(hw._id)} className="text-rose-500 p-2 hover:bg-rose-50 rounded-lg">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-[60] p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold text-xl text-slate-800">Uy vazifasi berish</h2>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-sm font-medium">{error}</div>}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Guruh</label>
                <select
                  className="w-full border p-3 rounded-xl outline-none focus:border-indigo-500 bg-slate-50"
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                >
                  {groups.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Mavzu</label>
                <input
                  required
                  placeholder="Masalan: 3-bob, mashqlar 1-15"
                  className="w-full border p-3 rounded-xl outline-none focus:border-indigo-500 bg-slate-50"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Tavsif (ixtiyoriy)</label>
                <textarea
                  placeholder="Qo'shimcha izoh..."
                  rows={3}
                  className="w-full border p-3 rounded-xl outline-none focus:border-indigo-500 bg-slate-50 resize-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Topshirish muddati</label>
                <input
                  type="date"
                  required
                  className="w-full border p-3 rounded-xl outline-none focus:border-indigo-500 bg-slate-50"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={notifyStudents} onChange={(e) => setNotifyStudents(e.target.checked)} className="w-4 h-4" />
                <span className="text-sm font-medium text-slate-700 flex items-center gap-1">
                  <Send size={14} /> Ota-onalarga Telegram orqali xabar berish
                </span>
              </label>

              <button type="submit" disabled={submitting} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 flex justify-center">
                {submitting ? <Loader2 className="animate-spin" size={24} /> : "Vazifani berish"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}