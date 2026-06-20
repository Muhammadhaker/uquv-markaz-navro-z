import { useNavigate } from "react-router-dom";
import NotificationBell from "./NotificationBell"; 

export default function Header() {
  const navigate = useNavigate();
  const username = localStorage.getItem("username") || "Admin";

  return (
    <header className="bg-white shadow-sm px-4 md:px-8 py-4 flex justify-between items-center border-b h-16">
      <h2 className="font-bold text-slate-700 hidden md:block">
        Bosh Admin Paneli
      </h2>
      
      {/* ml-auto orqali hamma elementlar o'ng tomonga taqaladi. pl-12 telefon menyusi tugmasiga joy tashlaydi */}
      <div className="flex items-center gap-3 sm:gap-4 ml-auto pl-12 md:pl-0">
        
        {/* 🔥 YASHRINISH OLIB TASHALDI: Endi telefonda ham doim ko'rinadi */}
        <span className="font-bold text-slate-700 text-sm sm:text-base sm:font-medium sm:text-slate-600 truncate max-w-[120px] sm:max-w-none">
          {username}
        </span>
        
        <NotificationBell />

        <button
          onClick={() => {
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