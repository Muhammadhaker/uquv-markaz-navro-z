import { useState, useEffect } from "react";
import { CalendarDays, Loader2, Download, Trash2, Clock, Plus, TrendingUp, TrendingDown, Wallet, X } from "lucide-react";

export default function Dashboard() {
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("income"); // 'income' yoki 'expense'

  // Xarajat qo'shish modali uchun statelar
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseReason, setExpenseReason] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [payRes, expRes] = await Promise.all([
        fetch("/api/payments"),
        fetch("/api/expenses")
      ]);
      
      const payData = await payRes.json();
      const expData = await expRes.json();
      
      if (payData.success) setPayments(payData.data);
      if (expData.success) setExpenses(expData.data);
    } catch (error) {
      console.error("Xatolik:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // TO'LOVNI O'CHIRISH
  const handleDeletePayment = async (id, name) => {
    if (!window.confirm(`${name} to'lovini o'chirmoqchimisiz?`)) return;
    try {
      await fetch("/api/payments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const adminName = localStorage.getItem("username") || "Noma'lum Admin";
      await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminName, actionType: "delete", details: `To'lov o'chirildi: ${name}`
        })
      });
      fetchStats(); 
    } catch (error) {
      console.error(error);
    }
  };

  // XARAJATNI O'CHIRISH
  const handleDeleteExpense = async (id, reason) => {
    if (!window.confirm(`"${reason}" xarajatini o'chirmoqchimisiz?`)) return;
    try {
      await fetch("/api/expenses", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const adminName = localStorage.getItem("username") || "Noma'lum Admin";
      await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminName, actionType: "delete", details: `Xarajat o'chirildi: ${reason}`
        })
      });
      fetchStats(); 
    } catch (error) {
      console.error(error);
    }
  };

  // YANGI XARAJAT QO'SHISH
  const handleAddExpense = async (e) => {
    e.preventDefault();
    const amountNum = Number(expenseAmount.replace(/\D/g, ""));
    if (!expenseReason || amountNum <= 0) return alert("Ma'lumotlarni to'g'ri kiriting!");

    setIsSubmitting(true);
    try {
      const adminName = localStorage.getItem("username") || "Admin";
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: expenseReason,
          amount: amountNum,
          month: selectedMonth,
          adminName
        })
      });

      if (res.ok) {
        await fetch("/api/logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            adminName, actionType: "create", details: `Xarajat qo'shildi: ${expenseReason} (${amountNum.toLocaleString()} so'm)`
          })
        });
        setExpenseReason("");
        setExpenseAmount("");
        setIsExpenseModalOpen(false);
        fetchStats();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // HISOBLA-KITOBLAR
  const allMonths = [...new Set([currentMonth, ...payments.map((p) => p.month), ...expenses.map((e) => e.month)])].sort().reverse();
  const filteredPayments = payments.filter((p) => p.month === selectedMonth);
  const filteredExpenses = expenses.filter((e) => e.month === selectedMonth);

  const totalIncome = filteredPayments.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const totalExpense = filteredExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const netProfit = totalIncome - totalExpense;

  const formatMonth = (m) => {
    if (!m) return "";
    const [y, mm] = m.split("-");
    const names = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];
    return `${names[parseInt(mm) - 1]} ${y}`;
  };

  // EXCEL YUKLASH (KIRIM VA CHIQIM UCHUN ALOHIDA)
  const exportToExcel = () => {
    if (activeTab === "income") {
      if (filteredPayments.length === 0) return alert("Kirim ma'lumoti yo'q!");

      const totalCash = filteredPayments.filter((p) => p.paymentType === "Naqd").reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      const totalCard = filteredPayments.filter((p) => p.paymentType === "Plastik").reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

      let table = `\uFEFF<table border="1">
        <thead><tr style="background-color: #d1fae5;"><th>O'quvchi ismi</th><th>Guruh</th><th>Summa</th><th>To'lov turi</th><th>Oy</th><th>Sana</th></tr></thead>
        <tbody>`;
      filteredPayments.forEach((p) => {
        table += `<tr><td>${p.studentName}</td><td>${p.groupName}</td><td>${p.amount}</td><td>${p.paymentType}</td><td>${p.month}</td><td>${new Date(p.date).toLocaleString("ru-RU")}</td></tr>`;
      });
      table += `<tr><td colspan="6"></td></tr>
        <tr style="font-weight: bold; background-color: #fef9c3;"><td colspan="2" style="text-align: right;">JAMI NAQD:</td><td colspan="4">${totalCash.toLocaleString()}</td></tr>
        <tr style="font-weight: bold; background-color: #dbeafe;"><td colspan="2" style="text-align: right;">JAMI PLASTIK:</td><td colspan="4">${totalCard.toLocaleString()}</td></tr>
        <tr style="font-weight: bold; background-color: #10b981; color: white;"><td colspan="2" style="text-align: right;">UMUMIY TUSHUM:</td><td colspan="4">${totalIncome.toLocaleString()}</td></tr>
        </tbody></table>`;

      downloadBlob(table, `Kirim_${selectedMonth}.xls`);
    } else {
      if (filteredExpenses.length === 0) return alert("Chiqim ma'lumoti yo'q!");

      let table = `\uFEFF<table border="1">
        <thead><tr style="background-color: #ffe4e6;"><th>Xarajat sababi</th><th>Summa</th><th>Kim kiritdi</th><th>Sana</th></tr></thead>
        <tbody>`;
      filteredExpenses.forEach((e) => {
        table += `<tr><td>${e.reason}</td><td>${e.amount}</td><td>${e.adminName}</td><td>${new Date(e.date).toLocaleString("ru-RU")}</td></tr>`;
      });
      table += `<tr><td colspan="4"></td></tr>
        <tr style="font-weight: bold; background-color: #ef4444; color: white;"><td colspan="2" style="text-align: right;">UMUMIY XARAJAT:</td><td colspan="2">${totalExpense.toLocaleString()}</td></tr>
        </tbody></table>`;

      downloadBlob(table, `Xarajatlar_${selectedMonth}.xls`);
    }
  };

  const downloadBlob = (tableString, fileName) => {
    const blob = new Blob([tableString], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Moliyaviy Hisobot</h1>
          <p className="text-slate-500 text-sm">Daromad va xarajatlar statistikasi</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <CalendarDays className="text-indigo-500" size={20} />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent font-bold text-slate-700 outline-none cursor-pointer"
            >
              {allMonths.map((m) => (
                <option key={m} value={m}>{formatMonth(m)}</option>
              ))}
            </select>
          </div>

          <button
            onClick={exportToExcel}
            className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <Download size={18} /> <span>Excel Yuklash</span>
          </button>
        </div>
      </div>

      {/* KARTALAR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-emerald-500 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden">
          <TrendingUp className="absolute -right-4 -bottom-4 text-emerald-400/30" size={100} />
          <p className="text-emerald-100 text-sm font-medium mb-1">Umumiy Kirim</p>
          <h3 className="text-2xl md:text-3xl font-bold">{loading ? <Loader2 className="animate-spin" /> : `${totalIncome.toLocaleString()} so'm`}</h3>
        </div>
        
        <div className="bg-rose-500 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden">
          <TrendingDown className="absolute -right-4 -bottom-4 text-rose-400/30" size={100} />
          <p className="text-rose-100 text-sm font-medium mb-1">Umumiy Chiqim</p>
          <h3 className="text-2xl md:text-3xl font-bold">{loading ? <Loader2 className="animate-spin" /> : `${totalExpense.toLocaleString()} so'm`}</h3>
        </div>

        <div className="bg-indigo-600 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden">
          <Wallet className="absolute -right-4 -bottom-4 text-indigo-400/30" size={100} />
          <p className="text-indigo-100 text-sm font-medium mb-1">Qoldiq (Sof Foyda)</p>
          <h3 className="text-2xl md:text-3xl font-bold">{loading ? <Loader2 className="animate-spin" /> : `${netProfit.toLocaleString()} so'm`}</h3>
        </div>
      </div>

      {/* TABS (KIRIM / CHIQIM) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
            <button 
              onClick={() => setActiveTab("income")} 
              className={`flex-1 sm:px-8 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === "income" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              Kirim (To'lovlar)
            </button>
            <button 
              onClick={() => setActiveTab("expense")} 
              className={`flex-1 sm:px-8 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === "expense" ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              Chiqim (Xarajatlar)
            </button>
          </div>

          {activeTab === "expense" && (
            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors w-full sm:w-auto justify-center"
            >
              <Plus size={18} /> Xarajat qo'shish
            </button>
          )}
        </div>
      </div>

      {/* JADVALLAR */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                {activeTab === "income" ? (
                  <>
                    <th className="px-6 py-4">O'quvchi</th>
                    <th className="px-6 py-4 hidden sm:table-cell">Guruh</th>
                    <th className="px-6 py-4">Summa</th>
                    <th className="px-6 py-4 hidden md:table-cell">Sana</th>
                    <th className="px-6 py-4 text-right">Amal</th>
                  </>
                ) : (
                  <>
                    <th className="px-6 py-4">Xarajat sababi</th>
                    <th className="px-6 py-4">Kiritgan Admin</th>
                    <th className="px-6 py-4">Summa</th>
                    <th className="px-6 py-4 hidden md:table-cell">Sana</th>
                    <th className="px-6 py-4 text-right">Amal</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr><td colSpan="5" className="py-10 text-center text-slate-400">Yuklanmoqda...</td></tr>
              ) : activeTab === "income" ? (
                filteredPayments.length === 0 ? (
                  <tr><td colSpan="5" className="py-10 text-center text-slate-400">Bu oy uchun tushumlar topilmadi.</td></tr>
                ) : (
                  filteredPayments.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800">{p.studentName}</td>
                      <td className="px-6 py-4 hidden sm:table-cell text-slate-600">{p.groupName}</td>
                      <td className="px-6 py-4 font-bold text-emerald-600">{Number(p.amount).toLocaleString()} so'm</td>
                      <td className="px-6 py-4 hidden md:table-cell text-slate-500">{new Date(p.date).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleDeletePayment(p._id, p.studentName)} className="text-rose-500 p-2 hover:bg-rose-50 rounded-lg">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )
              ) : (
                filteredExpenses.length === 0 ? (
                  <tr><td colSpan="5" className="py-10 text-center text-slate-400">Bu oy uchun xarajatlar topilmadi.</td></tr>
                ) : (
                  filteredExpenses.map((e) => (
                    <tr key={e._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800">{e.reason}</td>
                      <td className="px-6 py-4 text-slate-600">{e.adminName}</td>
                      <td className="px-6 py-4 font-bold text-rose-600">{Number(e.amount).toLocaleString()} so'm</td>
                      <td className="px-6 py-4 hidden md:table-cell text-slate-500">{new Date(e.date).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleDeleteExpense(e._id, e.reason)} className="text-rose-500 p-2 hover:bg-rose-50 rounded-lg">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* XARAJAT QO'SHISH MODALI */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Xarajat qo'shish</h2>
              <button onClick={() => setIsExpenseModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Nima uchun sarflandi?</label>
                <input required value={expenseReason} onChange={(e) => setExpenseReason(e.target.value)} className="w-full mt-1 p-3 border rounded-xl outline-none focus:border-rose-500" placeholder="Masalan: Ijara, Svet, Marker..." />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Summasi</label>
                <input required value={expenseAmount} onChange={(e) => {
                    let val = e.target.value.replace(/\D/g, "");
                    setExpenseAmount(val.replace(/\B(?=(\d{3})+(?!\d))/g, " "));
                  }} className="w-full mt-1 p-3 border rounded-xl outline-none focus:border-rose-500 font-bold" placeholder="100 000" />
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3.5 rounded-xl transition-colors mt-2">
                {isSubmitting ? "Saqlanmoqda..." : "Xarajatni tasdiqlash"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}