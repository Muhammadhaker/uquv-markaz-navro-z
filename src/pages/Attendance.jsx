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

  useEffect(() => {
    fetch('/api/students').then(res => res.json()).then(data => {
      if (data.success) {
        setStudents(data.data);
        const uniqueGroups = [...new Set(data.data.map(s => s.group))];
        setGroups(uniqueGroups);
        if (uniqueGroups.length > 0) setSelectedGroup(uniqueGroups[0]);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedGroup) return;
    setLoading(true);
    fetch(`/api/attendance?groupName=${selectedGroup}&date=${selectedDate}`)
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data) {
          const mapped = {};
          res.data.records.forEach(r => { mapped[r.studentId] = r.status; });
          setAttendanceRecords(mapped);
        } else {
          setAttendanceRecords({});
        }
        setLoading(false);
      });
  }, [selectedGroup, selectedDate]);

  const handleSave = async () => {
    const currentStudents = students.filter(s => s.group === selectedGroup);
    if (currentStudents.some(s => !attendanceRecords[s._id])) {
      setStatus({ type: 'error', text: "Barcha o'quvchilarni belgilang!" });
      return;
    }

    setSaving(true);
    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        groupName: selectedGroup,
        date: selectedDate,
        adminName: localStorage.getItem('username') || 'Admin',
        records: currentStudents.map(s => ({ studentId: s._id, studentName: s.name, status: attendanceRecords[s._id] }))
      })
    });
    
    if (res.ok) setStatus({ type: 'success', text: 'Davomat saqlandi! ✅' });
    else setStatus({ type: 'error', text: 'Saqlashda xatolik yuz berdi.' });
    setSaving(false);
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Filterlar paneli */}
      <div className="bg-white p-4 rounded-2xl border mb-6 flex flex-col sm:flex-row gap-4 items-center">
        <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} className="w-full sm:w-auto p-3 border rounded-xl font-bold">
          {groups.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full sm:w-auto p-3 border rounded-xl font-bold" />
        <button onClick={handleSave} disabled={saving} className="w-full sm:w-auto bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 flex items-center justify-center gap-2">
          {saving ? <Loader2 className="animate-spin" /> : <Save size={18} />} Saqlash
        </button>
      </div>

      {status.text && <div className={`p-4 rounded-xl mb-4 text-sm font-bold ${status.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{status.text}</div>}

      {/* Ro'yxat */}
      <div className="bg-white rounded-2xl border overflow-hidden">
        {loading ? <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto" /></div> :
        students.filter(s => s.group === selectedGroup).map(s => (
          <div key={s._id} className="p-4 flex justify-between items-center border-b last:border-0 hover:bg-slate-50">
            <span className="font-semibold text-slate-800">{s.name}</span>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button onClick={() => setAttendanceRecords({...attendanceRecords, [s._id]: 'keldi'})} className={`px-4 py-2 rounded-lg font-bold text-sm transition ${attendanceRecords[s._id] === 'keldi' ? 'bg-emerald-500 text-white shadow' : 'text-slate-500'}`}>Keldi</button>
              <button onClick={() => setAttendanceRecords({...attendanceRecords, [s._id]: 'kelmadi'})} className={`px-4 py-2 rounded-lg font-bold text-sm transition ${attendanceRecords[s._id] === 'kelmadi' ? 'bg-rose-500 text-white shadow' : 'text-slate-500'}`}>Kelmadi</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}