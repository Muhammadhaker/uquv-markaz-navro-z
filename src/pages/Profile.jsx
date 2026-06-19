import { useState, useEffect } from "react";
import { User, Phone, BookOpen, CreditCard, Loader2, Bug } from "lucide-react";

export default function Profile() {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [debugMsg, setDebugMsg] = useState(""); // XATONI ANIQLOVCHI YANGI STATE

  useEffect(() => {
    const fetchProfile = async () => {
      let currentChatId = null;

      // 1. Telegram ID ni olishga harakat qilamiz
      if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        tg.setHeaderColor("#4f46e5");
        currentChatId = tg.initDataUnsafe?.user?.id;
      }

      // Agar ID olinmasa, darhol sababini yozamiz
      if (!currentChatId) {
        setLoading(false);
        setError(true);
        setDebugMsg("Telegram ID topilmadi. (Kompyuterdan emas, telefon orqali kirib ko'ring yoki WebApp ruxsatlari yo'q).");
        return;
      }

      // 2. Bazadan qidiramiz
      try {
        const res = await fetch(`/api/student-profile?chatId=${currentChatId}`);
        
        if (!res.ok) {
          setDebugMsg(`Server xatosi: ${res.status}. API fayl nomi "student-profile.js" ekanini tekshiring.`);
          setError(true);
          setLoading(false);
          return;
        }

        const data = await res.json();
        
        if (data.success) {
          setProfileData(data);
        } else {
          setDebugMsg(`Baza topmadi: ${data.message} (Qidirilgan ID: ${currentChatId})`);
          setError(true);
        }
      } catch (err) {
        console.error(err);
        setDebugMsg(`Ulanishda xatolik: ${err.message}`);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  // XATO BO'LSA, QIZIL RANGDA SABABINI KO'RSATAMIZ
  if (error || !profileData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 w-full max-w-sm">
          <User className="mx-auto text-slate-300 mb-4" size={48} />
          <h2 className="text-xl font-bold text-slate-700">Profil topilmadi</h2>
          <p className="text-slate-500 mt-2 text-sm">Siz hali ro'yxatdan o'tmagansiz yoki xatolik yuz berdi.</p>
          
          {debugMsg && (
            <div className="mt-6 p-4 bg-red-50 text-red-600 text-xs font-medium rounded-xl border border-red-100 flex items-start gap-3 text-left">
              <Bug size={18} className="shrink-0 mt-0.5 text-red-500" />
              <span>{debugMsg}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  const student = profileData?.data || {};
  const hasPaid = profileData?.hasPaid || false;
  const month = profileData?.month || "";
  const groups = student?.group ? student.group.split(',').map(g => g.trim()).filter(Boolean) : [];

  return (
    <div className="min-h-screen bg-slate-50 pb-20 animate-in fade-in duration-300">
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-lg">
        <div className="bg-indigo-600 px-6 py-10 text-center rounded-b-[3rem] relative overflow-hidden">
          <div className="relative z-10">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-white/40 shadow-xl">
              <User size={36} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">{student?.name || "Noma'lum o'quvchi"}</h1>
            <p className="text-indigo-100 font-medium mt-1 text-sm">Shaxsiy Kabinet</p>
          </div>
        </div>

        <div className="p-6 -mt-6 relative z-20 space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-lg border border-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full ${hasPaid ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                <CreditCard size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5">To'lov holati</p>
                <p className="font-bold text-slate-800">{month || "Joriy"} oyi uchun</p>
              </div>
            </div>
            <div className={`px-4 py-2 rounded-xl text-sm font-bold shadow-sm ${hasPaid ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
              {hasPaid ? "To'langan" : "Qarz"}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border shadow-sm flex items-center gap-4">
            <div className="p-3 bg-slate-50 text-slate-500 rounded-xl">
              <Phone size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5">Telefon raqam</p>
              <p className="font-bold text-slate-700">{student?.phone || "Kiritilmagan"}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <BookOpen size={20} />
              </div>
              <p className="font-bold text-slate-800 text-lg">Mening Fanlarim</p>
            </div>
            
            {groups.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {groups.map((g, idx) => (
                  <span key={idx} className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-4 py-2 rounded-xl text-sm font-bold">
                    {g}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm font-medium">Siz hali birorta guruhga qo'shilmagansiz.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}