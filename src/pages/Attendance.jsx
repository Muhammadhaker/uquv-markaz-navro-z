import { useState, useEffect } from "react";
import { Save, Loader2, Search, QrCode } from "lucide-react";
import AttendanceScanner from "../components/AttendanceScanner";

export default function Attendance() {
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]); 
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/students");
        const data = await res.json();
        if (data && data.success && Array.isArray(data.data)) {
          setStudents(data.data);
          const allIndividualGroups = data.data.flatMap((s) => s.group ? s.group.split(",").map((g) => g.trim()) : []);
          const uniqueGroups = [...new Set(allIndividualGroups)].filter(Boolean);
          
          setGroups(uniqueGroups);
          if (uniqueGroups.length > 0) setSelectedGroup(uniqueGroups[0]);
        }
      } catch (error) {
        console.error("Xatolik:", error);
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
        const res = await fetch(`/api/attendance?groupName=${selectedGroup}&date=${selectedDate}`);
        const result = await res.json();
        if (result?.success && Array.isArray(result.data?.records)) {
          const mapped = {};
          result.data.records.forEach((r) => { mapped[r.studentId] = r.status; });
          setAttendanceRecords(mapped);
        } else {
          setAttendanceRecords({});
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, [selectedGroup, selectedDate]);

  const currentGroupStudents = students.filter((s) => {
    if (!selectedGroup) return false;
    const studentGroups = s.group ? s.group.split(",").map((g) => g.trim()) : [];
    const matchesGroup = studentGroups.includes(selectedGroup);
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesGroup && matchesSearch;
  });

  const markAllPresent = () => {
    const newRecords = { ...attendanceRecords };
    currentGroupStudents.forEach((s) => { newRecords[s._id] = "keldi"; });
    setAttendanceRecords(newRecords);
  };

  // 🔥 QR SKANERDAN KELADIGAN SIGNAL UCHUN FUNKSIYA
  const handleScan = (scannedId) => {
    setAttendanceRecords((prev) => {
      // Agar avval 'kelmadi' deb saqlangan bo'lsa, 'kechikdi' deb o'zgartiramiz, aks holda 'keldi'
      const isAbsent = prev[scannedId] === "kelmadi";
      return {
        ...prev,
        [scannedId]: isAbsent ? "kechikdi" : "keldi"
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        groupName: selectedGroup,
        date: selectedDate,
        adminName: localStorage.getItem("username") || "Admin",
        records: currentGroupStudents.map((s) => ({
          studentId: s._id,
          studentName: s.name,
          // 🔥 Hech narsa belgilanmagan va skanerlanmaganlar avtomatik "kelmadi" ga aylanadi
          status: attendanceRecords[s._id] || "kelmadi", 
        })),
      };
      
      // Mahalliy holatni ham birdaniga to'liq yangilab qo'yamiz (Kelmadi bo'lib qolganlarni ekranda qizartirish uchun)
      const updatedLocalRecords = {};
      payload.records.forEach(r => { updatedLocalRecords[r.studentId] = r.status; });
      setAttendanceRecords(updatedLocalRecords);

      const res = await fetch("/api/attendance", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (res.ok) setStatus({ type: "success", text: "Davomat saqlandi!" });
      setTimeout(() => setStatus({ type: "", text: "" }), 3000);
    } catch (error) {
      setStatus({ type: "error", text: "Xatolik yuz berdi." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto pb-24">
      
      {/* 🔥 QR SKANER TUGMASI VA OYNASI */}
      <div className="mb-6">
        <button 
          onClick={() => setShowScanner(!showScanner)}
          className={`w-full p-4 rounded-2xl shadow-sm border font-bold flex items-center justify-center gap-2 transition-all ${
            showScanner ? "bg-slate-800 text-white border-slate-800" : "bg-white text-indigo-600 border-indigo-100 hover:bg-indigo-50"
          }`}
        >
          <QrCode size={20} />
          {showScanner ? "Kamerani yopish" : "QR-Kod orqali davomat olish"}
        </button>

        {showScanner && (
          <div className="mt-4 animate-in fade-in slide-in-from-top-4 duration-300">
            {/* 🔥 onScan props orqali natijani qabul qilamiz */}
            <AttendanceScanner onScan={handleScan} />
          </div>
        )}
      </div>

      <div className="bg-white p-4 rounded-2xl border mb-6 shadow-sm space-y-4">
        <div className="flex flex-wrap gap-4">
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="p-3 border rounded-xl font-bold bg-slate-50 flex-1 cursor-pointer outline-none focus:border-indigo-500"
          >
            {groups.map((g) => (<option key={g} value={g}>{g}</option>))}
          </select>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="p-3 border rounded-xl font-bold bg-slate-50 cursor-pointer outline-none"
          />
          <button
            onClick={markAllPresent}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold transition-colors"
          >
            Hammasi Keldi
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Ism bo'yicha qidirish..."
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 p-3 border rounded-xl bg-slate-50 focus:border-indigo-500 outline-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        {currentGroupStudents.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-medium">Tanlangan guruhda o'quvchi topilmadi.</div>
        ) : (
          currentGroupStudents.map((s) => (
            <div key={s._id} className="p-4 border-b flex flex-col sm:flex-row justify-between sm:items-center gap-3 hover:bg-slate-50 transition-colors">
              <span className="font-bold text-slate-700">{s.name}</span>
              
              {/* 🔥 UCHTA TUGMA QILINDI: KELDI, KECHIKDI, KELMADI */}
              <div className="flex bg-slate-100 p-1 rounded-xl gap-1 w-full sm:w-auto">
                <button
                  onClick={() => setAttendanceRecords({...attendanceRecords, [s._id]: "keldi"})}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-bold text-sm transition-all ${attendanceRecords[s._id] === "keldi" ? "bg-emerald-500 text-white shadow-sm" : "text-slate-500 hover:bg-slate-200"}`}
                >
                  Keldi
                </button>
                <button
                  onClick={() => setAttendanceRecords({...attendanceRecords, [s._id]: "kechikdi"})}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-bold text-sm transition-all ${attendanceRecords[s._id] === "kechikdi" ? "bg-amber-500 text-white shadow-sm" : "text-slate-500 hover:bg-slate-200"}`}
                >
                  Kechikdi
                </button>
                <button
                  onClick={() => setAttendanceRecords({...attendanceRecords, [s._id]: "kelmadi"})}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-bold text-sm transition-all ${attendanceRecords[s._id] === "kelmadi" ? "bg-rose-500 text-white shadow-sm" : "text-slate-500 hover:bg-slate-200"}`}
                >
                  Kelmadi
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="fixed bottom-6 right-6 flex items-center gap-3 z-40">
        {status.text && (
          <div className={`px-4 py-2 rounded-xl font-bold text-sm shadow-sm ${status.type === "success" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
            {status.text}
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-indigo-600 text-white p-4 rounded-full shadow-xl hover:scale-105 hover:bg-indigo-700 transition-all"
        >
          {saving ? <Loader2 className="animate-spin" size={28} /> : <Save size={28} />}
        </button>
      </div>
    </div>
  );
}