import { useState, useEffect } from "react";
import { CalendarClock, Plus, Trash2, Loader2, X, Send, Clock } from "lucide-react";

const WEEKDAYS = ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba", "Yakshanba"];

export default function Schedule() {
  const [schedules, setSchedules] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [selectedGroup, setSelectedGroup] = useState("");
  const [days, setDays] = useState([{ day: "Dushanba", startTime: "14:00", endTime: "16:00", room: "" }]);
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
      const [schedRes, studRes] = await Promise.all([
        fetch("/api/students?resource=schedule", { headers: getAuthHeaders() }),
        fetch("/api/students", { headers: getAuthHeaders() })
      ]);
      const schedData = await schedRes.json();
      const studData = await studRes.json();

      if (schedData.success) setSchedules(schedData.data);

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

  const addDayRow = () => setDays([...days, { day: "Dushanba", startTime: "14:00", endTime: "16:00", room: "" }]);
  const removeDayRow = (idx) => setDays(days.filter((_, i) => i !== idx));
  const updateDayRow = (idx, field, value) => {
    const updated = [...days];
    updated[idx][field] = value;
    setDays(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!selectedGroup) {
      setError("Guruhni tanlang!");
      return;
    }
    if (days.length === 0) {
      setError("Kamida bitta kun qo'shing!");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/students?resource=schedule", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ groupName: selectedGroup, days, notifyStudents })
      });
      const data = await res.json();

      if (data.success) {
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
    if (!window.confirm("Bu jadvalni o'chirmoqchimisiz?")) return;
    try {
      await fetch(`/api/students?resource=schedule&id=${id}`, { method: "DELETE", headers: getAuthHeaders() });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto pb-20">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dars Jadvali</h1>
          <p className="text-slate-500 text-sm">Guruhlar bo'yicha dars jadvalini boshqarish</p>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 shadow-sm"
        >
          <Plus size={18} /> Jadval qo'shish
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-slate-400" size={32} /></div>
      ) : schedules.length === 0 ? (
        <div className="bg-white rounded-2xl border p-10 text-center text-slate-400 font-medium">
          Hozircha hech qanday jadval kiritilmagan
        </div>
      ) : (
        <div className="space-y-4">
          {schedules.map((s) => (
            <div key={s._id} className="bg-white rounded-2xl border shadow-sm p-5">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                  <CalendarClock size={20} className="text-indigo-500" /> {s.groupName}
                </h3>
                <button onClick={() => handleDelete(s._id)} className="text-rose-500 p-2 hover:bg-rose-50 rounded-lg">
                  <Trash2 size={18} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {s.days.map((d, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl text-sm">
                    <Clock size={16} className="text-slate-400" />
                    <span className="font-bold text-slate-700">{d.day}:</span>
                    <span className="text-slate-600">{d.startTime}–{d.endTime}</span>
                    {d.room && <span className="text-slate-400">({d.room})</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-[60] p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold text-xl text-slate-800">Jadval qo'shish</h2>
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

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Dars kunlari</label>
                {days.map((d, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded-xl">
                    <select
                      className="border p-2 rounded-lg text-sm bg-white flex-1"
                      value={d.day}
                      onChange={(e) => updateDayRow(idx, 'day', e.target.value)}
                    >
                      {WEEKDAYS.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                    <input type="time" className="border p-2 rounded-lg text-sm bg-white w-24" value={d.startTime} onChange={(e) => updateDayRow(idx, 'startTime', e.target.value)} />
                    <input type="time" className="border p-2 rounded-lg text-sm bg-white w-24" value={d.endTime} onChange={(e) => updateDayRow(idx, 'endTime', e.target.value)} />
                    {days.length > 1 && (
                      <button type="button" onClick={() => removeDayRow(idx)} className="text-rose-500 p-1">
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addDayRow} className="text-indigo-600 text-sm font-bold flex items-center gap-1">
                  <Plus size={14} /> Kun qo'shish
                </button>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={notifyStudents} onChange={(e) => setNotifyStudents(e.target.checked)} className="w-4 h-4" />
                <span className="text-sm font-medium text-slate-700 flex items-center gap-1">
                  <Send size={14} /> Ota-onalarga Telegram orqali xabar berish
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