import { useState } from "react";
import { X } from "lucide-react";

export default function AddExpenseModal({ isOpen, onClose, onSuccess, selectedMonth }) {
  const [expenseReason, setExpenseReason] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🔥 API himoya kalitlari
  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    "x-user-role": localStorage.getItem("userRole") || "",
    "x-user-id": localStorage.getItem("userId") || "",
    "x-parent-id": localStorage.getItem("parentTeacherId") || ""
  });

  if (!isOpen) return null;

  const handleAddExpense = async (e) => {
    e.preventDefault();
    const amountNum = Number(expenseAmount.replace(/\D/g, ""));
    if (!expenseReason || amountNum <= 0) return alert("Ma'lumotlarni to'g'ri kiriting!");

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          reason: expenseReason,
          amount: amountNum,
          month: selectedMonth,
          adminName: localStorage.getItem("username") || "Admin"
        })
      });

      if (res.ok) {
        await fetch("/api/logs", {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            adminName: localStorage.getItem("username") || "Admin",
            actionType: "create",
            details: `Xarajat qo'shildi: ${expenseReason} (${amountNum.toLocaleString()} so'm)`
          })
        });
        
        setExpenseReason("");
        setExpenseAmount("");
        onSuccess();
        onClose(); 
      } else {
        alert("Xarajat saqlanmadi. Xatolik bor.");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-800">Xarajat qo'shish</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>
        
        <form onSubmit={handleAddExpense} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Nima uchun sarflandi?</label>
            <input 
              required 
              value={expenseReason} 
              onChange={(e) => setExpenseReason(e.target.value)} 
              className="w-full mt-1 p-3 border rounded-xl outline-none focus:border-rose-500 font-medium text-slate-700" 
              placeholder="Masalan: Ijara, Svet, Marker..." 
            />
          </div>
          
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Summasi</label>
            <input 
              required 
              inputMode="numeric" 
              pattern="[0-9\s]*"
              value={expenseAmount} 
              onChange={(e) => {
                let val = e.target.value.replace(/\D/g, "");
                setExpenseAmount(val.replace(/\B(?=(\d{3})+(?!\d))/g, " "));
              }} 
              className="w-full mt-1 p-3 border rounded-xl outline-none focus:border-rose-500 font-bold text-slate-800" 
              placeholder="100 000" 
            />
          </div>
          
          <button 
            type="submit" 
            disabled={isSubmitting} 
            className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3.5 rounded-xl transition-colors mt-2 disabled:opacity-70"
          >
            {isSubmitting ? "Saqlanmoqda..." : "Xarajatni tasdiqlash"}
          </button>
        </form>
      </div>
    </div>
  );
}