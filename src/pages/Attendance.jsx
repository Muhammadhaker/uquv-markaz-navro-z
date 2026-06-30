import { useState, useEffect, useRef } from "react";
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

  // 🔥 KAMERA TEZLIGIDAN QAT'IY HIMOYA XOTIRASI
  const scanCooldowns = useRef({});

  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/students");
        const data = await res.json();
        if (data && data.success && Array.isArray(data.data)) {
          const sortedStudents = data.data.sort((a, b) => a.name.localeCompare(b.name));
          setStudents(sortedStudents);
          const allIndividualGroups = sortedStudents.flatMap((s) => s.group ? s.group.split(",").map((g) => g.trim()) : []);
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
          result.data.records.forEach((r) => { 
            mapped[r.studentId] = {
              status: r.status,
              arrivalTime: r.arrivalTime,
              leaveTime: r.leaveTime,
              lastScan: r.lastScan || 0
            }; 
          });
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
    const now = Date.now();
    const timeStr = new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
    
    currentGroupStudents.forEach((s) => { 
      if (!newRecords[s._id] || newRecords[s._id].status === "kelmadi") {
        newRecords[s._id] = { status: "keldi", arrivalTime: timeStr, lastScan: now }; 
        scanCooldowns.current[s._id] = now; // Qo'lda qilganda ham xotiraga yozamiz
      }
    });
    setAttendanceRecords(newRecords);
  };

  // 🔥 QR SKANER (YANGILANGAN QAT'IY BLOKROVKA)
  const handleScan = async (scannedId) => {
    const studentObj = students.find(s => s._id === scannedId);
    if (!studentObj) {
      setStatus({ type: "error", text: "Noto'g'ri QR-Kod (O'quvchi topilmadi)" });
      setTimeout(() => setStatus({ type: "", text: "" }), 3000);
      return;
    }

    const now = Date.now();
    const timeStr = new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
    
    // 1-HIMOYA: KAMERA TEZLIGI (React ulgurmasidan oldin qat'iy to'sish)
    const lastTimeRef = scanCooldowns.current[scannedId] || 0;
    if (now - lastTimeRef < 1800000) {
      setStatus({ type: "error", text: "❌ Kamida 30 daqiqa kuting!" });
      setTimeout(() => setStatus({ type: "", text: "" }), 3000);
      return;
    }

    const record = attendanceRecords[scannedId] || { status: "kelmadi", lastScan: 0 };
    
    // 2-HIMOYA: BAZA VA SAHIFA YANGILANISHIDAN KEYINGI HOLAT
    if (record.status !== "kelmadi" && (now - (record.lastScan || 0) < 1800000)) {
      scanCooldowns.current[scannedId] = record.lastScan || now;
      setStatus({ type: "error", text: "❌ Kamida 30 daqiqa kuting!" });
      setTimeout(() => setStatus({ type: "", text: "" }), 3000);
      return; 
    }

    // Tizim barcha qulfdan o'tkazdi -> Srazu yana xotiraga qulflaymiz (dubl bo'lmasligi uchun)
    scanCooldowns.current[scannedId] = now;

    let newStatus = "keldi";
    let arrTime = record.arrivalTime;
    let levTime = record.leaveTime;

    if (record.status === "kelmadi") {
      newStatus = "keldi";
      arrTime = timeStr; 
    } else if (record.status === "keldi" || record.status === "kechikdi") {
      newStatus = "ketdi";
      levTime = timeStr; 
    } else if (record.status === "ketdi") {
      setStatus({ type: "error", text: "Bu o'quvchi allaqachon ketgan!" });
      setTimeout(() => setStatus({ type: "", text: "" }), 3000);
      return;
    }

    const updatedRecord = {
      status: newStatus,
      arrivalTime: arrTime,
      leaveTime: levTime,
      lastScan: now
    };

    setAttendanceRecords(prev => ({ ...prev, [scannedId]: updatedRecord }));
    setStatus({ type: "success", text: `✅ Qabul qilindi: ${newStatus.toUpperCase()} (${timeStr})` });
    setTimeout(() => setStatus({ type: "", text: "" }), 3000);

    // ORQA FONDA XABAR JO'NATISH
    try {
      await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupName: selectedGroup,
          date: selectedDate,
          adminName: localStorage.getItem("username") || "Admin",
          isScan: true,
          scannedRecord: {
            studentId: scannedId,
            studentName: studentObj.name,
            ...updatedRecord
          }
        })
      });
    } catch (err) {
      console.error("Instant scan xatosi:", err);
    }
  };

  const handleManualStatus = (studentId, newStatus) => {
    const now = Date.now();
    const timeStr = new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
    
    scanCooldowns.current[studentId] = now;

    setAttendanceRecords((prev) => {
      const current = prev[studentId] || {};
      return {
        ...prev,
        [studentId]: {
          ...current,
          status: newStatus,
          arrivalTime: (newStatus === 'keldi' || newStatus === 'kechikdi') ? (current.arrivalTime || timeStr) : current.arrivalTime,
          leaveTime: newStatus === 'ketdi' ? (current.leaveTime || timeStr) : current.leaveTime,
          lastScan: now
        }
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
        records: currentGroupStudents.map((s) => {
          const rec = attendanceRecords[s._id] || {};
          return {
            studentId: s._id,
            studentName: s.name,
            status: rec.status || "kelmadi", 
            arrivalTime: rec.arrivalTime || null,
            leaveTime: rec.leaveTime || null,
            lastScan: rec.lastScan || null
          };
        }),
      };
      
      const updatedLocalRecords = {};
      payload.records.forEach(r => { updatedLocalRecords[r.studentId] = r; });
      setAttendanceRecords(updatedLocalRecords);

      const res = await fetch("/api/attendance", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (res.ok) setStatus({ type: "success", text: "Davomat saqlandi!" });
      setTimeout(() => setStatus({ type: "", text: "" }), 3000);
    } catch (error) {
      setStatus({ type: "error", text: "Xatolik yuz berdi." });
      setTimeout(() => setStatus({ type: "", text: "" }), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto pb-24">
      
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
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold transition-colors w-full sm:w-auto"
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
          currentGroupStudents.map((s) => {
            const rec = attendanceRecords[s._id] || {};
            const currentStatus = rec.status || "kelmadi";
            
            return (
              <div key={s._id} className="p-4 border-b flex flex-col md:flex-row justify-between md:items-center gap-3 hover:bg-slate-50 transition-colors">
                <div>
                  <div className="font-bold text-slate-700 text-lg">{s.name}</div>
                  <div className="text-xs text-slate-400 flex gap-3 mt-1">
                    {rec.arrivalTime && <span>Keldi: {rec.arrivalTime}</span>}
                    {rec.leaveTime && <span className="text-rose-500">Ketdi: {rec.leaveTime}</span>}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 lg:flex bg-slate-100 p-1 rounded-xl gap-1 w-full md:w-auto">
                  <button
                    onClick={() => handleManualStatus(s._id, "keldi")}
                    className={`px-3 py-2 rounded-lg font-bold text-sm transition-all ${currentStatus === "keldi" ? "bg-emerald-500 text-white shadow-sm" : "text-slate-500 hover:bg-slate-200"}`}
                  >
                    Keldi
                  </button>
                  <button
                    onClick={() => handleManualStatus(s._id, "kechikdi")}
                    className={`px-3 py-2 rounded-lg font-bold text-sm transition-all ${currentStatus === "kechikdi" ? "bg-amber-500 text-white shadow-sm" : "text-slate-500 hover:bg-slate-200"}`}
                  >
                    Kechikdi
                  </button>
                  <button
                    onClick={() => handleManualStatus(s._id, "ketdi")}
                    className={`px-3 py-2 rounded-lg font-bold text-sm transition-all ${currentStatus === "ketdi" ? "bg-cyan-500 text-white shadow-sm" : "text-slate-500 hover:bg-slate-200"}`}
                  >
                    Ketdi
                  </button>
                  <button
                    onClick={() => handleManualStatus(s._id, "kelmadi")}
                    className={`px-3 py-2 rounded-lg font-bold text-sm transition-all ${currentStatus === "kelmadi" ? "bg-rose-500 text-white shadow-sm" : "text-slate-500 hover:bg-slate-200"}`}
                  >
                    Kelmadi
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="fixed bottom-6 right-6 flex flex-col md:flex-row items-end md:items-center gap-3 z-40">
        {status.text && (
          <div className={`px-4 py-3 rounded-xl font-bold text-sm shadow-lg ${status.type === "success" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
            {status.text}
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-indigo-600 text-white p-4 rounded-full shadow-xl hover:scale-105 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="animate-spin" size={28} /> : <><Save size={28} /><span className="hidden md:inline font-bold pr-2">Saqlash</span></>}
        </button>
      </div>
    </div>
  );
}