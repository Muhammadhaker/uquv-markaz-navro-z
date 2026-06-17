import { useState, useEffect } from "react";
import { Bell, UserPlus, CheckCircle2 } from "lucide-react";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNewStudents = async () => {
    try {
      const res = await fetch("/api/students");
      const data = await res.json();
      if (data.success) {
        // Faqat isNewStudent = true bo'lganlarni ajratib olamiz
        const newOnes = data.data.filter(s => s.isNewStudent);
        setNotifications(newOnes);
      }
    } catch (error) {
      console.error("Bildirishnomalarni yuklashda xato:", error);
    }
  };

  useEffect(() => {
    fetchNewStudents();
    // Har 30 soniyada yangi o'quvchilarni tekshirib turadi
    const interval = setInterval(fetchNewStudents, 30000);
    return () => clearInterval(interval);
  }, []);

  // O'quvchini "Ko'rildi" qilib belgilash
  const markAsRead = async (e, id) => {
    e.stopPropagation();
    try {
      await fetch("/api/students", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isNewStudent: false }) // Yangi holatini olib tashlaymiz
      });
      // Ro'yxatdan olib tashlaymiz
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="relative z-50">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 bg-white rounded-full shadow-sm hover:bg-slate-50 transition-colors"
      >
        <Bell size={24} className="text-slate-600" />
        {notifications.length > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white animate-pulse">
            {notifications.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
          <div className="p-4 bg-indigo-600 text-white flex justify-between items-center">
            <h3 className="font-bold">Yangi o'quvchilar</h3>
            <span className="text-xs bg-indigo-500 px-2 py-1 rounded-full">{notifications.length} ta</span>
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">
                Hozircha yangi o'quvchilar yo'q.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map(student => (
                  <div key={student._id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center group">
                    <div>
                      <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                        <UserPlus size={14} className="text-indigo-500" />
                        {student.name}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {student.group} • {new Date(student.addedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </div>
                    <button 
                      onClick={(e) => markAsRead(e, student._id)}
                      className="p-2 text-slate-300 hover:text-emerald-500 transition-colors"
                      title="Ko'rildi qilib belgilash"
                    >
                      <CheckCircle2 size={20} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}