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

  useEffect(() => {
    // 1. Script yuklanganini tekshirish
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      setChatId(tg.initDataUnsafe?.user?.id || null);

      // Ilova ochilganda tepa rangini moslash
      tg.setHeaderColor("#4f46e5");
    }
  }, []);

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
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred(
          "success"
        );
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
          {/* Inputlar... (oldingi kod qoladi) */}
          <input
            required
            className="w-full p-4 bg-slate-50 border rounded-2xl"
            placeholder="O'quvchi ismi"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <input
            required
            className="w-full p-4 bg-slate-50 border rounded-2xl"
            placeholder="Ota-ona ismi"
            value={formData.parentName}
            onChange={(e) =>
              setFormData({ ...formData, parentName: e.target.value })
            }
          />
          <input
            required
            className="w-full p-4 bg-slate-50 border rounded-2xl"
            placeholder="+998"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
          />

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

          <button
            type="submit"
            className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg"
          >
            {isSubmitting ? "Yuborilmoqda..." : "Tasdiqlash"}
          </button>
        </form>
      </div>
    </div>
  );
}
