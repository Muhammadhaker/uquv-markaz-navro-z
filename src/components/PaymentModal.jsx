import { useState, useEffect } from "react";
import { Loader2, CheckCircle, X } from "lucide-react";

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
      
      // 5-SANA LOGIKASI (Joriy oyni to'g'ri hisoblash)
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
      
      // Tashqaridan aniq guruh (groupName) berilgan bo'lsa uni o'rnatamiz.
      // Agar berilmagan bo'lsa, ro'yxatdagi birinchi guruhni tanlaymiz.
      setGroup(groupName || (studentSubjects.length > 0 ? studentSubjects[0] : "Umumiy"));
      
      setAmount("");
      setSuccess(false);
      setErrorMessage("");
    }
  }, [isOpen, student, groupName]);

  if (!isOpen || !student) return null;

  // Raqamlarni chiroyli (probel bilan) ajratib yozish uchun: 300 000
  const handleAmountChange = (e) => {
    let rawValue = e.target.value.replace(/\D/g, "");
    let formattedValue = rawValue.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    setAmount(formattedValue);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Summani hisoblashdan oldin probellarni olib tashlaymiz
    const numericAmount = Number(amount.replace(/\s/g, ""));

    if (numericAmount <= 0) {
      setErrorMessage("To'lov summasi noto'g'ri!");
      return;
    }

    setLoading(true);
    try {
      const adminName = localStorage.getItem("username") || "Admin";

      // Backend (api/payments.js) ga POST so'rov
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student._id,
          studentName: student.name,
          groupName: group,
          amount: numericAmount, // Formatlangan emas, toza raqam yuboriladi
          paymentType: paymentType,
          month: paymentMonth,
          adminName: adminName,
          telegramChatId: student.telegramChatId || null, 
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(true);
        // Muvaffaqiyatdan keyin ozgina kutib, so'ng modalni yopamiz
        setTimeout(() => onClose(), 1500);
      } else {
        setErrorMessage("To'lovni saqlashda xatolik yuz berdi: " + (data.message || data.error));
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Internet aloqasini tekshiring.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-end sm:items-center z-[70] p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200 shadow-2xl">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors disabled:opacity-50"
        >
          <X size={20} />
        </button>

        {success ? (
          <div className="p-8 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 shadow-sm">
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
          <form onSubmit={handleSubmit} className="p-6 space-y-4 mt-2">
            <div>
              <h2 className="text-xl font-bold text-slate-800 leading-tight">
                To'lov qabul qilish
              </h2>
              <p className="text-sm text-indigo-600 font-medium mt-0.5">{student.name}</p>
            </div>

            {errorMessage && (
              <p className="text-rose-600 text-sm bg-rose-50 border border-rose-100 p-3 rounded-xl font-medium">
                {errorMessage}
              </p>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">
                Guruh / Fan
              </label>
              
              {groupName ? (
                // Agar ota komponentdan guruh aniq berilgan bo'lsa (readOnly)
                <input
                  className="w-full border p-3 rounded-xl font-bold text-indigo-700 bg-indigo-50 border-indigo-100 outline-none cursor-not-allowed"
                  value={group}
                  readOnly
                />
              ) : studentSubjects.length > 1 ? (
                // Agar o'quvchida bir necha fan bo'lsa va tashqaridan aniq guruh aytilmagan bo'lsa
                <select
                  className="w-full border p-3 rounded-xl font-medium focus:border-indigo-500 outline-none bg-white cursor-pointer transition-colors shadow-sm"
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
                // Agar o'quvchida faqat 1 ta fan bo'lsa
                <input
                  className="w-full border p-3 rounded-xl font-medium outline-none bg-slate-50 text-slate-600 cursor-not-allowed"
                  value={group}
                  readOnly
                />
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">
                Summa
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  className="w-full border-2 p-3 pr-12 rounded-xl font-bold text-lg text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all shadow-sm"
                  placeholder="300 000"
                  value={amount}
                  onChange={handleAmountChange}
                  required
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                  so'm
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">
                  Turi
                </label>
                <select
                  className="w-full border p-3 rounded-xl bg-white font-medium focus:border-indigo-500 outline-none cursor-pointer shadow-sm"
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value)}
                >
                  <option>Naqd</option>
                  <option>Plastik</option>
                  <option>Click</option>
                  <option>Payme</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">
                  Qaysi oy
                </label>
                <input
                  type="month"
                  className="w-full border p-3 rounded-xl bg-white font-medium focus:border-indigo-500 outline-none cursor-pointer shadow-sm"
                  value={paymentMonth}
                  onChange={(e) => setPaymentMonth(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-indigo-200 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center mt-6 text-lg"
              disabled={loading || !amount}
            >
              {loading ? (
                <Loader2 className="animate-spin" size={24} />
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