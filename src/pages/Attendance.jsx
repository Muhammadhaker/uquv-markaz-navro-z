import { useState, useEffect } from 'react';
import { CalendarDays, Save, CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';

export default function Attendance() {
  const [groups] = useState(['Ingliz tili', 'Matematika', 'Ona tili']); // Tizimdagi guruhlar
  const [selectedGroup, setSelectedGroup] = useState('Ingliz tili');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Haqiqiy talabalar ro'yxati (Buni keyinchalik API dan filtrlash mumkin)
  const [students, setStudents] = useState([
    { _id: 'st_1', name: 'Aliyev Vali', group: 'Ingliz tili' },
    { _id: 'st_2', name: 'Karimova Lola', group: 'Ingliz tili' },
    { _id: 'st_3', name: 'Mamatov Jasur', group: 'Matematika' },
  ]);

  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });

  // Guruh yoki Sana o'zgarganda bazadan eski davomatni tekshirib yuklash
  useEffect(() => {
    const fetchExistingAttendance = async () => {
      setLoading(true);
      setStatusMessage({ type: '', text: '' });
      try {
        const res = await fetch(`/api/attendance?groupName=${selectedGroup}&date=${selectedDate}`);
        const result = await res.json();
        
        if (result.success && result.data) {
          // Agar davomat mavjud bo'lsa, uni holatga (state) yuklaymiz
          const mapped = {};
          result.data.records.forEach(r => { mapped[r.studentId] = r.status; });
          setAttendanceRecords(mapped);
          setStatusMessage({ type: 'info', text: 'Ushbu kun uchun davomat aniqlandi va yuklandi.' });
        } else {
          // Agar davomat yo'q bo'lsa, tozalaymiz
          setAttendanceRecords({});
        }
      } catch (err) {
        setStatusMessage({ type: 'error', text: 'Maʼlumotlarni yuklashda xatolik yuz berdi.' });
      } finally {
        setLoading(false);
      }
    };

    fetchExistingAttendance();
  }, [selectedGroup, selectedDate]);

  const markStatus = (studentId, status) => {
    setAttendanceRecords(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSave = async () => {
    // Filtrlangan guruh o'quvchilari
    const groupStudents = students.filter(s => s.group === selectedGroup);
    
    // Hammani belgilaganini tekshirish (Validation)
   const unmarked = groupStudents.filter(s => !attendanceRecords[s._id]);
    if (unmarked.length > 0) {
      setStatusMessage({ type: 'error', text: `Iltimos, barcha o'quvchilarni belgilang! (${unmarked.length} ta qoldi)` });
      return;
    }

    setSaving(true);
    setStatusMessage({ type: '', text: '' });
    const adminName = localStorage.getItem('username') || 'Admin';

    const payload = {
      groupName: selectedGroup,
      date: selectedDate,
      adminName,
      records: groupStudents.map(s => ({
        studentId: s._id,
        studentName: s.name,
        status: attendanceRecords[s._id]
      }))
    };

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();

      if (result.success) {
        setStatusMessage({ type: 'success', text: 'Davomat maʼlumotlar bazasiga muvaffaqiyatli saqlandi! ✅' });
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Saqlashda xatolik: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  const currentStudents = students.filter(s => s.group === selectedGroup);

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      {/* Panel Sozlamalari */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Guruhni tanlang</label>
            <select 
              value={selectedGroup} 
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {groups.map((g, i) => <option key={i} value={g}>{g}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Sana</label>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            />
          </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={saving || loading}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-200"
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          Saqlash va Tasdiqlash
        </button>
      </div>

      {/* Tizim bildirishnomalari */}
      {statusMessage.text && (
        <div className={`p-4 rounded-xl flex items-center gap-3 border text-sm font-medium ${
          statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
          statusMessage.type === 'error' ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-blue-50 text-blue-800 border-blue-200'
        }`}>
          <AlertCircle size={18} />
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* O'quvchilar Ro'yxati */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
            <span className="text-sm font-medium">Baza tekshirilmoqda...</span>
          </div>
        ) : currentStudents.length > 0 ? (
          <div className="divide-y divide-slate-50">
            {currentStudents.map((student) => {
              const currentStatus = attendanceRecords[student._id];
              return (
                <div key={student._id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-5 hover:bg-slate-50/50 transition-colors gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center shadow-sm">
                      {student.name.charAt(0)}
                    </div>
                    <span className="font-semibold text-slate-800 text-base">{student.name}</span>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => markStatus(student._id, 'keldi')}
                      className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                        currentStatus === 'keldi' 
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-100 ring-2 ring-emerald-500 ring-offset-2 scale-105' 
                          : 'bg-slate-50 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600'
                      }`}
                    >
                      <CheckCircle2 size={16} /> Keldi
                    </button>
                    <button 
                      onClick={() => markStatus(student._id, 'kelmadi')}
                      className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                        currentStatus === 'kelmadi' 
                          ? 'bg-rose-500 text-white shadow-md shadow-rose-100 ring-2 ring-rose-500 ring-offset-2 scale-105' 
                          : 'bg-slate-50 text-slate-500 hover:bg-rose-50 hover:text-rose-600'
                      }`}
                    >
                      <XCircle size={16} /> Kelmadi
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400 font-medium">Bu guruhda hozircha o'quvchilar mavjud emas.</div>
        )}
      </div>
    </div>
  );
}