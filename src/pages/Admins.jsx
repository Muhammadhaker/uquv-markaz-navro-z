import { useState, useEffect } from "react";
import {
  UserPlus,
  Shield,
  ShieldAlert,
  Trash2,
  Key,
  Loader2,
  X,
} from "lucide-react";

export default function Admins() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("admin");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth");
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
    setError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", username, password, role }),
      });
      const data = await res.json();
      if (data.success) {
        setUsername("");
        setPassword("");
        setRole("admin");
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
    if (name === "Navro'z") return alert("Super Adminni o'chirib bo'lmaydi!");
    if (!window.confirm(`${name} ni o'chirmoqchimisiz?`)) return;
    await fetch("/api/auth", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchAdmins();
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tizim Xodimlari</h1>
          <p className="text-slate-500 text-sm">
            Adminlar va ruxsatnomalar boshqaruvi
          </p>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-indigo-700"
        >
          <UserPlus size={18} /> Yangi Admin
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="px-6 py-4">Admin</th>
                <th className="px-6 py-4 hidden sm:table-cell">Parol</th>
                <th className="px-6 py-4">Rol</th>
                <th className="px-6 py-4 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="4" className="py-10 text-center">
                    <Loader2 className="animate-spin mx-auto" />
                  </td>
                </tr>
              ) : (
                admins.map((a) => (
                  <tr key={a._id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-bold">{a.username}</td>
                    <td className="px-6 py-4 hidden sm:table-cell font-mono text-slate-500">
                      {a.password}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold ${
                          a.role === "super_admin"
                            ? "bg-purple-50 text-purple-700"
                            : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {a.role === "super_admin" ? "SUPER ADMIN" : "ADMIN"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {a.username !== "Navro'z" && (
                        <button
                          onClick={() => handleDeleteAdmin(a._id, a.username)}
                          className="text-rose-500 p-2"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold text-lg">Yangi xodim</h2>
              <button onClick={() => setIsOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddAdmin} className="space-y-4">
              <input
                required
                placeholder="Login"
                className="w-full border p-3 rounded-xl"
                onChange={(e) => setUsername(e.target.value)}
              />
              <input
                required
                placeholder="Parol"
                className="w-full border p-3 rounded-xl"
                onChange={(e) => setPassword(e.target.value)}
              />
              <select
                className="w-full border p-3 rounded-xl bg-white"
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="admin">Oddiy Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
              <button className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold">
                {submitting ? (
                  <Loader2 className="animate-spin mx-auto" />
                ) : (
                  "Saqlash"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
