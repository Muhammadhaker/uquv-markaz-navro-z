import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, CalendarCheck, UserCheck, X, Menu, History, Printer, Download } from "lucide-react"; // 🔥 Download ikonkasini qo'shdim
import { useState, useEffect } from "react";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const role = localStorage.getItem("userRole");
  
  // 🔥 YANGI: PWA (Ilova) o'rnatish so'rovini ushlab turuvchi state
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // ---- Barmoq bilan surish logikasi (O'zgarishsiz) ----
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    const handleTouchStart = (e) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    };

    const handleTouchEnd = (e) => {
      touchEndX = e.changedTouches[0].screenX;
      touchEndY = e.changedTouches[0].screenY;
      
      const xDiff = touchEndX - touchStartX;
      const yDiff = touchEndY - touchStartY;

      if (Math.abs(xDiff) > Math.abs(yDiff) && Math.abs(xDiff) > 50) {
        if (xDiff > 0) setIsOpen(true);
        else setIsOpen(false);
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);
    
    // 🔥 YANGI: Brauzer ilova o'rnatishga tayyorligini eshitib turish
    const handleBeforeInstallPrompt = (e) => {
      // Brauzer avtomatik oyna chiqarishini to'xtatamiz
      e.preventDefault();
      // O'zimizning tugmada ishlatish uchun eventni saqlab qo'yamiz
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // 🔥 YANGI: Yuklab olish tugmasi bosilganda ishlaydigan funksiya
  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // O'rnatish so'rov oynasini chiqaramiz
    deferredPrompt.prompt();
    
    // Foydalanuvchi "O'rnatish"ni tanladimi yoki "Bekor qilish"nimi, kutamiz
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null); // O'rnatilgach, tugmani menyudan yo'q qilamiz
    }
  };

  const navItems = [
    { to: "/dashboard", label: "Umumiy statistika", icon: LayoutDashboard, show: role === "super_admin" },
    { to: "/groups", label: "Guruhlar va To'lov", icon: Users, show: true },
    { to: "/attendance", label: "Davomat", icon: CalendarCheck, show: true },
    { to: "/badges", label: "Bejiklar chiqarish", icon: Printer, show: true },
    { to: "/admins", label: "Xodimlar", icon: UserCheck, show: role === "super_admin" },
    { to: "/logs", label: "Harakatlar tarixi", icon: History, show: role === "super_admin" },
  ];

  return (
    <>
      <button className="md:hidden p-4 text-slate-800 fixed top-0 left-0 z-50" onClick={() => setIsOpen(true)}>
        <Menu size={24} />
      </button>

      {isOpen && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity" onClick={() => setIsOpen(false)} />
      )}

      <div className={`${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:static inset-y-0 left-0 w-64 bg-slate-900 text-slate-300 transition-transform duration-300 z-50 flex flex-col shadow-2xl`}>
        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-800">
          <span className="text-white font-bold tracking-wider">CRM TIZIMI</span>
          <button className="md:hidden" onClick={() => setIsOpen(false)}><X size={24} /></button>
        </div>

        <div className="flex-1 px-4 py-6 flex flex-col justify-between overflow-y-auto">
          {/* Tepa qismdagi oddiy menyular */}
          <nav className="space-y-2">
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

          {/* 🔥 ENG PASTDA: Ilovani yuklash tugmasi (Faqat ilova hali o'rnatilmagan bo'lsa chiqadi) */}
          {deferredPrompt && (
            <div className="mt-auto pt-6 border-t border-slate-800">
              <button
                onClick={handleInstallClick}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
              >
                <Download size={20} />
                Ilovani yuklab olish
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}