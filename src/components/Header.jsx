import { Menu, Bell, User, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Header({ setIsOpen }) {
  const navigate = useNavigate();
  
  const fullName = localStorage.getItem("userFullName") || localStorage.getItem("username") || "Xodim";
  const role = localStorage.getItem("userRole");

  const roleLabels = {
    super_admin: "Super Admin",
    teacher: "Ustoz",
    assistant: "Yordamchi"
  };

  const handleLogout = (e) => {
    e.preventDefault(); // Brauzerning ortiqcha harakatlarini cheklash
    if (window.confirm("Tizimdan chiqmoqchimisiz?")) {
      // 🔥 clear() o'rniga kalitlarni bittalab o'chirish loop'larni to'xtatadi
      localStorage.removeItem("userId");
      localStorage.removeItem("userRole");
      localStorage.removeItem("username");
      localStorage.removeItem("userFullName");
      localStorage.removeItem("userPermissions");
      localStorage.removeItem("parentTeacherId");

      // Sahifani xavfsiz tozalab login oynasiga otish
      navigate("/", { replace: true });
      window.location.reload(); // Butun state'larni nollash uchun xavfsiz qayta yuklash
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 h-20 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setIsOpen(true)}
          className="md:hidden p-2 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <Menu size={24} className="text-slate-600" />
        </button>
        <h1 className="text-xl font-black text-slate-800 hidden sm:block tracking-wide">CRM TIZIMI</h1>
      </div>

      <div className="flex items-center gap-4 md:gap-6">
        <button className="relative p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors">
          <Bell size={22} />
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white"></span>
        </button>

        <div className="flex items-center gap-3 pl-4 md:pl-6 border-l border-slate-200">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-bold text-slate-800 leading-none">{fullName}</span>
            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-wider mt-1.5 bg-indigo-50 px-2 py-0.5 rounded-md">
              {roleLabels[role] || "Xodim"}
            </span>
          </div>
          
          <div className="w-10 h-10 rounded-full bg-indigo-100 border-2 border-indigo-200 flex items-center justify-center text-indigo-600 shadow-sm overflow-hidden">
            <User size={20} />
          </div>
          
          <button 
            onClick={handleLogout}
            className="ml-2 p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
            title="Tizimdan chiqish"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}