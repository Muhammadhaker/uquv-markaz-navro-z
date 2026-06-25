import { useState, useEffect } from "react";
import { User, Phone, CreditCard, Loader2, Clock, History, AlertCircle, CalendarDays, QrCode, MoreVertical, LogOut, Users, ChevronRight } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export default function Profile() {
  const getTargetMonth = () => {
    const today = new Date();
    let year = today.getFullYear();
    let month = today.getMonth() + 1;
    if (today.getDate() <= 5) {
      month -= 1;
      if (month === 0) { month = 12; year -= 1; }
    }
    return `${year}-${String(month).padStart(2, "0")}`;
  };

  const defaultMonthStr = getTargetMonth();

  // 🔥 YANGI HOLATLAR (STATE)
  const [studentsList, setStudentsList] = useState([]); // Barcha bolalar ro'yxati
  const [selectedIdx, setSelectedIdx] = useState(null); // Qaysi bolani ko'ryapti
  const [showMenu, setShowMenu] = useState(false); // Burchakdagi menyu

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [debugMsg, setDebugMsg] = useState("");
  const [showQR, setShowQR] = useState(false); 
  const [selectedHistoryMonth, setSelectedHistoryMonth] = useState(defaultMonthStr);

  useEffect(() => {
    const fetchProfile = async () => {
      let currentChatId = null;

      const params = new URLSearchParams(window.location.search);
      currentChatId = params.get('chatId');

      if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        tg.setHeaderColor("#4f46e5");
        if (!currentChatId) currentChatId = tg.initDataUnsafe?.user?.id;
      }

      if (!currentChatId) {
        setLoading(false);
        setError(true);
        setDebugMsg("Telegram ID topilmadi.");
        return;
      }

      try {
        const timestamp = new Date().getTime();
        const res = await fetch(`/api/student-profile?chatId=${currentChatId}&t=${timestamp}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
        });
        
        if (!res.ok) {
          setDebugMsg(`Server xatosi: ${res.status}`);
          setError(true);
          setLoading(false);
          return;
        }

        const data = await res.json();
        if (data.success && data.students.length > 0) {
          setStudentsList(data.students);
          // Agar faqat 1 ta bola bo'lsa, to'g'ridan-to'g'ri uning profiliga kiradi
          if (data.students.length === 1) {
            setSelectedIdx(0);
          }
        } else {
          setDebugMsg(`Baza topmadi: ${data.message}`);
          setError(true);
        }
      } catch (err) {
        setDebugMsg(`Ulanishda xatolik: ${err.message}`);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // 🔥 PROFILNI UZISH FUNKSIYASI
  const handleDisconnect = async () => {
    if (!window.confirm("Haqiqatan ham bu profilni hisobingizdan uzib tashlamoqchimisiz?")) return;
    
    const currentStudent = studentsList[selectedIdx];
    setLoading(true);
    setShowMenu(false);

    try {
      const res = await fetch('/api/student-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect', studentId: currentStudent.data._id })
      });
      const result = await res.json();
      
      if (result.success) {
        // Muvaffaqiyatli uzilsa, shu bolani ro'yxatdan olib tashlaymiz
        const newList = studentsList.filter((_, idx) => idx !== selectedIdx);
        setStudentsList(newList);
        
        if (newList.length === 1) setSelectedIdx(0);
        else if (newList.length > 1) setSelectedIdx(null); // Tanlash ekraniga qaytadi
        else {
          setError(true); // Agar umuman bola qolmasa, xato ekrani chiqadi
          setDebugMsg("Sizda ulangan profillar qolmadi.");
        }
      } else {
        alert("Xatolik: " + result.message);
      }
    } catch (error) {
      alert("Internet xatosi!");
    } finally {
      setLoading(false);
    }
  };

  const formatMonthName = (m) => {
    if (!m) return "";
    const [y, mm] = m.split("-");
    const names = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];
    return `${names[parseInt(mm) - 1]} ${y}`;
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>;
  }

  if (error || studentsList.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 w-full max-w-sm">
          <User className="mx-auto text-slate-300 mb-4" size={48} />
          <h2 className="text-xl font-bold text-slate-700">Profil topilmadi</h2>
          {debugMsg && <p className="text-red-500 text-xs mt-2">{debugMsg}</p>}
        </div>
      </div>
    );
  }

  // ==========================================
  // 🔥 1. PROFIL TANLASH EKRANI (KIRISH QISMI)
  // ==========================================
  if (selectedIdx === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col p-6 animate-in fade-in duration-300">
        <div className="text-center mt-10 mb-8">
          <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users size={40} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Qaysi profilga kirasiz?</h2>
          <p className="text-slate-500 text-sm mt-2">Sizning hisobingizga {studentsList.length} ta o'quvchi ulangan</p>
        </div>

        <div className="space-y-4 max-w-md mx-auto w-full">
          {studentsList.map((st, idx) => (
            <button 
              key={st.data._id} 
              onClick={() => setSelectedIdx(idx)}
              className="w-full bg-white p-5 rounded-2xl shadow-sm border border-slate-100 text-left flex items-center gap-4 hover:border-indigo-300 hover:shadow-md transition-all active:scale-[0.98]"
            >
              <div className="w-14 h-14 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                <User size={24} />
              </div>
              <div className="flex-1 overflow-hidden">
                <h3 className="font-bold text-lg text-slate-800 truncate">{st.data.name}</h3>
                <p className="text-sm text-slate-500 truncate">{st.data.group || "Guruhsiz"}</p>
              </div>
              <div className="text-slate-300">
                <ChevronRight size={24} />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ==========================================
  // 🔥 2. ASOSIY PROFIL EKRANI (TANLANGANDAN SO'NG)
  // ==========================================
  const currentProfile = studentsList[selectedIdx];
  const student = currentProfile.data;
  const paymentStatus = currentProfile.paymentStatus;
  const month = currentProfile.month;
  const history = currentProfile.paymentsHistory;
  
  const qarz = currentProfile.qarz;
  const totalPaid = currentProfile.totalPaid;
  const coursePrice = currentProfile.coursePrice;
  const debtDetails = currentProfile.debtDetails; 

  let statusConfig = {
    iconBg: "bg-rose-100 text-rose-600",
    badgeBg: "bg-rose-500 text-white",
    text: "Qarzdor",
    subText: `Jami to'lanmagan qarz: ${coursePrice.toLocaleString()} so'm`,
    icon: <CreditCard size={20} />
  };

  if (paymentStatus === "paid") {
    statusConfig = { iconBg: "bg-emerald-100 text-emerald-600", badgeBg: "bg-emerald-500 text-white", text: "To'langan", subText: "Siz bu oyni to'liq yopgansiz!", icon: <CreditCard size={20} /> };
  } else if (paymentStatus === "partial") {
    statusConfig = { iconBg: "bg-orange-100 text-orange-600", badgeBg: "bg-orange-500 text-white", text: "Qisman to'langan", subText: `Umumiy qolgan qarz: ${qarz.toLocaleString()} so'm`, icon: <CreditCard size={20} /> };
  } else if (paymentStatus === "excepted") {
    statusConfig = { iconBg: "bg-amber-100 text-amber-600", badgeBg: "bg-amber-500 text-white", text: "Istisno", subText: "Bu oy uchun ruxsat berilgan", icon: <Clock size={20} /> };
  }

  let uniqueHistoryMonths = [...new Set(history.map(p => p.month))];
  if (!uniqueHistoryMonths.includes(defaultMonthStr)) uniqueHistoryMonths.push(defaultMonthStr);
  uniqueHistoryMonths.sort((a, b) => b.localeCompare(a));
  const filteredHistory = selectedHistoryMonth === "all" ? history : history.filter(p => p.month === selectedHistoryMonth);

  return (
    <div className="min-h-screen bg-slate-50 pb-20 animate-in fade-in duration-300">
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-lg relative">
        
        <div className="bg-indigo-600 px-6 py-10 text-center rounded-b-[3rem] relative overflow-visible">
          
          {/* 🔥 BURCHAKDAGI MENYU (ALMASHTIRISH / UZISH) */}
          <div className="absolute top-4 right-4 z-50">
            <button 
              onClick={() => setShowMenu(!showMenu)} 
              className="w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-colors"
            >
              <MoreVertical size={20} />
            </button>
            
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}></div>
                <div className="absolute top-12 right-0 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                  {studentsList.length > 1 && (
                    <button 
                      onClick={() => { setSelectedIdx(null); setShowMenu(false); }}
                      className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 border-b flex items-center gap-3"
                    >
                      <Users size={16} className="text-indigo-500" /> Boshqa profilga o'tish
                    </button>
                  )}
                  <button 
                    onClick={handleDisconnect}
                    className="w-full text-left px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-3"
                  >
                    <LogOut size={16} /> Profilni uzib tashlash
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="relative z-10 mt-2">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-white/40 shadow-xl">
              <User size={36} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">{student?.name || "Noma'lum o'quvchi"}</h1>
            <p className="text-indigo-100 font-medium mt-1 text-sm">Shaxsiy Kabinet</p>
          </div>
        </div>

        <div className="p-6 -mt-6 relative z-20 space-y-4">
          
          <button onClick={() => setShowQR(!showQR)} className="w-full bg-slate-800 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between hover:bg-slate-900 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl"><QrCode size={20} /></div>
              <div className="text-left">
                <p className="font-bold">Mening QR-kodim</p>
                <p className="text-[11px] text-slate-300">Davomat uchun ko'rsating</p>
              </div>
            </div>
            <span className="text-xs font-bold bg-white/20 px-3 py-1.5 rounded-lg">{showQR ? "Yopish" : "Ochish"}</span>
          </button>

          {showQR && (
            <div className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col items-center justify-center animate-in zoom-in duration-200">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 mb-3">
                <QRCodeSVG value={student._id} size={180} level="H" />
              </div>
              <p className="text-xs text-slate-400 font-medium text-center">Ushbu kodni darsga kirishda<br/>o'qituvchiga ko'rsating</p>
            </div>
          )}

          <div className="bg-white rounded-2xl p-5 shadow-lg border border-slate-50 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-full ${statusConfig.iconBg}`}>{statusConfig.icon}</div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5">To'lov holati</p>
                  <p className="font-bold text-slate-800">{formatMonthName(month)}</p>
                </div>
              </div>
              <div className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-sm ${statusConfig.badgeBg}`}>
                {statusConfig.text}
              </div>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border mt-1">
              <p className="text-sm font-bold text-slate-700">{statusConfig.subText}</p>
              {paymentStatus === "partial" && (
                <p className="text-xs text-slate-500 mt-1">Joriy oy uchun to'landi: <span className="font-bold text-emerald-600">{totalPaid.toLocaleString()} so'm</span></p>
              )}
            </div>
          </div>

          {debtDetails.length > 0 && (
            <div className="bg-white rounded-2xl p-5 border shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><AlertCircle size={20} /></div>
                <p className="font-bold text-slate-800 text-lg">Fanlar bo'yicha to'lov</p>
              </div>
              <div className="space-y-3">
                {debtDetails.map((d, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row justify-between sm:items-center bg-slate-50 p-3 rounded-xl border border-slate-100 gap-2">
                    <div>
                      <p className="font-bold text-slate-700 text-sm">{d.group}</p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">Shu fandan to'landi: <span className="text-slate-700">{d.paid.toLocaleString()}</span></p>
                    </div>
                    <div className="text-right">
                      {d.isPaid ? (
                        <span className="text-emerald-600 font-bold text-sm bg-emerald-50 px-2 py-1 rounded-lg">To'langan</span>
                      ) : (
                        <span className="text-rose-600 font-bold text-sm bg-rose-50 px-2 py-1 rounded-lg">Qarz: {d.qarz.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl p-5 border shadow-sm flex items-center gap-4">
            <div className="p-3 bg-slate-50 text-slate-500 rounded-xl"><Phone size={20} /></div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5">Telefon raqam</p>
              <p className="font-bold text-slate-700">{student?.phone || "Kiritilmagan"}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><History size={20} /></div>
                <div>
                  <p className="font-bold text-slate-800 text-lg">To'lovlar tarixi</p>
                  <p className="text-xs text-slate-400">Kerakli oyni tanlang</p>
                </div>
              </div>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500" size={16} />
                <select 
                  value={selectedHistoryMonth}
                  onChange={(e) => setSelectedHistoryMonth(e.target.value)}
                  className="w-full sm:w-auto pl-9 pr-8 py-2 bg-indigo-50 border border-indigo-100 text-indigo-800 text-sm font-bold rounded-xl outline-none focus:ring-2 focus:ring-indigo-200 cursor-pointer appearance-none"
                >
                  <option value="all">Barcha oylar</option>
                  {uniqueHistoryMonths.map(m => (
                    <option key={m} value={m}>
                      {formatMonthName(m)} {m === defaultMonthStr ? "(Joriy)" : ""}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-500">
                  <svg width="10" height="6" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
              </div>
            </div>

            {filteredHistory.length > 0 ? (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {filteredHistory.map((pay) => (
                  <div key={pay._id} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center hover:bg-slate-100 transition-colors">
                    <div>
                      <p className="font-bold text-indigo-600 text-sm">{formatMonthName(pay.month)} oyi uchun</p>
                      <p className="text-[11px] text-slate-500 font-medium mt-1">
                        <span className="bg-indigo-50 px-1.5 py-0.5 rounded text-indigo-700">{pay.groupName || "Guruhsiz"}</span> • {pay.paymentType || "Naqd"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-600 text-[15px]">+{Number(pay.amount || 0).toLocaleString()} <span className="text-xs">so'm</span></p>
                      <p className="text-[10px] text-slate-400 font-medium mt-1">{new Date(pay.date).toLocaleDateString("ru-RU", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute:'2-digit' })}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-2">
                  <CreditCard className="text-slate-300" size={24} />
                </div>
                <p className="text-slate-500 text-sm font-medium">Bu oy uchun to'lov tarixi mavjud emas.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}