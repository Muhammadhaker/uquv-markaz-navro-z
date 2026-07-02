import { useState, useEffect } from "react";
import { Menu, Bell, User, LogOut, X, CheckCheck } from "lucide-react"; // 🔥 CheckCheck ikonasi qo'shildi

export default function Header({ setIsOpen }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  
  const role = localStorage.getItem("userRole");
  const username = localStorage.getItem("username");
  let fullName = localStorage.getItem("userFullName") || username;

  if (role === "super_admin" || username === "Muhammad") {
    fullName = "Tursunov Muhammad";
  } else if (username === "Navroz") {
    fullName = "G'ulomov Navro'z";
  } else if (!fullName) {
    fullName = "Xodim";
  }

  const roleLabels = {
    super_admin: "Super Admin",
    teacher: "Ustoz",
    assistant: "Yordamchi"
  };

  // 🔥 YANGI: MongoDB ID si ichidan vaqtni ajratib olish (Millisoniyalarda)
  const extractTimeFromId = (id) => {
    if (!id || id.length < 8) return 0;
    const time = parseInt(id.substring(0, 8), 16) * 1000;
    return isNaN(time) ? 0 : time;
  };

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch(`/api/bot?action=notifications&t=${Date.now()}`);
        const json = await res.json();
        if (json.success) {
          // Xotiradan qachon "O'qildi" bosilganini topamiz
          const clearTime = parseInt(localStorage.getItem('notifClearTime') || '0', 10);
          
          // Faqatgina "Tozalangan vaqt"dan keyin qo'shilgan YANGI o'quvchilarni filtrlaymiz
          const newNotifs = json.data.filter(s => extractTimeFromId(s._id) > clearTime);
          setNotifications(newNotifs);
        }
      } catch (err) { 
        console.error("Notif xatosi:", err); 
      }
    };
    
    fetchNotifications(); 
    const interval = setInterval(fetchNotifications, 60000); 
    return () => clearInterval(interval);
  }, []);

  // 🔥 YANGI: Barchasini o'qilgan deb belgilash funksiyasi
  const clearNotifications = () => {
    // Hozirgi vaqtni xotiraga yozamiz
    localStorage.setItem('notifClearTime', Date.now().toString());
    // Ro'yxatni tozalaymiz (Qizil nuqta darhol o'chadi)
    setNotifications([]);
    // Oynani yopamiz
    setShowNotifications(false);
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
      window.location.replace("/"); 
    }
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
        
        {/* 🔥 QO'NG'IROQCHA QISMI */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
            title="Bildirishnomalar"
          >
            <Bell size={20} className="sm:w-[22px] sm:h-[22px]" />
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white animate-pulse"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 z-50">
              
              <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 text-sm">
                  Yangi o'quvchilar {notifications.length > 0 && `(${notifications.length})`}
                </h3>
                
                <div className="flex items-center gap-2">
                  {/* 🔥 O'QILDI TUGMASI */}
                  {notifications.length > 0 && (
                    <button 
                      onClick={clearNotifications} 
                      className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:bg-emerald-100 bg-emerald-50 px-2 py-1.5 rounded-md transition-colors border border-emerald-100"
                      title="Barchasini o'qilgan deb belgilash"
                    >
                      <CheckCheck size={14} />
                      O'qildi
                    </button>
                  )}
                  <button 
                    onClick={() => setShowNotifications(false)} 
                    className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                  >
                    <X size={18}/>
                  </button>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6 font-medium">Yangi xabarlar yo'q 🎉</p>
                ) : (
                  notifications.map(s => (
                    <div key={s._id} className="p-2.5 bg-slate-50/80 rounded-lg border border-slate-100 text-xs font-bold text-slate-700 flex items-center gap-2 hover:bg-slate-100 transition-colors">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0"></span> 
                      {s.name} tizimga qo'shildi
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 md:pl-6 border-l border-slate-200">
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