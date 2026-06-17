import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Lock, User, Eye, EyeOff } from "lucide-react"; // Eye va EyeOff qo'shildi

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // YANGI: Parolni ko'rsatish/yashirish holati
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem("userRole", data.role);
        localStorage.setItem("username", data.username);
        navigate(data.role === "super_admin" ? "/dashboard" : "/groups", {
          replace: true,
        });
      } else {
        setError(data.message || "Login yoki parol xato!");
      }
    } catch (err) {
      setError("Server bilan aloqa yo'q. Internetni tekshiring!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm border border-slate-100">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
            <Lock className="text-white" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Xush kelibsiz</h2>
          <p className="text-slate-500 text-sm">CRM tizimiga kirish</p>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-600 p-3 rounded-xl mb-5 text-sm font-bold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <User
              className="absolute left-3 top-3.5 text-slate-400"
              size={18}
            />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-10 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="Login"
              required
            />
          </div>

          <div className="relative">
            <Lock
              className="absolute left-3 top-3.5 text-slate-400"
              size={18}
            />
            <input
              type={showPassword ? "text" : "password"} // YANGI: Type dinamik o'zgaradi
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-10 pr-12 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="Parol"
              required
            />
            {/* YANGI: Ko'zcha tugmasi */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3.5 text-slate-400 hover:text-indigo-500 transition-colors focus:outline-none"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-200 flex justify-center items-center gap-2 mt-2"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              "Tizimga kirish"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}