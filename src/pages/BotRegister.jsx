import { useState, useEffect } from "react";
import { User, Phone, Users, BookOpen, CheckCircle2 } from "lucide-react";

export default function BotRegister() {
  const [formData, setFormData] = useState({
    name: "",
    parentName: "",
    phone: "", // Boshida bo'sh turadi, placeholder ko'rinishi uchun
    groups: [],
  });

  const [chatId, setChatId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      setChatId(tg.initDataUnsafe?.user?.id || null);
      tg.setHeaderColor("#4f46e5");
    }
  }, []);

  // YANGI: Telefon raqamini Telegramdan so'rab oluvchi funksiya
  const requestPhoneFromTelegram = () => {
    const tg = window.Telegram?.WebApp;
    
    if (tg && tg.requestContact) {
      tg.requestContact((shared, data) => {
        if (shared && data?.responseUnsafe?.contact?.phone_number) {
          // Foydalanuvchi tasdiqlasa, raqamni saqlaymiz
          setFormData((prev) => ({
            ...prev,
            phone: data.responseUnsafe.contact.phone_number
          }));
        } else {
          // Bekor qilsa qat'iy ogohlantiramiz
          alert("Ro'yxatdan o'tish uchun raqamni ulashish majburiy!");
        }
      });
    } else {
      alert("Iltimos, anketani Telegram bot orqali oching.");
    }
  };

  const toggleGroup = (groupName) => {
    setFormData((prev) => {
      const isSelected = prev.groups.includes(groupName);
      return {
        ...prev,
        groups: isSelected
          ? prev.groups.filter((g) => g !== groupName)
          : [...prev.groups, groupName],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Raqam kiritilmagan bo'lsa to'xtatamiz
    if (!formData.phone) {
      alert("Iltimos, telefon raqamingizni Telegram orqali tasdiqlang!");
      return;
    }

    if (formData.groups.length === 0) {
      alert("Iltimos, kamida bitta guruhni tanlang!");
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
          phone: formData.phone,
          group: formData.groups.join(", "),
          telegramChatId: chatId,
        }),
      });

      if (res.ok) {
        setIsSuccess(true);
        if (window.Telegram?.WebApp) {
          window.Telegram.WebApp.HapticFeedback?.notificationOccurred("success");
          window.Telegram.WebApp.showAlert(
            "🎉 Muvaffaqiyatli ro'yxatdan o'tdingiz!", 
            () => {
              window.Telegram.WebApp.close(); 
            }
          );
        }
      } else {
        alert("Saqlashda xatolik!");
      }
    } catch (error) {
      alert("Internet bilan muammo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
        <CheckCircle2 size={80} className="text-emerald-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800">Muvaffaqiyatli!</h2>
        <p className="text-slate-500 mt-2">Siz ro'yxatdan o'tdingiz.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 animate-in fade-in duration-300">
      <div className="max-w-md mx-auto bg-white min-h-screen shadow-lg">
        <div className="bg-indigo-600 p-8 text-white text-center rounded-b-[3rem] mb-6">
          <h1 className="text-2xl font-bold">Navro'z O'quv Markazi</h1>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">O'quvchi ismi</label>
            <input
              required
              className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:border-indigo-500 transition-colors"
              placeholder="Masalan: Tursunov Muhammad"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Ota-onasi ismi</label>
            <input
              required
              className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:border-indigo-500 transition-colors"
              placeholder="Masalan: Eshmatov Eshmat"
              value={formData.parentName}
              onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
            />
          </div>

          {/* TELEFON RAQAM QISMI (YANGILANDI) */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Telefon raqam (Majburiy)</label>
            <input
              required
              readOnly // Qo'lda yozib bo'lmaydi
              className="w-full p-4 bg-slate-100 border border-slate-200 rounded-2xl outline-none text-slate-600 font-medium cursor-not-allowed"
              placeholder="Pastdagi tugmani bosing 👇"
              value={formData.phone}
            />
            
            <button
              type="button"
              onClick={requestPhoneFromTelegram}
              className="mt-2 w-full flex justify-center items-center gap-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 py-3.5 rounded-xl text-sm font-bold transition-all border border-indigo-200 shadow-sm"
            >
              📱 Telegram raqamni ulashish
            </button>
          </div>

          <div>
            <p className="text-[13px] text-slate-500 font-medium text-center mb-3 px-4">
              Qaysi fanlarga qatnashasiz? <br />
              <span className="text-[11px] opacity-80">(Ikkalasini ham tanlashingiz mumkin)</span>
            </p>
            <div className="grid grid-cols-2 gap-4">
              {["Matematika", "Ingliz tili"].map((fan) => (
                <div
                  key={fan}
                  onClick={() => toggleGroup(fan)}
                  className={`p-4 text-center rounded-2xl border-2 cursor-pointer transition-all ${
                    formData.groups.includes(fan)
                      ? "border-indigo-600 bg-indigo-50"
                      : "border-slate-100"
                  }`}
                >
                  <span className="font-bold text-sm">{fan}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-emerald-700 transition-colors"
          >
            {isSubmitting ? "Yuborilmoqda..." : "Tasdiqlash"}
          </button>
        </form>
      </div>
    </div>
  );
}