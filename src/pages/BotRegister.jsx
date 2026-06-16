import { useState, useEffect } from "react";
import { User, Phone, Users, BookOpen, CheckCircle2 } from "lucide-react";

export default function BotRegister() {
  const [formData, setFormData] = useState({
    name: "",
    parentName: "",
    phone: "+998",
    groups: [],
  });
  
  const [chatId, setChatId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Telegram Web App muhitini aniqlash va chat_id ni olish
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand(); // Oynani to'liq ekranga ochish
      setChatId(tg.initDataUnsafe?.user?.id);
    }
  }, []);

  // Guruhlarni tanlash funksiyasi (Bir nechta tanlash imkoniyati)
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
    if (formData.groups.length === 0) {
      alert("Iltimos, kamida bitta guruhni tanlang!");
      return;
    }

    setIsSubmitting(true);

  try {
      // 1. Ma'lumotlarni o'zingizning API'ingizga yuboramiz
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          parentName: formData.parentName,
          phone: formData.phone,
          // Agar 2 ta guruh tanlasa "Matematika, Ingliz tili" qilib saqlaydi
          group: formData.groups.join(", "), 
          telegramChatId: chatId // Chek yuborish uchun eng kerakli narsa!
        }),
      });

      const data = await res.json();

      if (data.success) {
        setIsSuccess(true);
        // 3 soniyadan keyin Telegram oynasini avtomatik yopadi
        setTimeout(() => {
          window.Telegram?.WebApp?.close();
        }, 3000);
      } else {
        alert("Saqlashda xatolik yuz berdi!");
      }
    } catch (error) {
      console.error("Xatolik:", error);
      alert("Internet bilan muammo yuz berdi. Qaytadan urinib ko'ring.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <CheckCircle2 size={80} className="text-emerald-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Muvaffaqiyatli!</h2>
        <p className="text-slate-500">
          Siz ro'yxatdan o'tdingiz. Ma'lumotlaringiz adminga yuborildi.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 font-sans pb-20">
      <div className="max-w-md mx-auto bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        
        <div className="bg-indigo-600 p-6 text-white text-center rounded-b-[2.5rem] mb-6">
          <h1 className="text-2xl font-bold">Navro'z O'quv Markazi</h1>
          <p className="text-indigo-200 text-sm mt-1">Yangi o'quvchi anketasi</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* O'quvchi ismi */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">O'quvchi ism-familiyasi</label>
            <div className="relative">
              <User className="absolute left-3 top-3.5 text-slate-400" size={18} />
              <input
                required
                type="text"
                placeholder="Masalan: Tursunov Muhammad"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>
          </div>

          {/* Ota-ona ismi */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Ota yoki Onasining ism-familiyasi</label>
            <div className="relative">
              <Users className="absolute left-3 top-3.5 text-slate-400" size={18} />
              <input
                required
                type="text"
                placeholder="Masalan: Aliyev Vali"
                value={formData.parentName}
                onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>
          </div>

          {/* Telefon raqam */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Telefon raqam</label>
            <div className="relative">
              <Phone className="absolute left-3 top-3.5 text-slate-400" size={18} />
              <input
                required
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
              />
            </div>
          </div>

          {/* Guruh tanlash */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-3">Qaysi fanlardan o'qimoqchisiz? (Bir nechtasini tanlash mumkin)</label>
            <div className="grid grid-cols-2 gap-3">
              {["Matematika", "Ingliz tili"].map((fan) => {
                const isSelected = formData.groups.includes(fan);
                return (
                  <div
                    key={fan}
                    onClick={() => toggleGroup(fan)}
                    className={`cursor-pointer flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                        : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
                    }`}
                  >
                    <BookOpen size={24} className={`mb-2 ${isSelected ? "text-indigo-600" : "text-slate-400"}`} />
                    <span className="font-bold text-sm">{fan}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Yuborish tugmasi */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-200 disabled:opacity-70 flex items-center justify-center gap-2 mt-4"
          >
            {isSubmitting ? "Yuborilmoqda..." : "Tasdiqlash va Saqlash"}
          </button>
        </form>
      </div>
    </div>
  );
}