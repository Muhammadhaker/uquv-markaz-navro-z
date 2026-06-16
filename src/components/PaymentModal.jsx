import { useState, useEffect } from "react";
import { Loader2, CheckCircle, X } from "lucide-react";

export default function PaymentModal({ isOpen, onClose, student }) {
  const [amount, setAmount] = useState("");
  const [paymentType, setPaymentType] = useState("Naqd");
  const [paymentMonth, setPaymentMonth] = useState("");
  const [group, setGroup] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (isOpen && student) {
      const today = new Date();
      setPaymentMonth(
        `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
          2,
          "0"
        )}`
      );
      setGroup(student.group || "");
      setAmount("");
      setSuccess(false);
      setErrorMessage("");
    }
  }, [isOpen, student]);

  if (!isOpen || !student) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (Number(amount) <= 0) {
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
          groupName: group,
          amount: Number(amount),
          paymentType,
          month: paymentMonth,
          adminName: localStorage.getItem("username") || "Admin",
          // TELEGRAM ID HAM QO'SHILDI
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-end sm:items-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
        >
          <X size={20} />
        </button>

        {success ? (
          <div className="p-8 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
              <CheckCircle size={32} />
            </div>
            <h3 className="font-bold text-lg text-slate-800">
              To'lov qabul qilindi!
            </h3>
            <p className="text-sm text-slate-500 mt-2">
              Chek saqlandi (va botdan kelgan bo'lsa yuborildi).
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <h2 className="text-xl font-bold text-slate-800">
              To'lov: {student.name}
            </h2>
            {errorMessage && (
              <p className="text-red-500 text-sm bg-red-50 p-2 rounded-xl font-medium">
                {errorMessage}
              </p>
            )}

            <input
              className="w-full border p-3 rounded-xl font-medium focus:border-indigo-500 outline-none"
              placeholder="Guruh"
              value={group}
              onChange={(e) => setGroup(e.target.value)}
            />
            <input
              type="number"
              className="w-full border p-3 rounded-xl font-medium focus:border-indigo-500 outline-none"
              placeholder="Summa (so'm)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <select
              className="w-full border p-3 rounded-xl bg-white font-medium focus:border-indigo-500 outline-none"
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
            >
              <option>Naqd</option>
              <option>Plastik</option>
            </select>
            <input
              type="month"
              className="w-full border p-3 rounded-xl font-medium focus:border-indigo-500 outline-none"
              value={paymentMonth}
              onChange={(e) => setPaymentMonth(e.target.value)}
              required
            />

            <button
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-bold transition-all shadow-md disabled:opacity-70 flex justify-center items-center"
              disabled={loading}
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
