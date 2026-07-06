import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Bell, UserPlus, CheckCircle2, X } from "lucide-react";
import AddStudentModal from "./AddStudentModal";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState(null); 

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

  // 🔥 YANGI VA 100% ISHONCHLI MODAL KODI
  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      
      {/* Oynaning asosi (Telefon va kompyuterga avtomat moslashadi) */}
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden w-full max-w-md flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        
        <div className="p-4 sm:p-5 bg-indigo-600 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-base sm:text-lg">Yangi o'quvchilar</h3>
            <span className="text-xs bg-indigo-500 px-2.5 py-1 rounded-full font-bold shadow-sm">{notifications.length} ta</span>
          </div>
          <button 
            onClick={() => setIsOpen(false)} 
            className="p-2 bg-indigo-500 hover:bg-indigo-400 rounded-full transition-colors focus:outline-none"
          >
            <X size={18} />
          </button>
        </div>
        
        <div className="overflow-y-auto custom-scrollbar p-2 sm:p-3">
          {notifications.length === 0 ? (
            <div className="p-10 text-center text-slate-500 font-medium">
              Hozircha yangi o'quvchilar yo'q 🎉
            </div>
          ) : (
            <div className="divide-y divide-slate-100/50">
              {notifications.map(student => (
                <div 
                  key={student._id} 
                  onClick={() => handleStudentClick(student)} 
                  className="p-3 sm:p-4 hover:bg-indigo-50/60 rounded-2xl transition-all flex justify-between items-center group cursor-pointer m-1 border border-transparent hover:border-indigo-100"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-2 font-bold text-slate-800 text-sm sm:text-base">
                      <UserPlus size={16} className="text-indigo-500 flex-shrink-0" />
                      <span className="truncate block">
                        {student.name}
                      </span>
                    </div>
                    
                    {student.parentName && (
                      <div className="text-[11px] sm:text-xs text-slate-400 mt-1 ml-6 truncate">
                        Ota-onasi: <span className="text-slate-500 font-medium">{student.parentName}</span>
                      </div>
                    )}
                    
                    <div className="text-[11px] sm:text-xs text-slate-500 mt-1 ml-6 truncate font-medium">
                      {student.group} • <span className="text-slate-400">{new Date(student.addedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation(); 
                      markAsRead(e, student._id);
                    }}
                    className="p-2.5 sm:p-3 text-slate-300 bg-white shadow-sm border border-slate-100 rounded-xl hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-all flex-shrink-0 focus:outline-none group-hover:shadow-md"
                    title="Ko'rildi qilib belgilash"
                  >
                    <CheckCircle2 size={24} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(true)}
        className="relative p-2.5 bg-white rounded-full shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors focus:outline-none flex items-center justify-center"
      >
        <Bell size={22} className="text-slate-600" />
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] bg-rose-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-pulse px-1">
            {notifications.length}
          </span>
        )}
      </button>

      {/* Portal orqali oynani qayerda bo'lishidan qat'iy nazar to'ppa-to'g'ri o'rtaga joylaymiz */}
      {isOpen && typeof document !== 'undefined' && createPortal(modalContent, document.body)}

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