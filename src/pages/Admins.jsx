import { useState, useEffect } from "react";
import {
  UserPlus, Shield, ShieldAlert, Trash2, Key, Loader2, X, User,
  Smartphone, Monitor, Clock, History, CheckSquare, Square, Mail
} from "lucide-react";

export default function Admins() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("assistant");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [permissions, setPermissions] = useState(["attendance"]);

  const currentUserId = localStorage.getItem("userId");
  const currentUserRole = localStorage.getItem("userRole");

  // 🔥 API himoya kalitlari
  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    "x-user-role": currentUserRole || "",
    "x-user-id": currentUserId || "",
    "x-parent-id": localStorage.getItem("parentTeacherId") || ""
  });

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth", { headers: getAuthHeaders() });
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

  const handleTogglePermission = (val) => {
    setPermissions(prev => prev.includes(val) ? prev.filter(p => p !== val) : [...prev, val]);
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        action: "create",
        fullName,
        username,
        password,
        role,
        parentTeacherId: role === "assistant" ? currentUserId : null,
        permissions: role === "assistant" ? permissions : ['all']
      };

      const res = await fetch("/api/auth", {
        method: "POST", headers: getAuthHeaders(), body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        setFullName("");
        setUsername("");
        setPassword("");
        setRole("assistant");
        setPermissions(["attendance"]);
        setIsOpen(false);
        fetchAdmins();
      } else {
        setError(data.message);
      }
    } catch {
      setError("Server bilan aloqa uzildi");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAdmin = async (id, name) => {
    if (name === "Navroz") return alert("Super Adminni o'chirib bo'lmaydi!");
    if (!window.confirm(`${name} ni o'chirmoqchimisiz?`)) return;
    await fetch("/api/auth", {
      method: "DELETE", headers: getAuthHeaders(), body: JSON.stringify({ id }),
    });
    fetchAdmins();
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleString("ru-RU", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const renderDeviceBadge = (deviceStr) => {
    if (!deviceStr) return null;
    let IconComponent = Monitor;
    let colorClass = "text-slate-600 bg-slate-100 border-slate-200";

    if (deviceStr.includes("iPhone") || deviceStr.includes("Apple") || deviceStr.includes("Mac")) {
      IconComponent = Smartphone; colorClass = "text-slate-700 bg-slate-100 border-slate-300";
    } else if (deviceStr.includes("Android")) {
      IconComponent = Smartphone; colorClass = "text-emerald-700 bg-emerald-50 border-emerald-200";
    } else if (deviceStr.includes("Windows")) {
      IconComponent = Monitor; colorClass = "text-blue-700 bg-blue-50 border-blue-200";
    }

    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 w-fit shadow-sm ${colorClass}`}>
        <IconComponent size={12} /> {deviceStr}
      </span>
    );
  };

  const renderLoginHistory = (historyArr) => {
    if (!historyArr || historyArr.length === 0) return <span className="text-xs text-slate-400 font-medium italic">Hali tizimga kirmagan</span>;
    return (
      <div className="flex flex-col gap-2 mt-1">
        {historyArr.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2 border-l-2 border-indigo-200 pl-2">
            <span className="text-[11px] font-bold text-slate-500 min-w-[110px]">{formatTime(item.time)}</span>
            {renderDeviceBadge(item.device)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tizim Xodimlari</h1>
          <p className="text-slate-500 text-sm">Adminlar, ustozlar va yordamchilar ro'yxati</p>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-sm transition-all"
        >
          <UserPlus size={18} /> Yangi Xodim
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-slate-400" size={32} /></div>
      ) : (
        <>
          {/* 💻 DESKTOP UCHUN JADVAL */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="px-6 py-4">F.I.SH / Login</th>
                  <th className="px-6 py-4">Parol / Rol</th>
                  <th className="px-6 py-4">Kirishlar tarixi</th>
                  <th className="px-6 py-4 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {admins.map((a) => (
                  <tr key={a._id} className="hover:bg-slate-50 transition-colors align-top">
                    <td className="px-6 py-4 pt-5">
                      <div className="flex flex-col gap-1">
                        <div className="font-bold text-slate-800 text-base">{a.fullName || a.username}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 font-mono bg-slate-100 px-2 py-0.5 rounded w-fit">
                          <Mail size={12} /> {a.username}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 pt-5">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 font-mono text-slate-500 text-sm">
                          <Key size={14} className="text-slate-400" /> {a.password}
                        </div>
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 w-fit ${a.role === "super_admin" ? "bg-purple-50 text-purple-700" : a.role === "teacher" ? "bg-indigo-50 text-indigo-700" : "bg-orange-50 text-orange-700"
                          }`}
                        >
                          {a.role === "super_admin" ? <><ShieldAlert size={12} /> SUPER ADMIN</> : a.role === "teacher" ? <><Shield size={12} /> USTOZ (ADMIN)</> : <><User size={12} /> YORDAMCHI</>}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3">{renderLoginHistory(a.loginHistory)}</td>
                    <td className="px-6 py-4 text-right pt-5">
                      {a.username !== "Navroz" && (
                        <button onClick={() => handleDeleteAdmin(a._id, a.username)} className="text-rose-500 p-2 hover:bg-rose-50 rounded-lg transition-colors">
                          <Trash2 size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 📱 TELEFON UCHUN KARTOCHKA */}
          <div className="md:hidden space-y-4">
            {admins.map((a) => (
              <div key={a._id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                      <User size={18} className="text-indigo-500" />
                      {a.fullName || a.username}
                    </h3>
                    <div className="text-xs text-slate-500 flex items-center gap-1 font-mono bg-slate-100 px-2 py-0.5 rounded w-fit mt-1 mb-2">
                      <Mail size={12} /> {a.username}
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 font-mono text-sm mb-2">
                      <Key size={14} /> {a.password}
                    </div>
                    <span
                      className={`px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 w-fit ${a.role === "super_admin" ? "bg-purple-50 text-purple-700"
                          : a.role === "teacher" ? "bg-indigo-50 text-indigo-700"
                            : "bg-orange-50 text-orange-700"
                        }`}
                    >
                      {a.role === "super_admin" ? <><ShieldAlert size={12} /> SUPER ADMIN</>
                        : a.role === "teacher" ? <><Shield size={12} /> USTOZ</>
                          : <><User size={12} /> YORDAMCHI</>}
                    </span>
                  </div>
                  {a.username !== "Navroz" && (
                    <button
                      onClick={() => handleDeleteAdmin(a._id, a.username)}
                      className="text-rose-500 bg-rose-50 p-2.5 rounded-xl hover:bg-rose-100 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                    <History size={12} /> Kirishlar tarixi:
                  </p>
                  {renderLoginHistory(a.loginHistory)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 🟢 YANGI XODIM QO'SHISH MODALI */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-[60] p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 animate-in zoom-in duration-200 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold text-xl text-slate-800">Yangi xodim</h2>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><X size={20} /></button>
            </div>

            <form onSubmit={handleAddAdmin} className="space-y-4">
              {error && <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-sm font-medium">{error}</div>}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">To'liq ism (F.I.SH)</label>
                <input required placeholder="Masalan: G'ulomov Navro'z" className="w-full border p-3 rounded-xl outline-none focus:border-indigo-500 bg-slate-50" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Tizimga kirish Logini</label>
                <input required placeholder="masalan: navroz_math" className="w-full border p-3 rounded-xl outline-none focus:border-indigo-500 bg-slate-50" value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Parol</label>
                <input required placeholder="********" className="w-full border p-3 rounded-xl outline-none focus:border-indigo-500 bg-slate-50" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Rolni tanlang</label>
                <select className="w-full border p-3 rounded-xl outline-none focus:border-indigo-500 bg-slate-50 font-medium" value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="assistant">Yordamchi (Assistant)</option>
                  {currentUserRole === 'super_admin' && <option value="teacher">Ustoz (Admin)</option>}
                  {currentUserRole === 'super_admin' && <option value="super_admin">Super Admin</option>}
                </select>
              </div>

              {role === "assistant" && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mt-2 space-y-3">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Qaysi bo'limlarga ruxsat berasiz?</label>
                  <div className="flex flex-col gap-2">
                    {[{ val: "attendance", label: "Davomat" }, { val: "groups", label: "Guruhlar va To'lovlar" }, { val: "dashboard", label: "Umumiy Statistika" }, { val: "badges", label: "Bejiklar chiqarish" }].map(item => (
                      <label key={item.val} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-100 rounded-lg">
                        <div onClick={() => handleTogglePermission(item.val)}>
                          {permissions.includes(item.val) ? <CheckSquare className="text-indigo-600" size={20} /> : <Square className="text-slate-300" size={20} />}
                        </div>
                        <span className="text-sm font-medium text-slate-700" onClick={() => handleTogglePermission(item.val)}>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <button type="submit" disabled={submitting} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 shadow-md mt-2 flex justify-center">
                {submitting ? <Loader2 className="animate-spin" size={24} /> : "Saqlash"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}