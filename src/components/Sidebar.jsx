import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, CalendarCheck, UserCheck, X, History, Printer, Download, Bot, CalendarClock, BookOpenCheck, GraduationCap } from "lucide-react";
import { useState, useEffect } from "react";

export default function Sidebar({ isOpen, setIsOpen }) {
  const role = localStorage.getItem("userRole");
  
  let permissions = [];
  try {
    const stored = localStorage.getItem("userPermissions");
    permissions = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(permissions)) permissions = [];
  } catch(e) {
    permissions = [];
  }

  const [deferredPrompt, setDeferredPrompt] = useState(null);

  // TUZATISH: mobil qurilmada barmoq bilan surib (svayp) menyuni ochish/yopish
  // funksiyasi shu yerda yo'q ekan — avvalgi tahrirda men bu funksiya
  // Sidebar.jsx'da mavjud deb noto'g'ri taxmin qilib, Layout.jsx'dagi
  // nusxasini o'chirib tashlagan edim.
  //
  // IKKINCHI TUZATISH: faqat `touchend`ni kutish ishonchsiz ekan — ko'p mobil
  // brauzerlar ekran chetidan svayp qilinganda buni o'zining "orqaga qaytish"
  // ishorasi deb qabul qilib, teginish hodisasini oxirigacha yetkazmasligi
  // mumkin (touchend o'rniga touchcancel bo'lib qoladi). Shu sabab endi
  // `touchmove` orqali harakatni REAL VAQTDA kuzatamiz va yetarli masofaga
  // surilgan zahoti (touchend'ni kutmasdan) menyuni ochamiz/yopamiz. Bundan
  // tashqari index.css'da `touch-action: pan-y` qo'shildi — bu brauzerning
  // gorizontal ishorani "yutib yubormasligi" uchun kerak.
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let tracking = false;
    let handled = false;

    const EDGE_ZONE_PX = 50;   // faqat shu masofadagi chapdan boshlangan svayp menyuni ochadi
    const TRIGGER_PX = 60;     // shuncha piksel surilgach amal bajariladi

    const handleTouchStart = (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      tracking = true;
      handled = false;
    };

    const handleTouchMove = (e) => {
      if (!tracking || handled) return;

      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const xDiff = currentX - startX;
      const yDiff = currentY - startY;

      // Vertikal harakat gorizontaldan katta bo'lsa — bu skroll, e'tiborsiz qoldiramiz
      if (Math.abs(yDiff) > Math.abs(xDiff)) return;

      if (!isOpen && startX < EDGE_ZONE_PX && xDiff > TRIGGER_PX) {
        setIsOpen(true);
        handled = true;
      } else if (isOpen && xDiff < -TRIGGER_PX) {
        setIsOpen(false);
        handled = true;
      }
    };

    const handleTouchEnd = () => {
      tracking = false;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isOpen, setIsOpen]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    } else {
      alert(
        "📥 ILONVANI O'RNATISH QO'LLANMASI:\n\n" +
        "🤖 Android: Brauzer menyusidan «Bosh ekranga qo'shish»ni tanlang.\n\n" +
        "🍎 iPhone: Share tugmasini bosib «Ekranga qo'shish»ni tanlang."
      );
    }
  };

  const navItems = [
    { 
      to: "/dashboard", 
      label: "Umumiy statistika", 
      icon: LayoutDashboard, 
      show: role === "super_admin" || role === "teacher" || (role === "assistant" && permissions.includes("dashboard"))
    },
    { 
      to: "/groups", 
      label: "Guruhlar va To'lov", 
      icon: Users, 
      show: role === "super_admin" || role === "teacher" || (role === "assistant" && permissions.includes("groups"))
    },
    { 
      to: "/attendance", 
      label: "Davomat", 
      icon: CalendarCheck, 
      show: role === "super_admin" || role === "teacher" || (role === "assistant" && permissions.includes("attendance"))
    },
    // YANGI: Dars jadvali
    {
      to: "/schedule",
      label: "Dars Jadvali",
      icon: CalendarClock,
      show: role === "super_admin" || role === "teacher" || (role === "assistant" && permissions.includes("schedule"))
    },
    // YANGI: Uy vazifalari
    {
      to: "/homework",
      label: "Uy Vazifalari",
      icon: BookOpenCheck,
      show: role === "super_admin" || role === "teacher" || (role === "assistant" && permissions.includes("homework"))
    },
    // YANGI: Baholar
    {
      to: "/grades",
      label: "Baholar",
      icon: GraduationCap,
      show: role === "super_admin" || role === "teacher" || (role === "assistant" && permissions.includes("grades"))
    },
    { 
      to: "/badges", 
      label: "Bejiklar chiqarish", 
      icon: Printer, 
      show: role === "super_admin" || role === "teacher" || (role === "assistant" && permissions.includes("badges"))
    },
    { 
      to: "/cron-logs", 
      label: "Bot hisoboti", 
      icon: Bot, 
      show: role === "super_admin" || role === "teacher" || (role === "assistant" && permissions.includes("cron_logs"))
    },
    { to: "/admins", label: "Xodimlar", icon: UserCheck, show: role === "super_admin" },
    { to: "/logs", label: "Harakatlar tarixi", icon: History, show: role === "super_admin" },
  ];

  return (
    <>
      {isOpen && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity" onClick={() => setIsOpen(false)} />
      )}

      <div className={`${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:static inset-y-0 left-0 w-64 bg-slate-900 text-slate-300 transition-transform duration-300 z-50 flex flex-col shadow-2xl`}>
        <div className="h-20 flex-shrink-0 flex items-center justify-between px-6 border-b border-slate-800">
          <span className="text-white font-bold tracking-wider">CRM TIZIMI</span>
          <button className="md:hidden" onClick={() => setIsOpen(false)}><X size={24} /></button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
          {navItems.map((item) => item.show && (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${isActive ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-bold" : "hover:bg-slate-800/60 hover:text-white text-slate-400"}`}
            >
              <item.icon size={20} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex-shrink-0 p-4 border-t border-slate-800 bg-slate-900">
          <button
            onClick={handleInstallClick}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            <Download size={20} />
            Ilovani yuklab olish
          </button>
        </div>
      </div>
    </>
  );
}