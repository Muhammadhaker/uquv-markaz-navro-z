import { useState, useEffect } from 'react';
import { CalendarDays, Save, CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';

export default function Attendance() {
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: '', text: '' });

  // 1. O'quvchilar va Guruhlarni yuklash
  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/students');
        const data = await res.json();
        if (data && data.success && Array.isArray(data.data)) {
          setStudents(data.data);
          const uniqueGroups = [...new Set(data.data.map(s => s.group))].filter(Boolean);
          setGroups(uniqueGroups);
          if (uniqueGroups.length > 0) setSelectedGroup(uniqueGroups[0]);
        }
      } catch (error) {
        console.error("O'quvchilarni yuklashda xatolik:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  // 2. Davomatni tekshirish
  useEffect(() => {
    if (!selectedGroup || !selectedDate) return;
    
    const fetchAttendance = async () => {
      setLoading(true);
      setStatus({ type: '', text: '' });
      try {
        const res = await fetch(`/api/attendance?groupName=${selectedGroup}&date=${selectedDate}`);
        const result = await res.json();
        
        if (result && result.success && result.data && Array.isArray(result.data.records)) {
          const mapped = {};
          result.data.records.forEach(r => { mapped[r.studentId] = r.status; });
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

  // 3. Xavfsiz Saqlash Funksiyasi (Oq ekranni oldini oladi)
  const handleSave = async () => {
    try {
      setStatus({ type: '', text: '' });
      
      const currentStudents = students.filter(s => s.group === selectedGroup);
      
      // Tekshiruv: Hammasi belgilanganmi?
      const isAllMarked = currentStudents.every(s => attendanceRecords[s._id]);
      if (!isAllMarked) {
        setStatus({ type: 'error', text: "Iltimos, barcha o'quvchilarni belgilang!" });
        return;
      }

      setSaving(true);
      
      // Yuboriladigan paket
      const payload = {
        groupName: selectedGroup,
        date: selectedDate,
        adminName: localStorage.getItem('username') || 'Admin',
        records: currentStudents.map(s => ({
          studentId: s._id,
          studentName: s.name,
          status: attendanceRecords[s._id]
        }))
      };

      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const result = await res.json();

      if (res.ok && result.success) {
        setStatus({ type: 'success', text: 'Davomat muvaffaqiyatli saqlandi! ✅' });
      } else {
        setStatus({ type: 'error', text: result.error || 'Saqlashda server xatosi yuz berdi.' });
      }
    } catch (error) {
      console.error("Saqlashda kritik xato:", error);
      setStatus({ type: 'error', text: "Internet aloqasida xatolik yuz berdi." });
    } finally {
      setSaving(false);
    }
  };

  const currentGroupStudents = students.filter(s => s.group === selectedGroup);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Yuqori panel */}
      <div className="bg-white p-4 rounded-2xl border mb-6 flex flex-col sm:flex-row gap-4 items-center shadow-sm">
        <select 
          value={selectedGroup} 
          onChange={(e) => setSelectedGroup(e.target.value)} 
          className="w-full sm:w-auto p-3 border rounded-xl font-bold bg-slate-50 outline-none"
        >
          {groups.length === 0 && <option>Guruhlar yo'q</option>}
          {groups.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        
        <input 
          type="date" 
          value={selectedDate} 
          onChange={(e) => setSelectedDate(e.target.value)} 
          className="w-full sm:w-auto p-3 border rounded-xl font-bold bg-slate-50 outline-none" 
        />
        
        <button 
          onClick={handleSave} 
          disabled={saving || loading || currentGroupStudents.length === 0} 
          className="w-full sm:w-auto bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:bg-indigo-400 flex items-center justify-center gap-2 transition-all shadow-md"
        >
          {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Saqlash
        </button>
      </div>

      {/* Xabarlar qutisi */}
      {status.text && (
        <div className={`p-4 rounded-xl mb-6 text-sm font-bold flex items-center gap-2 border ${status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
          <AlertCircle size={18} /> {status.text}
        </div>
      )}

      {/* O'quvchilar ro'yxati */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-indigo-600" size={32} /> Yuklanmoqda...
          </div>
        ) : currentGroupStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-medium">Bu guruhda o'quvchilar yo'q.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {currentGroupStudents.map(s => (
              <div key={s._id} className="p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center hover:bg-slate-50 gap-4 transition-colors">
                <span className="font-semibold text-slate-800 text-lg sm:text-base">{s.name}</span>
                
                <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
                  <button 
                    onClick={() => setAttendanceRecords({...attendanceRecords, [s._id]: 'keldi'})} 
                    className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${attendanceRecords[s._id] === 'keldi' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}
                  >
                    <CheckCircle2 size={16} /> Keldi
                  </button>
                  <button 
                    onClick={() => setAttendanceRecords({...attendanceRecords, [s._id]: 'kelmadi'})} 
                    className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${attendanceRecords[s._id] === 'kelmadi' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}
                  >
                    <XCircle size={16} /> Kelmadi
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}