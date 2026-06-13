import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      // Agar server 500 (Baza ishlamayapti) yoki 404 xato qaytarsa
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `Server xatosi: ${res.status}`);
      }

      const data = await res.json();

      if (data.success) {
        // Tizimga muvaffaqiyatli kirdi
        localStorage.setItem('userRole', data.role);
        localStorage.setItem('username', data.username);
        
        // Roliga qarab yo'naltirish
        if (data.role === 'super_admin') {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/groups', { replace: true });
        }
      } else {
        // Login yoki parol xato degan javob kelsa
        setError(data.message || "Login yoki parol xato!");
      }
    } catch (err) {
      console.error("Login jarayonida xatolik:", err);
      // Asl xatoni ekranga chiqaramiz
      if (err.message === "Failed to fetch") {
        setError("API topilmadi. Loyihani 'npm run dev' emas, 'vercel dev' orqali ishga tushiring yoki GitHub'ga yuklang.");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-lg">
            CRM
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Tizimga Kirish</h2>
          <p className="text-sm text-gray-500 mt-1">O'quv markazi boshqaruv paneli</p>
        </div>
        
        {/* Xatolik aniq yoziladigan joy */}
        {error && (
          <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded-lg mb-6 text-sm text-center font-medium">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Login</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="Masalan: Navro'z"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parol</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className={`w-full text-white font-semibold py-3 rounded-lg shadow-md transition-all duration-200 
              ${loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {loading ? 'Tekshirilmoqda...' : 'Tizimga kirish'}
          </button>
        </form>

      </div>
    </div>
  );
}