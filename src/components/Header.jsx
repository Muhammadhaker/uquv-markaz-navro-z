import { useNavigate } from "react-router-dom";
import NotificationBell from "./NotificationBell"; 

export default function Header() {
  const navigate = useNavigate();
  const username = localStorage.getItem("username") || "Admin";

  return (
    <header className="bg-white shadow-sm px-4 md:px-8 py-4 flex justify-between items-center border-b h-16">
      
      {/* 🔥 CHAP TOMON: CRM TIZIMI yozuvi */}
      <h1 className="font-black text-slate-800 text-lg tracking-wider hidden md:block">
        CRM TIZIMI
      </h1>
      
      {/* Bu qism telefonda ham ko'rinishi uchun kichikroq o'lchamda */}
      <h2 className="font-bold text-slate-700 md:hidden">
         Bosh Admin
      </h2>
      
      <div className="flex items-center gap-3 sm:gap-4 ml-auto">
        
        <span className="font-bold text-slate-700 text-sm sm:text-base sm:font-medium sm:text-slate-600 truncate max-w-[120px] sm:max-w-none">
          {username}
        </span>
        
        <NotificationBell />

        <button
          onClick={() => {
            // 🔥 BU YERGA O'RNATISH TUGMASI QO'SHILDI
            const deferredPrompt = window.deferredPrompt; 
            if (deferredPrompt) {
              deferredPrompt.prompt();
            }
            
            localStorage.clear();
            navigate("/login");
          }}
          className="text-rose-500 font-bold text-xs sm:text-sm bg-rose-50 px-3 py-2 sm:px-4 sm:py-2 rounded-lg transition-colors hover:bg-rose-100 whitespace-nowrap"
        >
          Chiqish
        </button>
      </div>
    </header>
  );
}