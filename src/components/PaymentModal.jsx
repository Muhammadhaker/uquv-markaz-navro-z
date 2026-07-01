import { useState, useEffect } from "react";
import { Loader2, CheckCircle, X, DollarSign, Calendar, CreditCard, BookOpen } from "lucide-react";

export default function PaymentModal({ isOpen, onClose, student, groupName }) {
  const [amount, setAmount] = useState("");
  const [paymentType, setPaymentType] = useState("Naqd");
  const [paymentMonth, setPaymentMonth] = useState("");
  const [group, setGroup] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    "x-user-role": localStorage.getItem("userRole") || "",
    "x-user-id": localStorage.getItem("userId") || "",
    "x-parent-id": localStorage.getItem("parentTeacherId") || ""
  });

  const studentSubjects = student?.group
    ? student.group.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  useEffect(() => {
    if (isOpen && student) {
      const today = new Date();
      
      let year = today.getFullYear();
      let month = today.getMonth() + 1;

      if (today.getDate() <= 5) {
        month = month - 1;
        if (month === 0) {
          month = 12;
          year = year - 1;
        }
      }

      // Default holat (Tavsiya etilgan oy)
      setPaymentMonth(`${year}-${String(month).padStart(2, "0")}`);
      
      setGroup(groupName || (studentSubjects.length > 0 ? studentSubjects[0] : "Umumiy"));
      setAmount("");
      setSuccess(false);
      setErrorMessage("");
    }
  }, [isOpen, student, groupName]);

  if (!isOpen || !student) return null;

  const handleAmountChange = (e) => {
    let rawValue = e.target.value.replace(/\D/g, "");
    if (rawValue === "") {
      setAmount("");
      return;
    }
    let formattedValue = rawValue.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    setAmount(formattedValue);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    const numericAmount = Number(amount.replace(/\s/g, ""));

    if (!numericAmount || numericAmount <= 0) {
      setErrorMessage("Iltimos, to'lov summasini to'g'ri kiriting!");
      return;
    }

    if (!group) {
      setErrorMessage("Iltimos, to'lov qilinayotgan guruhni tanlang!");
      return;
    }

    if (!paymentMonth) {
      setErrorMessage("Iltimos, to'lov qaysi oy uchun ekanligini tanlang!");
      return;
    }

    setLoading(true);
    try {
      const adminName = localStorage.getItem("username") || "Admin";

      const res = await fetch("/api/payments", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          studentId: student._id,
          studentName: student.name,
          groupName: group,
          amount: numericAmount, 
          paymentType: paymentType,
          month: paymentMonth, // 🔥 ERKIN TANLANGAN OY JO'NATILADI
          adminName: adminName,
          telegramChatId: student.telegramChatId || null, 
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        setErrorMessage(data.message || "To'lovni saqlashda xatolik yuz berdi.");
      }
    } catch (err) {
      console.error("Payment error:", err);
      setErrorMessage("Server bilan aloqa o'rnatib bo'lmadi. Internetni tekshiring!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-end sm:items-center z-[70] p-4 transition-all duration-300">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 shadow-2xl border border-slate-100 relative">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 p-2 bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100 hover:text-slate-600 transition-all disabled:opacity-50 z-10 focus:outline-none"
        >
          <X size={18} />
        </button>

        {success ? (
          <div className="p-8 text-center flex flex-col items-center justify-center min-h-[320px] animate-in fade-in duration-300">
            <div className="w-20 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-5 shadow-inner animate-bounce">
              <CheckCircle size={40} className="stroke-[2.5]" />
            </div>
            <h3 className="text-xl font-black text-slate-800">
              To'lov muvaffaqiyatli qabul qilindi!
            </h3>
            <p className="text-sm text-slate-500 mt-2 max-w-[280px] mx-auto leading-relaxed">
              Kassa yangilandi va ota-onaning Telegram hisobiga elektron chek darhol yuborildi.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="border-b border-slate-100 pb-3 mt-1">
              <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                <CreditCard size={22} className="text-indigo-600" /> To'lov qabul qilish
              </h2>
              <p className="text-sm font-bold text-indigo-600 mt-1 bg-indigo-50/50 px-3 py-1.5 rounded-xl w-fit">
                👤 {student.name}
              </p>
            </div>

            {errorMessage && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 p-3.5 rounded-2xl text-xs font-bold text-center animate-in shake duration-200">
                {errorMessage}
              </div>
            )}

            {/* INPUT 1: Guruh / Fan tanlash */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 ml-1">
                <BookOpen size={14} /> Guruh / Fan
              </label>
              
              {groupName ? (
                <div className="w-full border border-indigo-100 p-3.5 rounded-xl font-bold text-indigo-700 bg-indigo-50/40 outline-none select-none">
                  {group}
                </div>
              ) : studentSubjects.length > 1 ? (
                <div className="relative">
                  <select
                    className="w-full border border-slate-200 p-3.5 rounded-xl font-bold text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none bg-slate-50 hover:bg-white cursor-pointer transition-all shadow-sm appearance-none"
                    value={group}
                    onChange={(e) => setGroup(e.target.value)}
                  >
                    {studentSubjects.map((subj) => (
                      <option key={subj} value={subj}>{subj}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                </div>
              ) : (
                <div className="w-full border border-slate-200 p-3.5 rounded-xl font-bold text-slate-600 bg-slate-50/70 select-none">
                  {group || "Guruh aniqlanmadi"}
                </div>
              )}
            </div>

            {/* INPUT 2: To'lov summasi */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 ml-1">
                <DollarSign size={14} /> To'lov summasi
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  className="w-full border-2 border-slate-200 p-3.5 pr-14 rounded-2xl font-black text-xl text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all shadow-inner bg-slate-50/30 text-center tracking-wide"
                  placeholder="300 000"
                  value={amount}
                  onChange={handleAmountChange}
                  required
                  autoFocus
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-extrabold text-sm text-slate-400 select-none">
                  SO'M
                </span>
              </div>
            </div>

            {/* INPUT 3 & 4: Turi va Oyi (Yonma-yon) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 ml-1">
                  💡 Turi
                </label>
                <div className="relative">
                  <select
                    className="w-full border border-slate-200 p-3.5 rounded-xl font-bold text-slate-700 focus:border-indigo-500 outline-none bg-slate-50 cursor-pointer shadow-sm appearance-none"
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value)}
                  >
                    <option value="Naqd">💵 Naqd</option>
                    <option value="Plastik">💳 Plastik</option>
                    <option value="Click">📲 Click</option>
                    <option value="Payme">💎 Payme</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                </div>
              </div>

              {/* 🔥 ERKIN OY TANLOVI (Qarzni yoki Avansni to'lash uchun) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 ml-1">
                  <Calendar size={14} /> Qaysi oy uchun
                </label>
                <input
                  type="month"
                  className="w-full border border-slate-200 p-3.5 rounded-xl font-bold text-slate-700 focus:border-indigo-500 outline-none bg-slate-50 cursor-pointer shadow-sm text-sm"
                  value={paymentMonth}
                  onChange={(e) => setPaymentMonth(e.target.value)}
                  required
                  title="Qarz yoki oldindan to'lov qilish uchun oyni o'zgartiring"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-60 disabled:cursor-not-allowed flex justify-center items-center gap-2 active:scale-[0.99] text-base"
                disabled={loading || !amount || !paymentMonth}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin text-white" size={22} />
                    <span>Kassaga yozilmoqda...</span>
                  </>
                ) : (
                  <span>To'lovni tasdiqlash</span>
                )}
              </button>
            </div>

          </form>
        )}
      </div>
    </div>
  );
}