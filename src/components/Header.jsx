import { useNavigate } from "react-router-dom";
import NotificationBell from "./NotificationBell"; 
import { Menu, LogOut } from "lucide-react"; // 🔥 Ikonkalar qo'shildi

export default function Header({ setIsOpen }) {
  const navigate = useNavigate();
  const username = localStorage.getItem("username") || "Admin";

  const handleLogout = () => {
    if (window.confirm("Tizimdan chiqmoqchimisiz?")) {
      localStorage.clear();
      navigate("/login", { replace: true });
    }
  };

  return (
    <header className="bg-white shadow-sm px-4 md:px-8 py-4 flex justify-between items-center border-b h-20 flex-shrink-0">
      
      {/* Chap qism: Menyu tugmasi (Mobil uchun) va CRM TIZIMI yozuvi */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setIsOpen(true)} 
          className="md:hidden p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors"
        >
          <Menu size={24} />
        </button>
        <h1 className="font-black text-slate-800 text-lg tracking-wider hidden md:block">
          CRM TIZIMI
        </h1>
      </div>
      
      {/* O'ng qism: Ism, Qo'ng'iroqcha va Chiqish tugmasi */}
      <div className="flex items-center gap-3 sm:gap-4 ml-auto">
        
        {/* Ismni chiroyli ramkada ko'rsatish */}
        <span className="font-bold text-slate-700 text-sm sm:text-base sm:font-medium truncate max-w-[120px] sm:max-w-none bg-slate-50 border px-3 py-1.5 rounded-xl hidden xs:block">
          {username}
        </span>
        
        {/* Bildirishnoma qo'ng'iroqchasi */}
        <NotificationBell />

        {/* 🔥 ZAMONAVIY CHIQISH TUGMASI */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 sm:px-4 text-sm font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 active:scale-95 border border-rose-200/60 rounded-xl transition-all shadow-sm"
        >
          <LogOut size={16} className="text-rose-500" />
          <span className="hidden xs:block">Chiqish</span>
        </button>

      </div>
    </header>
  );
}