import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, CalendarCheck, UserCheck, X, History, Printer, Download, Bot } from "lucide-react";
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

  useEffect(() => {
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

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [setIsOpen]);

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
    { 
      to: "/badges", 
      label: "Bejiklar chiqarish", 
      icon: Printer, 
      show: role === "super_admin" || role === "teacher" || (role === "assistant" && permissions.includes("badges"))
    },
    // 🔥 YANGI QO'SHILGAN QISM: Bot hisoboti
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