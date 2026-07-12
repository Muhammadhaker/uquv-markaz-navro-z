import { useState, useEffect } from "react";
import { X, Loader2, CheckCircle, DollarSign, Calendar } from "lucide-react";

export default function EditPaymentModal({ isOpen, onClose, payment, onSuccess }) {
  const [amount, setAmount] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [paymentType, setPaymentType] = useState("Naqd");
  const [paymentMonth, setPaymentMonth] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    "x-user-role": localStorage.getItem("userRole") || "",
    "x-user-id": localStorage.getItem("userId") || "",
    "x-parent-id": localStorage.getItem("parentTeacherId") || ""
  });

  useEffect(() => {
    if (isOpen && payment) {
      setAmount(String(payment.amount || "").replace(/\B(?=(\d{3})+(?!\d))/g, " "));
      setBasePrice(payment.priceAtThatTime ? String(payment.priceAtThatTime).replace(/\B(?=(\d{3})+(?!\d))/g, " ") : "");
      setPaymentType(payment.paymentType || "Naqd");
      setPaymentMonth(payment.month || "");
      setSuccess(false);
      setErrorMessage("");
    }
  }, [isOpen, payment]);

  if (!isOpen || !payment) return null;

  const handleAmountChange = (setter) => (e) => {
    let rawValue = e.target.value.replace(/\D/g, "");
    if (rawValue === "") { setter(""); return; }
    setter(rawValue.replace(/\B(?=(\d{3})+(?!\d))/g, " "));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    const numericAmount = Number(amount.replace(/\s/g, ""));
    const numericBasePrice = basePrice ? Number(basePrice.replace(/\s/g, "")) : numericAmount;

    if (!numericAmount || numericAmount <= 0) {
      return setErrorMessage("To'g'ri summa kiriting!");
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/payments?id=${payment._id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          amount: numericAmount,
          priceAtThatTime: numericBasePrice,
          paymentType,
          month: paymentMonth
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1500);
      } else {
        setErrorMessage(data.message || "Tahrirlashda xatolik yuz berdi.");
      }
    } catch (err) {
      setErrorMessage("Server bilan aloqa o'rnatib bo'lmadi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-[70] p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 p-2 bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100 hover:text-slate-600 transition-all disabled:opacity-50 z-10"
        >
          <X size={18} />
        </button>

        {success ? (
          <div className="p-8 text-center flex flex-col items-center justify-center min-h-[280px]">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-4">
              <CheckCircle size={36} />
            </div>
            <h3 className="text-lg font-black text-slate-800">To'lov yangilandi!</h3>
            <p className="text-sm text-slate-500 mt-2 max-w-[260px]">
              Agar ota-onaga chek yuborilgan bo'lsa, Telegramdagi chek matni ham avtomatik yangilandi.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-lg font-black text-slate-800">To'lovni tahrirlash</h2>
              <p className="text-sm font-bold text-indigo-600 mt-1 bg-indigo-50/50 px-3 py-1.5 rounded-xl w-fit">
                👤 {payment.studentName}
              </p>
              <p className="text-xs text-slate-400 mt-1">{payment.groupName}</p>
            </div>

            {errorMessage && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 p-3 rounded-xl text-xs font-bold text-center">
                {errorMessage}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1">
                  <DollarSign size={12} /> Summa
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="w-full border-2 border-indigo-200 p-3 rounded-xl font-black text-center text-indigo-700 bg-indigo-50/30 outline-none focus:border-indigo-500"
                  value={amount}
                  onChange={handleAmountChange(setAmount)}
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase" title="Chegirma bilan kelishilgan asl narx">
                  💡 Asl narx
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Masalan: 250 000"
                  className="w-full border-2 border-slate-200 p-3 rounded-xl font-bold text-center text-slate-600 bg-slate-50 outline-none focus:border-slate-400"
                  value={basePrice}
                  onChange={handleAmountChange(setBasePrice)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Turi</label>
                <select
                  className="w-full border p-3 rounded-xl font-bold bg-slate-50 outline-none focus:border-indigo-500"
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value)}
                >
                  <option value="Naqd">💵 Naqd</option>
                  <option value="Plastik">💳 Plastik</option>
                  <option value="Click">📲 Click</option>
                  <option value="Payme">💎 Payme</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1">
                  <Calendar size={12} /> Oy
                </label>
                <input
                  type="month"
                  className="w-full border p-3 rounded-xl font-bold bg-slate-50 outline-none focus:border-indigo-500 text-sm"
                  value={paymentMonth}
                  onChange={(e) => setPaymentMonth(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-2xl font-black shadow-lg shadow-indigo-600/20 disabled:opacity-60 flex justify-center items-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={22} /> : <span>Saqlash</span>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}