import { useState, useEffect, useRef } from "react";
import { Bell, UserPlus, CheckCircle2, X } from "lucide-react";
import AddStudentModal from "./AddStudentModal";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState(null); 
  const dropdownRef = useRef(null);

  const fetchNewStudents = async () => {
    try {
      const res = await fetch("/api/students");
      const data = await res.json();
      if (data.success) {
        const newOnes = data.data.filter(s => s.isNewStudent);
        setNotifications(newOnes);
      }
    } catch (error) {
      console.error("Bildirishnomalarni yuklashda xato:", error);
    }
  };

  useEffect(() => {
    fetchNewStudents();
    const interval = setInterval(fetchNewStudents, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAsRead = async (e, id) => {
    if (e) e.stopPropagation();
    try {
      await fetch("/api/students", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isNewStudent: false })
      });
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (error) {
      console.error(error);
    }
  };

  const handleStudentClick = (student) => {
    setStudentToEdit(student); 
    setIsOpen(false); 
    markAsRead(null, student._id); 
  };

  return (
    <div className="relative z-[100]" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 bg-white rounded-full shadow-sm hover:bg-slate-50 transition-colors focus:outline-none"
      >
        <Bell size={24} className="text-slate-600" />
        {notifications.length > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white animate-pulse">
            {notifications.length}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* 🔥 MOBIL UCHUN BLUR FON: Orqa qismni xiralashtiradi va fokusni oynaga qaratadi */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[90] sm:hidden animate-in fade-in duration-200" 
            onClick={() => setIsOpen(false)}
          ></div>

          {/* 🔥 AQLLI MARKAZLASHTIRISH: 
              Mobil telefonda mutloq ekran markazida (top-1/2 left-1/2 va translate-x/y-1/2) dynamic o'lchamda turadi.
              Katta kompyuter ekranida esa (sm:) avtomat qo'ng'iroqcha tagiga chiroyli qaytib joylashadi. */}
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-32px)] max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-[100] animate-in zoom-in-95 duration-200 sm:absolute sm:top-full sm:left-auto sm:right-0 sm:bottom-auto sm:translate-x-0 sm:translate-y-0 sm:w-80 sm:mt-3 sm:rounded-2xl">
            
            <div className="p-4 bg-indigo-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base">Yangi o'quvchilar</h3>
                <span className="text-xs bg-indigo-500 px-2 py-1 rounded-full font-bold">{notifications.length} ta</span>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-1.5 bg-indigo-500 hover:bg-indigo-400 rounded-full transition-colors focus:outline-none"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="max-h-[50vh] sm:max-h-80 overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm font-medium">
                  Hozircha yangi o'quvchilar yo'q 🎉
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {notifications.map(student => (
                    <div 
                      key={student._id} 
                      onClick={() => handleStudentClick(student)} 
                      className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center group cursor-pointer"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                          <UserPlus size={14} className="text-indigo-500 flex-shrink-0" />
                          <span className="truncate block">
                            {student.name}
                          </span>
                        </div>
                        
                        {student.parentName && (
                          <div className="text-[11px] text-slate-400 mt-0.5 ml-5 truncate">
                            Ota-onasi: <span className="text-slate-500 font-medium">{student.parentName}</span>
                          </div>
                        )}
                        
                        <div className="text-xs text-slate-500 mt-1 ml-5 truncate">
                          {student.group} • {new Date(student.addedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation(); 
                          markAsRead(e, student._id);
                        }}
                        className="p-2 text-slate-300 hover:text-emerald-500 transition-colors flex-shrink-0 focus:outline-none"
                        title="Ko'rildi qilib belgilash"
                      >
                        <CheckCircle2 size={22} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {studentToEdit && (
        <AddStudentModal
          isOpen={true}
          studentToEdit={studentToEdit}
          onClose={() => {
            setStudentToEdit(null);
            fetchNewStudents();
          }}
        />
      )}
    </div>
  );
}