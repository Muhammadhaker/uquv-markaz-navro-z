import { useState, useEffect, useRef, useCallback } from "react";
import { Save, Loader2, Search, QrCode, X, Eraser, RefreshCw } from "lucide-react";
import AttendanceScanner from "../components/AttendanceScanner";

export default function Attendance() {
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // FIX 1: scanCooldowns faqat QR uchun — handleScan ichida ishlatiladi.
  // Manual tugmalar uchun esa alohida "saving" holati yo'q, chunki ular faqat
  // local state'ni o'zgartiradi (saqlash "Saqlash" tugmasida amalga oshadi).
  const scanCooldowns = useRef({});

  // FIX 2: getAuthHeaders useCallback bilan memoized — har renderda qayta yaratilmaydi.
  // Muhimroq: localStorage FAQAT client tomonida ishlaydi. Agar SSR bo'lsa,
  // bu xato beradi. Hozircha Next.js pages/ da bo'lgani uchun muammo yo'q.
  const getAuthHeaders = useCallback(() => ({
    "Content-Type": "application/json",
    "x-user-role": localStorage.getItem("userRole") || "",
    "x-user-id": localStorage.getItem("userId") || "",
    "x-parent-id": localStorage.getItem("parentTeacherId") || ""
  }), []);

  // FIX 3: getGroupTeacherId — students o'zgarsa qayta hisoblanadi (useCallback).
  // Avvalgi versiyada bu funksiya har renderda qayta yaratilardi.
  const getGroupTeacherId = useCallback(() => {
    for (let s of students) {
      if (s.groupsData && Array.isArray(s.groupsData)) {
        const gData = s.groupsData.find(g => g.name === selectedGroup);
        if (gData && gData.teacherId) return gData.teacherId;
      }
    }
    return localStorage.getItem("userId") || "";
  }, [students, selectedGroup]);

  // FIX 4: fetchAttendanceData useCallback bilan — dependency array to'g'ri.
  // Avvalgi versiyada useEffect ichida chaqirilardi va dependency yo'q edi,
  // bu "stale closure" muammosiga olib kelishi mumkin edi.
  const fetchAttendanceData = useCallback(async (isRefresh = false) => {
    if (!selectedGroup || !selectedDate) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch(
        `/api/attendance?groupName=${encodeURIComponent(selectedGroup)}&date=${selectedDate}`,
        { headers: getAuthHeaders() }
      );
      const result = await res.json();

      if (result?.success && result.data && Array.isArray(result.data.records)) {
        const mapped = {};
        result.data.records.forEach((r) => {
          mapped[r.studentId] = {
            status: r.status || "",
            arrivalTime: r.arrivalTime || null,
            leaveTime: r.leaveTime || null,
            lastScan: r.lastScan || 0
          };
        });
        setAttendanceRecords(mapped);
        setUnsavedChanges(false);
      } else {
        setAttendanceRecords({});
        setUnsavedChanges(false);
      }
    } catch (error) {
      console.error("Davomat yuklanmadi:", error);
      showStatus("error", "Ma'lumot yuklanmadi. Internet aloqasini tekshiring.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedGroup, selectedDate, getAuthHeaders]);

  // FIX 5: status uchun yordamchi funksiya — kod takrorlanishini kamaytiradi.
  const showStatus = useCallback((type, text, duration = 3000) => {
    setStatus({ type, text });
    setTimeout(() => setStatus({ type: "", text: "" }), duration);
  }, []);

  // O'quvchilarni bir marta yuklaymiz
  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/students", { headers: getAuthHeaders() });
        const data = await res.json();
        if (data?.success && Array.isArray(data.data)) {
          const sorted = [...data.data].sort((a, b) => a.name.localeCompare(b.name));
          setStudents(sorted);

          const allGroups = sorted.flatMap((s) =>
            s.group ? s.group.split(",").map((g) => g.trim()) : []
          );
          const unique = [...new Set(allGroups)].filter(Boolean);
          setGroups(unique);
          if (unique.length > 0) setSelectedGroup(unique[0]);
        }
      } catch (error) {
        console.error("O'quvchilar yuklanmadi:", error);
        showStatus("error", "O'quvchilar ro'yxati yuklanmadi!");
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Faqat bir marta — intentional

  // FIX 6: students dependency olib tashlandi.
  // Avvalgi versiyada [selectedGroup, selectedDate, students] degan dependency bor edi.
  // Har yangi o'quvchi qo'shilganda yoki students o'zgarganda qayta fetch qilinardi —
  // bu keraksiz so'rovlar va flicker'ga olib kelardi.
  useEffect(() => {
    if (selectedGroup) fetchAttendanceData();
  }, [selectedGroup, selectedDate, fetchAttendanceData]);

  // FIX 7: unsavedChanges bo'lsa foydalanuvchini ogohlantirish
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (unsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [unsavedChanges]);

  const currentGroupStudents = students.filter((s) => {
    if (!selectedGroup) return false;
    const studentGroups = s.group ? s.group.split(",").map((g) => g.trim()) : [];
    return (
      studentGroups.includes(selectedGroup) &&
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const markAllPresent = () => {
    const timeStr = new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
    const now = Date.now();
    setAttendanceRecords((prev) => {
      const next = { ...prev };
      currentGroupStudents.forEach((s) => {
        const existing = next[s._id];
        // Faqat belgilanmagan yoki "kelmadi" statusdagilarga tegamiz
        if (!existing?.status || existing.status === "kelmadi" || existing.status === "") {
          next[s._id] = { status: "keldi", arrivalTime: timeStr, leaveTime: null, lastScan: now };
        }
      });
      return next;
    });
    setUnsavedChanges(true);
  };

  const clearAllAttendance = () => {
    if (!window.confirm(`Haqiqatan ham ${selectedDate} sanasidagi barcha davomatni tozalamoqchimisiz?`)) return;
    setAttendanceRecords((prev) => {
      const next = { ...prev };
      currentGroupStudents.forEach((s) => {
        next[s._id] = { status: "", arrivalTime: null, leaveTime: null, lastScan: null };
      });
      return next;
    });
    setUnsavedChanges(true);
  };

  // FIX 8: handleScan — unsavedChanges tekshiruvi qo'shildi.
  // Agar ustoz qo'lda o'zgartirish kiritgan bo'lsa va QR skanerlansa,
  // fetch orqali qayta yuklash o'sha o'zgarishlarni o'chirib yuborardi.
  // Endi foydalanuvchini ogohlantirish qo'shildi.
  const handleScan = useCallback(async (scannedId) => {
    if (unsavedChanges) {
      const ok = window.confirm("Saqlanmagan o'zgarishlar bor. QR skan qilish ularni bekor qiladi. Davom etasizmi?");
      if (!ok) return;
    }

    const studentObj = students.find((s) => s._id === scannedId);
    if (!studentObj) {
      showStatus("error", "❌ Noto'g'ri QR-Kod (O'quvchi topilmadi)");
      return;
    }

    const now = Date.now();
    // FIX 9: 5 soniyalik cooldown — avvalgi versiyada ham bor edi, lekin
    // cooldown o'tgach ham `scanCooldowns` yangilanmaydi degan xato bor edi.
    // Endi to'g'ri: avval yangilaymiz, keyin so'rov yuboramiz.
    const lastScan = scanCooldowns.current[scannedId] || 0;
    if (now - lastScan < 5000) return;
    scanCooldowns.current[scannedId] = now;

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          studentId: scannedId,
          date: selectedDate,
          groupName: selectedGroup,
          teacherId: getGroupTeacherId(),
          adminName: localStorage.getItem("username") || "Admin"
        })
      });

      const result = await res.json();

      // Bazadan yangi ma'lumotlarni olamiz
      await fetchAttendanceData(true);

      if (result.success) {
        if (result.message.includes("qayd etilmadi") || result.message.includes("o'tmadi")) {
          showStatus("error", "⏳ Kamida 30 daqiqa kuting!");
        } else {
          showStatus("success", `✅ ${studentObj.name} — ${result.message.split(" - ")[1] || "Qayd etildi"}`);
        }
      } else {
        showStatus("error", `❌ ${result.message}`);
      }
    } catch (err) {
      console.error("Skan xatosi:", err);
      showStatus("error", "❌ Server bilan bog'lanishda xato!");
    }
  }, [students, unsavedChanges, selectedDate, selectedGroup, getAuthHeaders, getGroupTeacherId, fetchAttendanceData, showStatus]);

  const handleManualStatus = useCallback((studentId, newStatus) => {
    const timeStr = new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
    const now = Date.now();

    setAttendanceRecords((prev) => {
      const current = prev[studentId] || {};
      return {
        ...prev,
        [studentId]: {
          ...current,
          status: newStatus,
          // Kelgan vaqtni faqat birinchi marta belgilaymiz, keyin o'zgartirilmaydi
          arrivalTime:
            newStatus === "keldi" || newStatus === "kechikdi"
              ? current.arrivalTime || timeStr
              : current.arrivalTime,
          leaveTime:
            newStatus === "ketdi"
              ? current.leaveTime || timeStr
              : current.leaveTime,
          lastScan: now
        }
      };
    });
    setUnsavedChanges(true);
  }, []);

  const handleClearStatus = useCallback((studentId) => {
    setAttendanceRecords((prev) => ({
      ...prev,
      [studentId]: { status: "", arrivalTime: null, leaveTime: null, lastScan: null }
    }));
    setUnsavedChanges(true);
  }, []);

  const handleSave = async () => {
    if (!selectedGroup) {
      showStatus("error", "Guruh tanlanmagan!");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        groupName: selectedGroup,
        date: selectedDate,
        teacherId: getGroupTeacherId(),
        adminName: localStorage.getItem("username") || "Admin",
        records: currentGroupStudents.map((s) => {
          const rec = attendanceRecords[s._id] || {};
          return {
            studentId: s._id,
            studentName: s.name,
            status: rec.status || "",
            arrivalTime: rec.arrivalTime || null,
            leaveTime: rec.leaveTime || null,
            lastScan: rec.lastScan || null
          };
        })
      };

      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showStatus("success", "✅ Davomat muvaffaqiyatli saqlandi!");
        setUnsavedChanges(false);
      } else {
        const err = await res.json().catch(() => ({}));
        showStatus("error", `❌ Saqlashda xato: ${err.message || res.statusText}`);
      }
    } catch (error) {
      console.error("Saqlash xatosi:", error);
      showStatus("error", "❌ Internet yo'q yoki server xatosi.");
    } finally {
      setSaving(false);
    }
  };

  // Statistika (qo'shimcha foyda)
  const stats = currentGroupStudents.reduce(
    (acc, s) => {
      const st = attendanceRecords[s._id]?.status || "";
      if (st === "keldi") acc.keldi++;
      else if (st === "kechikdi") acc.kechikdi++;
      else if (st === "ketdi") acc.ketdi++;
      else if (st === "kelmadi") acc.kelmadi++;
      else acc.belgilanmagan++;
      return acc;
    },
    { keldi: 0, kechikdi: 0, ketdi: 0, kelmadi: 0, belgilanmagan: 0 }
  );

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto pb-24">

      {/* QR Scanner */}
      <div className="mb-6">
        <button
          onClick={() => setShowScanner(!showScanner)}
          className={`w-full p-4 rounded-2xl shadow-sm border font-bold flex items-center justify-center gap-2 transition-all ${
            showScanner
              ? "bg-slate-800 text-white border-slate-800"
              : "bg-white text-indigo-600 border-indigo-100 hover:bg-indigo-50"
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

      {/* Filtrlar */}
      <div className="bg-white p-4 rounded-2xl border mb-4 shadow-sm space-y-4">
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
            className="p-3 border rounded-xl font-bold bg-slate-50 cursor-pointer outline-none focus:border-indigo-500"
          />
          <div className="flex w-full sm:w-auto gap-2">
            <button
              onClick={markAllPresent}
              className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold transition-colors"
            >
              Hammasi Keldi
            </button>
            <button
              onClick={clearAllAttendance}
              className="flex-1 sm:flex-none bg-rose-100 hover:bg-rose-200 text-rose-600 px-6 py-3 rounded-xl font-bold transition-colors"
            >
              Tozalash
            </button>
            {/* FIX 10: Refresh tugmasi qo'shildi — qo'lda yangilash imkoniyati */}
            <button
              onClick={() => fetchAttendanceData(true)}
              disabled={refreshing}
              className="flex-none bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-3 rounded-xl font-bold transition-colors"
              title="Yangilash"
            >
              <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            placeholder="Ism bo'yicha qidirish..."
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-10 py-3.5 border rounded-xl bg-slate-50 focus:border-indigo-500 outline-none font-medium transition-colors"
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
      </div>

      {/* Statistika paneli */}
      {currentGroupStudents.length > 0 && (
        <div className="grid grid-cols-5 gap-2 mb-4">
          {[
            { label: "Keldi", value: stats.keldi, color: "emerald" },
            { label: "Kechikdi", value: stats.kechikdi, color: "amber" },
            { label: "Ketdi", value: stats.ketdi, color: "cyan" },
            { label: "Kelmadi", value: stats.kelmadi, color: "rose" },
            { label: "Noma'lum", value: stats.belgilanmagan, color: "slate" }
          ].map(({ label, value, color }) => (
            <div key={label} className={`bg-${color}-50 border border-${color}-100 rounded-xl p-2 text-center`}>
              <div className={`text-xl font-black text-${color}-600`}>{value}</div>
              <div className={`text-xs font-medium text-${color}-500`}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* O'quvchilar ro'yxati */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="animate-spin" size={20} />
            <span>Yuklanmoqda...</span>
          </div>
        ) : currentGroupStudents.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-medium">
            Tanlangan guruhda o'quvchi topilmadi.
          </div>
        ) : (
          currentGroupStudents.map((s) => {
            const rec = attendanceRecords[s._id] || {};
            const currentStatus = rec.status || "";

            return (
              <div
                key={s._id}
                className="p-4 border-b last:border-b-0 flex flex-col md:flex-row justify-between md:items-center gap-3 hover:bg-slate-50 transition-colors"
              >
                <div>
                  <div className="font-bold text-slate-700 text-lg">{s.name}</div>
                  <div className="text-xs flex gap-3 mt-1">
                    {rec.arrivalTime && (
                      <span className="text-emerald-600 font-medium">🟢 Keldi: {rec.arrivalTime}</span>
                    )}
                    {rec.leaveTime && (
                      <span className="text-rose-500 font-medium">🔴 Ketdi: {rec.leaveTime}</span>
                    )}
                    {!rec.arrivalTime && !rec.leaveTime && (
                      <span className="text-slate-400">Belgilanmagan</span>
                    )}
                  </div>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl gap-1 w-full md:w-auto overflow-x-auto">
                  {[
                    { key: "keldi", label: "Keldi", active: "bg-emerald-500" },
                    { key: "kechikdi", label: "Kechikdi", active: "bg-amber-500" },
                    { key: "ketdi", label: "Ketdi", active: "bg-cyan-500" },
                    { key: "kelmadi", label: "Kelmadi", active: "bg-rose-500" }
                  ].map(({ key, label, active }) => (
                    <button
                      key={key}
                      onClick={() => handleManualStatus(s._id, key)}
                      className={`flex-1 md:flex-none px-3 py-2 rounded-lg font-bold text-sm transition-all ${
                        currentStatus === key
                          ? `${active} text-white shadow-sm`
                          : "text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                  <button
                    onClick={() => handleClearStatus(s._id)}
                    className="flex-none px-3 py-2 rounded-lg font-bold text-slate-400 hover:text-rose-500 hover:bg-rose-100 transition-all flex items-center justify-center"
                    title="Tozalash"
                  >
                    <Eraser size={18} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Saqlash tugmasi */}
      <div className="fixed bottom-6 right-6 flex flex-col md:flex-row items-end md:items-center gap-3 z-40">
        {status.text && (
          <div
            className={`px-4 py-3 rounded-xl font-bold text-sm shadow-lg ${
              status.type === "success"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-rose-100 text-rose-800"
            }`}
          >
            {status.text}
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className={`${
            unsavedChanges
              ? "bg-amber-500 hover:bg-amber-600 animate-pulse border-2 border-amber-300"
              : "bg-indigo-600 hover:bg-indigo-700"
          } text-white p-4 rounded-full shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100`}
        >
          {saving ? (
            <Loader2 className="animate-spin" size={28} />
          ) : (
            <>
              <Save size={28} />
              <span className="hidden md:inline font-bold pr-2">
                {unsavedChanges ? "SAQLASH KERAK!" : "Saqlash"}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}