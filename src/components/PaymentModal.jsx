import { useState, useEffect } from "react";
import { Loader2, CheckCircle, X } from "lucide-react";

// YANGI: Props ichiga `groupName` qo'shildi
export default function PaymentModal({ isOpen, onClose, student, groupName }) {
  const [amount, setAmount] = useState("");
  const [paymentType, setPaymentType] = useState("Naqd");
  const [paymentMonth, setPaymentMonth] = useState("");
  const [group, setGroup] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const studentSubjects = student?.group
    ? student.group.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  useEffect(() => {
    if (isOpen && student) {
      const today = new Date();
      // 5-SANA LOGIKASI
      let year = today.getFullYear();
      let month = today.getMonth() + 1;

      if (today.getDate() <= 5) {
        month = month - 1;
        if (month === 0) {
          month = 12;
          year = year - 1;
        }
      }

      setPaymentMonth(`${year}-${String(month).padStart(2, "0")}`);
      
      // YANGI: Agar tashqaridan (ota komponentdan) aniq guruh nomi kelgan bo'lsa, o'shani o'rnatamiz. 
      // Yo'qsa, birinchi guruhni standart qilib qo'yamiz.
      setGroup(groupName || (studentSubjects.length > 0 ? studentSubjects[0] : ""));
      
      setAmount("");
      setSuccess(false);
      setErrorMessage("");
    }
  }, [isOpen, student, groupName]);

  if (!isOpen || !student) return null;

  const handleAmountChange = (e) => {
    let rawValue = e.target.value.replace(/\D/g, "");
    let formattedValue = rawValue.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    setAmount(formattedValue);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const numericAmount = Number(amount.replace(/\s/g, ""));

    if (numericAmount <= 0) {
      setErrorMessage("To'lov summasi noto'g'ri!");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student._id,
          studentName: student.name,
          groupName: group, // Endi aynan tanlangan aniq guruh ketadi
          amount: numericAmount,
          paymentType,
          month: paymentMonth,
          adminName: localStorage.getItem("username") || "Admin",
          telegramChatId: student.telegramChatId,
        }),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => onClose(), 1500);
      } else {
        setErrorMessage("To'lovni saqlashda xatolik yuz berdi.");
      }
    } catch {
      setErrorMessage("Internet aloqasini tekshiring.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-end sm:items-center z-[70] p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
        >
          <X size={20} />
        </button>

        {success ? (
          <div className="p-8 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
              <CheckCircle size={32} />
            </div>
            <h3 className="font-bold text-lg text-slate-800">
              To'lov qabul qilindi!
            </h3>
            <p className="text-sm text-slate-500 mt-2">
              To'lov saqlandi va chek yuborildi.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <h2 className="text-xl font-bold text-slate-800">
              To'lov: {student.name}
            </h2>
            {errorMessage && (
              <p className="text-rose-500 text-sm bg-rose-50 p-2 rounded-xl font-medium">
                {errorMessage}
              </p>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">
                Guruh / Fan
              </label>
              
              {/* YANGI: Agar guruh aniq bo'lsa uni o'zgartirib bo'lmaydi */}
              {groupName ? (
                <input
                  className="w-full border p-3 rounded-xl font-bold text-indigo-700 bg-indigo-50 border-indigo-100 outline-none cursor-not-allowed"
                  value={group}
                  readOnly
                />
              ) : studentSubjects.length > 1 ? (
                <select
                  className="w-full border p-3 rounded-xl font-medium focus:border-indigo-500 outline-none bg-white cursor-pointer"
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                >
                  {studentSubjects.map((subj) => (
                    <option key={subj} value={subj}>
                      {subj}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="w-full border p-3 rounded-xl font-medium focus:border-indigo-500 outline-none bg-slate-50 text-slate-600"
                  value={group}
                  readOnly
                />
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">
                Summa
              </label>
              <input
                type="text"
                inputMode="numeric"
                className="w-full border p-3 rounded-xl font-bold text-lg text-slate-800 focus:border-indigo-500 outline-none"
                placeholder="550 000"
                value={amount}
                onChange={handleAmountChange}
                required
              />
            </div>

            <select
              className="w-full border p-3 rounded-xl bg-white font-medium focus:border-indigo-500 outline-none cursor-pointer"
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
            >
              <option>Naqd</option>
              <option>Plastik</option>
            </select>

            <input
              type="month"
              className="w-full border p-3 rounded-xl font-medium focus:border-indigo-500 outline-none cursor-pointer"
              value={paymentMonth}
              onChange={(e) => setPaymentMonth(e.target.value)}
              required
            />

            <button
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-bold transition-all shadow-md disabled:opacity-70 flex justify-center items-center mt-2"
              disabled={loading || !amount}
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                "To'lovni tasdiqlash"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}