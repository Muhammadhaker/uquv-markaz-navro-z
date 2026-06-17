import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  UserCheck,
  X,
  Menu,
  History, // <-- History ikonkasi qo'shildi
} from "lucide-react";
import { useState, useEffect } from "react";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const role = localStorage.getItem("userRole");

  // BARMOG' BILAN SURISH (SWIPE) FUNKSIYASI
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

      // Faqat gorizontal surish bo'lsagina ishlaydi (pastga/tepaga aylantirganda xalaqit bermaydi)
      if (Math.abs(xDiff) > Math.abs(yDiff) && Math.abs(xDiff) > 50) {
        if (xDiff > 0) setIsOpen(true); // Chapdan o'ngga surilganda menyuni ochish
        else setIsOpen(false); // O'ngdan chapga surilganda menyuni yopish
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  const navItems = [
    {
      to: "/dashboard",
      label: "Umumiy statistika",
      icon: LayoutDashboard,
      show: role === "super_admin",
    },
    { to: "/groups", label: "Guruhlar va To'lov", icon: Users, show: true },
    { to: "/attendance", label: "Davomat", icon: CalendarCheck, show: true },
    {
      to: "/admins",
      label: "Xodimlar",
      icon: UserCheck,
      show: role === "super_admin",
    },
    // YANGI QO'SHILGAN QATOR: Harakatlar tarixi
    {
      to: "/logs",
      label: "Harakatlar tarixi",
      icon: History,
      show: role === "super_admin",
    },
  ];

  return (
    <>
      <button
        className="md:hidden p-4 text-slate-800 fixed top-0 left-0 z-50"
        onClick={() => setIsOpen(true)}
      >
        <Menu size={24} />
      </button>

      {/* Overlay (mobil uchun) */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div
        className={`${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 fixed md:static inset-y-0 left-0 w-64 bg-slate-900 text-slate-300 transition-transform duration-300 z-50 flex flex-col shadow-2xl`}
      >
        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-800">
          <span className="text-white font-bold tracking-wider">
            CRM TIZIMI
          </span>
          <button className="md:hidden" onClick={() => setIsOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map(
            (item) =>
              item.show && (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-bold"
                        : "hover:bg-slate-800/60 hover:text-white text-slate-400"
                    }`
                  }
                >
                  <item.icon size={20} />
                  {item.label}
                </NavLink>
              )
          )}
        </nav>
      </div>
    </>
  );
}