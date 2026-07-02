import { useState, useEffect } from "react";
import { User, Phone, Users, BookOpen, CheckCircle2, Loader2, UserCheck } from "lucide-react";

export default function BotRegister() {
  const [formData, setFormData] = useState({
    name: "",
    parentName: "",
    phone: "",
  });

  const [chatId, setChatId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [loading, setLoading] = useState(true); 
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

  const [teachers, setTeachers] = useState([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");

  // 🔥 YANGI: Telefon raqamni O'zbekiston standartiga (probellar bilan) moslovchi funksiya
  const formatPhoneNumber = (phoneStr) => {
    if (!phoneStr) return "";
    // Faqat raqamlarni ajratib olamiz (masalan: +998901234567 -> 998901234567)
    const cleaned = ('' + phoneStr).replace(/\D/g, ''); 
    
    // Agar raqam 998 bilan boshlansa va 12 xonali bo'lsa, chiroyli qilib kesib chiqamiz
    if (cleaned.startsWith('998') && cleaned.length === 12) {
      const match = cleaned.match(/^(\d{3})(\d{2})(\d{3})(\d{2})(\d{2})$/);
      if (match) {
        return `+${match[1]} ${match[2]} ${match[3]} ${match[4]} ${match[5]}`;
      }
    }
    // Agar boshqa davlat raqami bo'lsa yoki xato bo'lsa, shunchaki + bilan o'zini qaytaramiz
    return '+' + cleaned;
  };

  useEffect(() => {
    let currentId = null;

    try {
      if (typeof window !== "undefined" && window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        try { tg.setHeaderColor("#4f46e5"); } catch (e) {} 
        
        currentId = tg.initDataUnsafe?.user?.id || null;
      }
    } catch (e) {
      console.warn("Telegram WebApp obyekti topilmadi yoki xato:", e);
    }

    if (!currentId) {
      const params = new URLSearchParams(window.location.search);
      currentId = params.get('chatId');
    }

    setChatId(currentId);

    const initFetch = async () => {
      try {
        const authRes = await fetch("/api/auth");
        if(authRes.ok) {
           const authData = await authRes.json();
           if (authData.success && Array.isArray(authData.data)) {
             const activeTeachers = authData.data.filter(u => u.role === "teacher");
             setTeachers(activeTeachers);
           }
        }

        if (currentId) {
          const studentRes = await fetch(`/api/students?telegramChatId=${currentId}`);
          if(studentRes.ok) {
             const studentData = await studentRes.json();
             if (studentData.exists) {
               setAlreadyRegistered(true);
               setIsSuccess(true);
             }
          }
        }
      } catch (err) {
        console.error("Ma'lumotlarni yuklashda xatolik:", err);
      } finally {
        setLoading(false);
      }
    };

    initFetch();
  }, []);

  const requestPhoneFromTelegram = () => {
    try {
      const tg = window.Telegram?.WebApp;
      
      if (tg && tg.requestContact) {
        tg.requestContact((shared, data) => {
          if (shared && data?.responseUnsafe?.contact?.phone_number) {
            
            // 🔥 YECHIM: Raqamni olyapmiz va formatlayapmiz!
            const rawPhone = data.responseUnsafe.contact.phone_number;
            const formattedPhone = formatPhoneNumber(rawPhone);

            setFormData((prev) => ({
              ...prev,
              phone: formattedPhone
            }));

          } else {
            alert("Ro'yxatdan o'tish uchun raqamni ulashish majburiy!");
          }
        });
      } else {
        alert("Iltimos, anketani Telegram bot orqali oching.");
      }
    } catch (error) {
       console.error("Telegram kontakt so'rash xatosi:", error);
       alert("Telefon raqamni avtomatik olishning iloji bo'lmadi. Dasturni Telegram orqali qayta oching.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.phone) {
      alert("Iltimos, telefon raqamingizni Telegram orqali tasdiqlang!");
      return;
    }

    if (!selectedTeacherId) {
      alert("Iltimos, darsiga qatnashmoqchi bo'lgan ustozingizni tanlang!");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          parentName: formData.parentName,
          phone: formData.phone, // 🔥 Bu endi chiroyli "+998 XX XXX XX XX" shaklida ketadi
          group: "Yangi ro'yxatdan o'tgan",
          teacherId: selectedTeacherId, 
          telegramChatId: chatId, 
        }),
      });

      if (res.ok) {
        setIsSuccess(true);
        try {
          if (typeof window !== "undefined" && window.Telegram?.WebApp) {
            window.Telegram.WebApp.HapticFeedback?.notificationOccurred("success");
            window.Telegram.WebApp.showAlert(
              "🎉 Muvaffaqiyatli ro'yxatdan o'tdingiz!", 
              () => {
                window.Telegram.WebApp.close(); 
              }
            );
          }
        } catch(e) { console.log(e); }
      } else {
        alert("Saqlashda xatolik yuz berdi!");
      }
    } catch (error) {
      alert("Internet bilan muammo yuz berdi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
        <CheckCircle2 size={80} className="text-emerald-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800">
          {alreadyRegistered ? "Tizimdasiz!" : "Muvaffaqiyatli!"}
        </h2>
        <p className="text-slate-500 mt-2">
          {alreadyRegistered 
            ? "Siz allaqachon ro'yxatdan o'tgansiz." 
            : "Arizangiz qabul qilindi. Tez orada ustozingiz bog'lanadi!"}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 animate-in fade-in duration-300">
      <div className="max-w-md mx-auto bg-white min-h-screen shadow-lg">
        <div className="bg-indigo-600 p-8 text-white text-center rounded-b-[3rem] mb-6 shadow-md">
          <h1 className="text-2xl font-black tracking-wide">O'QUV MARKAZI</h1>
          <p className="text-indigo-100 text-xs mt-1 font-medium">Yangi o'quvchilarni ro'yxatdan o'tkazish anketasi</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">O'quvchi ismi (F.I.SH)</label>
            <input
              required
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 transition-colors font-medium text-slate-700"
              placeholder="Masalan: Tursunov Muhammad"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Ota-onasi ismi (F.I.SH)</label>
            <input
              required
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 transition-colors font-medium text-slate-700"
              placeholder="Masalan: G'ulomov Navro'z"
              value={formData.parentName}
              onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Telefon raqam (Tasdiqlash)</label>
            <input
              required
              disabled
              className="w-full p-4 bg-slate-100 border border-slate-200 rounded-2xl outline-none text-slate-800 font-black tracking-wider cursor-not-allowed text-center"
              placeholder="Pastdagi ko'k tugmani bosing 👇"
              value={formData.phone}
            />
            
            <button
              type="button"
              onClick={requestPhoneFromTelegram}
              className="mt-2 w-full flex justify-center items-center gap-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 py-3.5 rounded-xl text-sm font-bold transition-all border border-indigo-200 shadow-sm active:scale-95"
            >
              📱 Telegram raqamni yuborish
            </button>
          </div>

          <div className="space-y-3 pt-2">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1 block text-center">
              Qaysi ustoz (fan) guruhiga yozilmoqchisiz?
            </label>
            
            <div className="grid grid-cols-1 gap-3">
              {teachers.map((t) => (
                <div
                  key={t._id}
                  onClick={() => setSelectedTeacherId(t._id)}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                    selectedTeacherId === t._id
                      ? "border-indigo-600 bg-indigo-50 text-indigo-900 shadow-sm scale-[1.01]"
                      : "border-slate-100 bg-slate-50/50 text-slate-700 hover:border-slate-200"
                  }`}
                >
                  <div className={`p-2 rounded-xl transition-colors ${selectedTeacherId === t._id ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    <UserCheck size={18} />
                  </div>
                  <div className="text-left overflow-hidden flex-1">
                    <span className="font-bold text-sm block truncate">{t.fullName || t.username}</span>
                    
                    <span className="text-[11px] text-indigo-500 font-bold flex items-center gap-1 mt-0.5">
                      <BookOpen size={12} /> {t.subject || "Umumiy Fan"}
                    </span>
                  </div>
                </div>
              ))}
              
              {teachers.length === 0 && (
                <p className="text-center text-xs text-slate-400 py-4 font-medium italic">Hozircha ro'yxatdan o'tish uchun ustozlar mavjud emas.</p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || teachers.length === 0}
            className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 text-base flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <><Loader2 className="animate-spin" size={20}/> Yuborilmoqda...</>
            ) : "Tasdiqlash va Yuborish"}
          </button>
        </form>
      </div>
    </div>
  );
}