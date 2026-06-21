import { useState, useEffect } from "react";
import { User, Phone, BookOpen, CreditCard, Loader2, Bug, Clock, History, AlertCircle } from "lucide-react";

export default function Profile() {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [debugMsg, setDebugMsg] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      let currentChatId = null;

      const params = new URLSearchParams(window.location.search);
      currentChatId = params.get('chatId');

      if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        tg.setHeaderColor("#4f46e5");
        if (!currentChatId) currentChatId = tg.initDataUnsafe?.user?.id;
      }

      if (!currentChatId) {
        setLoading(false);
        setError(true);
        setDebugMsg("Telegram ID topilmadi. Ssilka yoki WebApp orqali muammo bor.");
        return;
      }

      try {
        const timestamp = new Date().getTime();
        const res = await fetch(`/api/student-profile?chatId=${currentChatId}&t=${timestamp}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
        });
        
        if (!res.ok) {
          setDebugMsg(`Server xatosi: ${res.status}`);
          setError(true);
          setLoading(false);
          return;
        }

        const data = await res.json();
        if (data.success) {
          setProfileData(data);
        } else {
          setDebugMsg(`Baza topmadi: ${data.message}`);
          setError(true);
        }
      } catch (err) {
        setDebugMsg(`Ulanishda xatolik: ${err.message}`);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const formatMonthName = (m) => {
    if (!m) return "";
    const [y, mm] = m.split("-");
    const names = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];
    return `${names[parseInt(mm) - 1]} ${y}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 w-full max-w-sm">
          <User className="mx-auto text-slate-300 mb-4" size={48} />
          <h2 className="text-xl font-bold text-slate-700">Profil topilmadi</h2>
          {debugMsg && <p className="text-red-500 text-xs mt-2">{debugMsg}</p>}
        </div>
      </div>
    );
  }

  const student = profileData?.data || {};
  const paymentStatus = profileData?.paymentStatus || "unpaid";
  const month = profileData?.month || "";
  const groups = student?.group ? student.group.split(',').map(g => g.trim()).filter(Boolean) : [];
  const history = profileData?.paymentsHistory || [];
  
  // Moliyaviy ma'lumotlar
  const qarz = profileData?.qarz || 300000;
  const totalPaid = profileData?.totalPaid || 0;
  const coursePrice = profileData?.coursePrice || 300000;
  const debtDetails = profileData?.debtDetails || []; // Har bir fan bo'yicha hisobot

  let statusConfig = {
    iconBg: "bg-rose-100 text-rose-600",
    badgeBg: "bg-rose-500 text-white",
    text: "Qarzdor",
    subText: `Jami to'lanmagan qarz: ${coursePrice.toLocaleString()} so'm`,
    icon: <CreditCard size={20} />
  };

  if (paymentStatus === "paid") {
    statusConfig = { 
      iconBg: "bg-emerald-100 text-emerald-600", 
      badgeBg: "bg-emerald-500 text-white", 
      text: "To'langan", 
      subText: "Siz bu oyni to'liq yopgansiz!",
      icon: <CreditCard size={20} /> 
    };
  } else if (paymentStatus === "partial") {
    statusConfig = { 
      iconBg: "bg-orange-100 text-orange-600", 
      badgeBg: "bg-orange-500 text-white", 
      text: "Qisman to'langan", 
      subText: `Umumiy qolgan qarz: ${qarz.toLocaleString()} so'm`,
      icon: <CreditCard size={20} /> 
    };
  } else if (paymentStatus === "excepted") {
    statusConfig = { 
      iconBg: "bg-amber-100 text-amber-600", 
      badgeBg: "bg-amber-500 text-white", 
      text: "Istisno", 
      subText: "Bu oy uchun ruxsat berilgan",
      icon: <Clock size={20} /> 
    };
  }

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
          
          {/* TO'LOV HOLATI (UMUMIY) */}
          <div className="bg-white rounded-2xl p-5 shadow-lg border border-slate-50 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-full ${statusConfig.iconBg}`}>{statusConfig.icon}</div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5">To'lov holati</p>
                  <p className="font-bold text-slate-800">{formatMonthName(month) || "Joriy oy"}</p>
                </div>
              </div>
              <div className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-sm ${statusConfig.badgeBg}`}>
                {statusConfig.text}
              </div>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border mt-1">
              <p className="text-sm font-bold text-slate-700">{statusConfig.subText}</p>
              {paymentStatus === "partial" && (
                <p className="text-xs text-slate-500 mt-1">Joriy oy uchun to'landi: <span className="font-bold text-emerald-600">{totalPaid.toLocaleString()} so'm</span></p>
              )}
            </div>
          </div>

          {/* 🔥 YANGI: FANLAR BO'YICHA ANIQ HISOBOT */}
          {debtDetails.length > 0 && (
            <div className="bg-white rounded-2xl p-5 border shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><AlertCircle size={20} /></div>
                <p className="font-bold text-slate-800 text-lg">Fanlar bo'yicha to'lov</p>
              </div>
              <div className="space-y-3">
                {debtDetails.map((d, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row justify-between sm:items-center bg-slate-50 p-3 rounded-xl border border-slate-100 gap-2">
                    <div>
                      <p className="font-bold text-slate-700 text-sm">{d.group}</p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">Shu fandan to'landi: <span className="text-slate-700">{d.paid.toLocaleString()}</span></p>
                    </div>
                    <div className="text-right">
                      {d.isPaid ? (
                        <span className="text-emerald-600 font-bold text-sm bg-emerald-50 px-2 py-1 rounded-lg">To'langan</span>
                      ) : (
                        <span className="text-rose-600 font-bold text-sm bg-rose-50 px-2 py-1 rounded-lg">Qarz: {d.qarz.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TELEFON */}
          <div className="bg-white rounded-2xl p-5 border shadow-sm flex items-center gap-4">
            <div className="p-3 bg-slate-50 text-slate-500 rounded-xl"><Phone size={20} /></div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5">Telefon raqam</p>
              <p className="font-bold text-slate-700">{student?.phone || "Kiritilmagan"}</p>
            </div>
          </div>

          {/* TO'LOVLAR TARIXI */}
          <div className="bg-white rounded-2xl p-5 border shadow-sm">
            <div className="flex items-center gap-3 mb-4 border-b pb-3">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><History size={20} /></div>
              <div>
                <p className="font-bold text-slate-800 text-lg">To'lovlar tarixi</p>
                <p className="text-xs text-slate-400">Barcha davr uchun amalga oshirilgan to'lovlar</p>
              </div>
            </div>

            {history.length > 0 ? (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {history.map((pay) => (
                  <div key={pay._id} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center hover:bg-slate-100 transition-colors">
                    <div>
                      {/* 🔥 Qaysi oy uchun ekanligi aniq ko'rinadi */}
                      <p className="font-bold text-indigo-600 text-sm">{formatMonthName(pay.month)} oyi uchun</p>
                      <p className="text-[11px] text-slate-500 font-medium mt-1">
                        <span className="bg-indigo-50 px-1.5 py-0.5 rounded text-indigo-700">{pay.groupName || "Guruhsiz"}</span> • {pay.paymentType || "Naqd"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-600 text-[15px]">+{Number(pay.amount || 0).toLocaleString()} <span className="text-xs">so'm</span></p>
                      <p className="text-[10px] text-slate-400 font-medium mt-1">{new Date(pay.date).toLocaleDateString("ru-RU", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute:'2-digit' })}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-2">
                  <CreditCard className="text-slate-300" size={24} />
                </div>
                <p className="text-slate-500 text-sm font-medium">Sizda to'lov tarixi mavjud emas.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}