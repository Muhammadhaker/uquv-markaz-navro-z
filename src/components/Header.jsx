import { Menu, Bell, User, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Header({ setIsOpen }) {
  const navigate = useNavigate();
  
  // 🔥 Xotiradan to'liq ism va rolni olamiz
  const fullName = localStorage.getItem("userFullName") || localStorage.getItem("username") || "Xodim";
  const role = localStorage.getItem("userRole");

  const roleLabels = {
    super_admin: "Super Admin",
    teacher: "Ustoz",
    assistant: "Yordamchi"
  };

  const handleLogout = (e) => {
    e.preventDefault(); 
    if (window.confirm("Tizimdan chiqmoqchimisiz?")) {
      localStorage.removeItem("userId");
      localStorage.removeItem("userRole");
      localStorage.removeItem("username");
      localStorage.removeItem("userFullName");
      localStorage.removeItem("userPermissions");
      localStorage.removeItem("parentTeacherId");

      navigate("/", { replace: true });
      window.location.reload(); 
    }
  };

  // 🔥 Qo'ng'iroqcha bosilganda ishlaydigan funksiya
  const handleBellClick = () => {
    alert("Hozircha yangi bildirishnomalar yo'q!");
  };

  return (
    <header className="bg-white border-b border-slate-200 h-16 sm:h-20 px-3 sm:px-4 md:px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-2 sm:gap-4">
        <button 
          onClick={() => setIsOpen(true)}
          className="md:hidden p-2 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <Menu size={24} className="text-slate-600" />
        </button>
        <h1 className="text-lg sm:text-xl font-black text-slate-800 hidden sm:block tracking-wide">CRM TIZIMI</h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 md:gap-6">
        
        {/* 🔥 QO'NG'IROQCHA TUGMASI (Qizil nuqta olib tashlandi, OnClick qo'shildi) */}
        <button 
          onClick={handleBellClick}
          className="relative p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
          title="Bildirishnomalar"
        >
          <Bell size={20} className="sm:w-[22px] sm:h-[22px]" />
        </button>

        <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 md:pl-6 border-l border-slate-200">
          
          {/* 🔥 PROFIL MA'LUMOTLARI (Telefonda ham ko'rinadigan qilindi) */}
          <div className="flex flex-col items-end max-w-[120px] sm:max-w-[200px]">
            <span className="text-[11px] sm:text-sm font-bold text-slate-800 leading-none truncate w-full text-right">
              {fullName}
            </span>
            <span className="text-[8px] sm:text-[10px] font-black text-indigo-500 uppercase tracking-wider mt-1 sm:mt-1.5 bg-indigo-50 px-1.5 sm:px-2 py-0.5 rounded-md">
              {roleLabels[role] || "Xodim"}
            </span>
          </div>
          
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-sm overflow-hidden flex-shrink-0">
            <User size={18} className="sm:w-[20px] sm:h-[20px]" />
          </div>
          
          <button 
            onClick={handleLogout}
            className="ml-0 sm:ml-2 p-1.5 sm:p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
            title="Tizimdan chiqish"
          >
            <LogOut size={18} className="sm:w-[20px] sm:h-[20px]" />
          </button>
        </div>
      </div>
    </header>
  );
}