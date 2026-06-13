import { useState, useEffect } from 'react';
import { UserPlus, Shield, ShieldAlert, Trash2, Key, Loader2, X } from 'lucide-react';

export default function Admins() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Yangi admin qo'shish modal statelari
  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('admin');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth');
      const data = await res.json();
      if (data.success) setAdmins(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', username, password, role })
      });
      const data = await res.json();

      if (data.success) {
        setUsername('');
        setPassword('');
        setRole('admin');
        setIsOpen(false);
        fetchAdmins(); // Ro'yxatni yangilash
      } else {
        setError(data.message || "Xatolik yuz berdi");
      }
    } catch (err) {
      setError("Server bilan aloqa uzildi");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAdmin = async (id, name) => {
    if (name === "Navro'z") {
      alert("Asosiy Super Adminni o'chirib bo'lmaydi! ❌");
      return;
    }
    if (!window.confirm(`${name} ismli xodimni (adminni) tizimdan o'chirmoqchimisiz?`)) return;

    try {
      const res = await fetch('/api/auth', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (res.ok) fetchAdmins();
      else alert(data.message || "Xatolik");
    } catch (err) {
      alert("Xatolik yuz berdi");
    }
  };

  return (
    <div className="p-2">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tizim Xodimlari</h1>
          <p className="text-slate-500 text-sm mt-1">Adminlar ro'yxati va ruxsatnomalarni boshqarish</p>
        </div>
        <button 
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-indigo-200"
        >
          <UserPlus size={18} />
          Yangi Admin Qo'shish
        </button>
      </div>

      {/* Jadval */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-48 text-slate-400 gap-2">
            <Loader2 className="animate-spin text-indigo-600" /> Xodimlar yuklanmoqda...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 text-sm font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4 border-b border-slate-100">Foydalanuvchi Nomi (Login)</th>
                  <th className="px-6 py-4 border-b border-slate-100">Parol</th>
                  <th className="px-6 py-4 border-b border-slate-100">Darajasi (Rol)</th>
                  <th className="px-6 py-4 border-b border-slate-100 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-50">
                {admins.map((admin) => (
                  <tr key={admin._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-800">{admin.username}</td>
                    <td className="px-6 py-4 text-slate-500 font-medium font-mono flex items-center gap-1.5 py-4">
                      <Key size={14} className="text-slate-400" /> {admin.password}
                    </td>
                    <td className="px-6 py-4">
                      {admin.role === 'super_admin' ? (
                        <span className="inline-flex items-center gap-1 bg-purple-50 border border-purple-200 text-purple-700 px-3 py-1 rounded-lg text-xs font-bold">
                          <ShieldAlert size={14} /> Super Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1 rounded-lg text-xs font-bold">
                          <Shield size={14} /> Oddiy Admin
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {admin.username !== "Navro'z" && (
                        <button 
                          onClick={() => handleDeleteAdmin(admin._id, admin.username)}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                          title="Tizimdan o'chirish"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Admin Qo'shish Oynasi (Modal) */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md relative p-6">
            <button onClick={() => setIsOpen(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <UserPlus className="text-indigo-600" /> Yangi xodim qo'shish
            </h2>

            {error && <div className="bg-rose-50 text-rose-700 border border-rose-200 p-3 rounded-xl mb-4 text-xs font-bold text-center">⚠️ {error}</div>}

            <form onSubmit={handleAddAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Foydalanuvchi nomi (Login)</label>
                <input 
                  type="text" required value={username} onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masalan: jasur_admin"
                  className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tizimga kirish paroli</label>
                <input 
                  type="text" required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Kamida 6 ta belgi"
                  className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ruxsat darajasi (Rol)</label>
                <select 
                  value={role} onChange={(e) => setRole(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm font-semibold text-slate-700"
                >
                  <option value="admin">Oddiy Admin (Statistikani ko'ra olmaydi)</option>
                  <option value="super_admin">Super Admin (To'liq huquqli boshliq)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2.5 bg-slate-50 text-slate-600 rounded-xl font-semibold text-sm">Bekor qilish</button>
                <button type="submit" disabled={submitting} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold flex items-center gap-2 text-sm shadow-md shadow-indigo-100">
                  {submitting && <Loader2 className="animate-spin" size={16} />} Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}