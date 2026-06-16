import { useState, useEffect } from "react";
import {
  CalendarDays,
  Save,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Search,
  Users,
} from "lucide-react";

export default function Attendance() {
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState(["Matematika", "Ingliz tili"]); // Faqat shu ikkitasi chiqadi
  const [selectedGroup, setSelectedGroup] = useState("Matematika"); // Boshida Matematika turadi
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" });
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/students");
        const data = await res.json();
        if (data && data.success && Array.isArray(data.data)) {
          setStudents(data.data);
        }
      } catch (error) {
        console.error("O'quvchilarni yuklashda xatolik:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  useEffect(() => {
    if (!selectedGroup || !selectedDate) return;
    const fetchAttendance = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/attendance?groupName=${selectedGroup}&date=${selectedDate}`
        );
        const result = await res.json();
        if (
          result &&
          result.success &&
          result.data &&
          Array.isArray(result.data.records)
        ) {
          const mapped = {};
          result.data.records.forEach((r) => {
            mapped[r.studentId] = r.status;
          });
          setAttendanceRecords(mapped);
        } else {
          setAttendanceRecords({});
        }
      } catch (error) {
        console.error("Davomatni yuklashda xatolik:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, [selectedGroup, selectedDate]);

  // FILTR QISMI O'ZGARTIRILDI
  const currentGroupStudents = students.filter(
    (s) =>
      s.group.includes(selectedGroup) && // Endi aynan teng emas, ichida borligini tekshiradi (ikkala guruhga ham boradi degani)
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const markAllPresent = () => {
    const newRecords = { ...attendanceRecords };
    currentGroupStudents.forEach((s) => {
      newRecords[s._id] = "keldi";
    });
    setAttendanceRecords(newRecords);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        groupName: selectedGroup,
        date: selectedDate,
        adminName: localStorage.getItem("username") || "Admin",
        records: currentGroupStudents.map((s) => ({
          // Endi faqat ekranda chiqib turganlarini saqlaydi
          studentId: s._id,
          studentName: s.name,
          status: attendanceRecords[s._id] || "kelmadi",
        })),
      };
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) setStatus({ type: "success", text: "Davomat saqlandi!" });
    } catch (error) {
      setStatus({ type: "error", text: "Xatolik yuz berdi." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto pb-24">
      {/* Yuqori panel */}
      <div className="bg-white p-4 rounded-2xl border mb-6 shadow-sm space-y-4">
        <div className="flex flex-wrap gap-4">
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="p-3 border rounded-xl font-bold bg-slate-50 flex-1 cursor-pointer"
          >
            {groups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="p-3 border rounded-xl font-bold bg-slate-50 cursor-pointer"
          />
          <button
            onClick={markAllPresent}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold transition-colors"
          >
            Hammasi Keldi
          </button>
        </div>

        <div className="relative">
          <Search
            className="absolute left-4 top-3.5 text-slate-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Ism bo'yicha qidirish..."
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 p-3 border rounded-xl bg-slate-50 focus:border-indigo-500 outline-none"
          />
        </div>
      </div>

      {/* Ro'yxat */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        {currentGroupStudents.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-medium">
            Bu guruhda o'quvchilar yo'q.
          </div>
        ) : (
          currentGroupStudents.map((s) => (
            <div
              key={s._id}
              className="p-4 border-b flex justify-between items-center hover:bg-slate-50 transition-colors"
            >
              <span className="font-bold text-slate-700">{s.name}</span>
              <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                <button
                  onClick={() =>
                    setAttendanceRecords({
                      ...attendanceRecords,
                      [s._id]: "keldi",
                    })
                  }
                  className={`px-6 py-2 rounded-lg font-bold transition-all ${
                    attendanceRecords[s._id] === "keldi"
                      ? "bg-emerald-500 text-white shadow-sm"
                      : "text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  Keldi
                </button>
                <button
                  onClick={() =>
                    setAttendanceRecords({
                      ...attendanceRecords,
                      [s._id]: "kelmadi",
                    })
                  }
                  className={`px-6 py-2 rounded-lg font-bold transition-all ${
                    attendanceRecords[s._id] === "kelmadi"
                      ? "bg-rose-500 text-white shadow-sm"
                      : "text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  Kelmadi
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pastki qismdagi Fixed tugma */}
      <div className="fixed bottom-6 right-6 flex items-center gap-3">
        {status.text && (
          <div
            className={`px-4 py-2 rounded-xl font-bold text-sm shadow-sm animate-in fade-in slide-in-from-right-4 ${
              status.type === "success"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-rose-100 text-rose-700"
            }`}
          >
            {status.text}
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-indigo-600 text-white p-4 rounded-full shadow-xl hover:scale-105 hover:bg-indigo-700 hover:shadow-2xl hover:shadow-indigo-500/30 transition-all disabled:opacity-70 disabled:hover:scale-100"
        >
          {saving ? (
            <Loader2 className="animate-spin" size={28} />
          ) : (
            <Save size={28} />
          )}
        </button>
      </div>
    </div>
  );
}
