import { useState, useEffect } from "react";
import { CalendarDays, Loader2, Download, Trash2, Plus, TrendingUp, TrendingDown, Wallet, ArrowDownRight, ArrowUpRight } from "lucide-react";
import AddExpenseModal from "../components/AddExpenseModal"; 

export default function Dashboard() {
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("income");

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    "x-user-role": localStorage.getItem("userRole") || "",
    "x-user-id": localStorage.getItem("userId") || "",
    "x-parent-id": localStorage.getItem("parentTeacherId") || ""
  });

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [payRes, expRes] = await Promise.all([
        fetch("/api/payments", { headers: getAuthHeaders() }),
        fetch("/api/expenses", { headers: getAuthHeaders() })
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

  // 🔥 YANGI: To'lovni o'chirish (Summa va Tiklash logikasi bilan)
  const handleDeletePayment = async (p) => {
    if (!window.confirm(`${p.studentName} to'lovini o'chirmoqchimisiz?`)) return;
    try {
      await fetch("/api/payments", { method: "DELETE", headers: getAuthHeaders(), body: JSON.stringify({ id: p._id }) });
      
      await fetch("/api/logs", { 
        method: "POST", 
        headers: getAuthHeaders(), 
        body: JSON.stringify({ 
          adminName: localStorage.getItem("username") || "Admin", 
          actionType: "delete", 
          details: `To'lov o'chirildi: ${p.studentName}`,
          targetApi: "/api/payments", // Tiklash uchun yuboramiz
          deletedData: p // Puli va hamma ma'lumoti shu ichida boradi!
        }) 
      });
      fetchStats();
    } catch (error) {
      console.error(error);
    }
  };

  // 🔥 YANGI: Xarajatni o'chirish (Summa va Tiklash logikasi bilan)
  const handleDeleteExpense = async (e) => {
    if (!window.confirm(`"${e.reason}" xarajatini o'chirmoqchimisiz?`)) return;
    try {
      await fetch("/api/expenses", { method: "DELETE", headers: getAuthHeaders(), body: JSON.stringify({ id: e._id }) });
      
      await fetch("/api/logs", { 
        method: "POST", 
        headers: getAuthHeaders(), 
        body: JSON.stringify({ 
          adminName: localStorage.getItem("username") || "Admin", 
          actionType: "delete", 
          details: `Xarajat o'chirildi: ${e.reason}`,
          targetApi: "/api/expenses", // Tiklash uchun
          deletedData: e // Puli bilan ketadi!
        }) 
      });
      fetchStats();
    } catch (error) {
      console.error(error);
    }
  };

  const allMonths = [...new Set([currentMonth, ...payments.map((p) => p.month), ...expenses.map((e) => e.month)])].sort().reverse();
  const filteredPayments = payments.filter((p) => p.month === selectedMonth);
  const filteredExpenses = expenses.filter((e) => e.month === selectedMonth);

  const totalIncome = filteredPayments.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const totalExpense = filteredExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const netProfit = totalIncome - totalExpense;

  const combinedHistory = [
    ...filteredPayments.map(p => ({ ...p, type: 'income', title: p.studentName, detail: p.paymentType })),
    ...filteredExpenses.map(e => ({ ...e, type: 'expense', title: e.reason, detail: e.adminName }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const formatMonth = (m) => {
    if (!m) return "";
    const [y, mm] = m.split("-");
    const names = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];
    return `${names[parseInt(mm) - 1]} ${y}`;
  };

  const getExcelTemplate = (bodyData) => `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8" />
      <style>
        table { border-collapse: collapse; font-family: 'Segoe UI', Arial, sans-serif; width: 100%; }
        th { background-color: #4f46e5; color: #ffffff; font-weight: bold; border: 1px solid #000000; padding: 12px; text-align: center; }
        td { border: 1px solid #d1d5db; padding: 8px; vertical-align: middle; }
        .num { text-align: right; white-space: nowrap; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .bold { font-weight: bold; }
        .bg-yellow { background-color: #fef9c3; }
        .bg-blue { background-color: #dbeafe; }
        .bg-green { background-color: #d1fae5; }
        .bg-red { background-color: #ffe4e6; }
        .bg-indigo { background-color: #e0e7ff; }
        .text-green { color: #059669; }
        .text-red { color: #e11d48; }
      </style>
    </head>
    <body>${bodyData}</body>
    </html>
  `;

  const exportToExcel = () => {
    let body = "";

    if (activeTab === "income") {
      if (filteredPayments.length === 0) return alert("Kirim ma'lumoti yo'q!");
      const totalCash = filteredPayments.filter((p) => p.paymentType === "Naqd").reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      const totalCard = filteredPayments.filter((p) => p.paymentType === "Plastik").reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

      body = `<table>
        <thead>
          <tr>
            <th>O'quvchi ismi</th>
            <th>Guruh</th>
            <th>Summa</th>
            <th>To'lov turi</th>
            <th>Sana va Vaqt</th>
          </tr>
        </thead>
        <tbody>`;

      filteredPayments.forEach((p) => {
        body += `<tr>
          <td class="bold">${p.studentName}</td>
          <td class="text-center">${p.groupName}</td>
          <td class="num bold">${Number(p.amount).toLocaleString("ru-RU")}</td>
          <td class="text-center">${p.paymentType}</td>
          <td class="text-center">${new Date(p.date).toLocaleString("ru-RU")}</td>
        </tr>`;
      });

      body += `<tr><td colspan="5"></td></tr>
        <tr class="bg-yellow"><td colspan="2" class="text-right bold">JAMI NAQD:</td><td colspan="3" class="num bold">${totalCash.toLocaleString("ru-RU")}</td></tr>
        <tr class="bg-blue"><td colspan="2" class="text-right bold">JAMI PLASTIK:</td><td colspan="3" class="num bold">${totalCard.toLocaleString("ru-RU")}</td></tr>
        <tr class="bg-green"><td colspan="2" class="text-right bold">UMUMIY TUSHUM:</td><td colspan="3" class="num bold">${totalIncome.toLocaleString("ru-RU")}</td></tr>
      </tbody></table>`;

      downloadBlob(getExcelTemplate(body), `Kirim_${selectedMonth}.xls`);

    } else if (activeTab === "expense") {
      if (filteredExpenses.length === 0) return alert("Chiqim ma'lumoti yo'q!");

      body = `<table>
        <thead>
          <tr>
            <th>Xarajat sababi</th>
            <th>Summa</th>
            <th>Kim kiritdi</th>
            <th>Sana va Vaqt</th>
          </tr>
        </thead>
        <tbody>`;

      filteredExpenses.forEach((e) => {
        body += `<tr>
          <td class="bold">${e.reason}</td>
          <td class="num bold">${Number(e.amount).toLocaleString("ru-RU")}</td>
          <td class="text-center">${e.adminName}</td>
          <td class="text-center">${new Date(e.date).toLocaleString("ru-RU")}</td>
        </tr>`;
      });

      body += `<tr><td colspan="4"></td></tr>
        <tr class="bg-red"><td colspan="1" class="text-right bold">UMUMIY XARAJAT:</td><td colspan="3" class="num bold">${totalExpense.toLocaleString("ru-RU")}</td></tr>
      </tbody></table>`;

      downloadBlob(getExcelTemplate(body), `Xarajatlar_${selectedMonth}.xls`);

    } else if (activeTab === "profit") {
      if (combinedHistory.length === 0) return alert("Bu oyda ma'lumot yo'q!");

      body = `<table>
        <thead>
          <tr>
            <th>Sana va Vaqt</th>
            <th>Turi</th>
            <th>Ma'lumot (Kimdan / Nima)</th>
            <th>Qo'shimcha</th>
            <th>Kirim (+)</th>
            <th>Chiqim (-)</th>
          </tr>
        </thead>
        <tbody>`;

      combinedHistory.forEach((item) => {
        const isInc = item.type === 'income';
        body += `<tr>
          <td class="text-center">${new Date(item.date).toLocaleString("ru-RU")}</td>
          <td class="text-center bold ${isInc ? 'text-green' : 'text-red'}">${isInc ? 'Kirim' : 'Chiqim'}</td>
          <td class="bold">${item.title}</td>
          <td class="text-center">${item.detail}</td>
          <td class="num bold text-green">${isInc ? Number(item.amount).toLocaleString("ru-RU") : ''}</td>
          <td class="num bold text-red">${!isInc ? Number(item.amount).toLocaleString("ru-RU") : ''}</td>
        </tr>`;
      });

      body += `<tr><td colspan="6"></td></tr>
        <tr class="bg-green"><td colspan="4" class="text-right bold">JAMI KIRIM (+):</td><td colspan="2" class="num bold">${totalIncome.toLocaleString("ru-RU")}</td></tr>
        <tr class="bg-red"><td colspan="4" class="text-right bold">JAMI CHIQIM (-):</td><td colspan="2" class="num bold">${totalExpense.toLocaleString("ru-RU")}</td></tr>
        <tr class="bg-indigo"><td colspan="4" class="text-right bold">SOF FOYDA (QOLDIQ):</td><td colspan="2" class="num bold">${netProfit.toLocaleString("ru-RU")}</td></tr>
      </tbody></table>`;

      downloadBlob(getExcelTemplate(body), `Sof_Foyda_Hisoboti_${selectedMonth}.xls`);
    }
  };

  const downloadBlob = (content, fileName) => {
    const blob = new Blob(["\uFEFF" + content], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8 border-b pb-4 border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Moliyaviy Hisobot</h1>
          <p className="text-slate-500 text-sm">Daromad va xarajatlar statistikasi</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <CalendarDays className="text-indigo-500" size={20} />
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-transparent font-bold text-slate-700 outline-none cursor-pointer">
              {allMonths.map((m) => (<option key={m} value={m}>{formatMonth(m)}</option>))}
            </select>
          </div>

          <button onClick={exportToExcel} className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm">
            <Download size={18} /> <span>Excel Yuklash</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-emerald-500 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden">
          <TrendingUp className="absolute -right-4 -bottom-4 text-emerald-400/30" size={100} />
          <p className="text-emerald-100 text-sm font-medium mb-1">Umumiy Kirim</p>
          <h3 className="text-2xl md:text-3xl font-bold">{loading ? <Loader2 className="animate-spin" /> : `${totalIncome.toLocaleString("ru-RU")} so'm`}</h3>
        </div>

        <div className="bg-rose-500 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden">
          <TrendingDown className="absolute -right-4 -bottom-4 text-rose-400/30" size={100} />
          <p className="text-rose-100 text-sm font-medium mb-1">Umumiy Chiqim</p>
          <h3 className="text-2xl md:text-3xl font-bold">{loading ? <Loader2 className="animate-spin" /> : `${totalExpense.toLocaleString("ru-RU")} so'm`}</h3>
        </div>

        <div className="bg-indigo-600 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden">
          <Wallet className="absolute -right-4 -bottom-4 text-indigo-400/30" size={100} />
          <p className="text-indigo-100 text-sm font-medium mb-1">Qoldiq (Sof Foyda)</p>
          <h3 className="text-2xl md:text-3xl font-bold">{loading ? <Loader2 className="animate-spin" /> : `${netProfit.toLocaleString("ru-RU")} so'm`}</h3>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 sm:p-4 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col sm:flex-row bg-slate-100 p-1 rounded-xl w-full md:w-auto gap-1">
            <button onClick={() => setActiveTab("income")} className={`flex-1 sm:px-6 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === "income" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              Kirimlar
            </button>
            <button onClick={() => setActiveTab("expense")} className={`flex-1 sm:px-6 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === "expense" ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              Chiqimlar
            </button>
            <button onClick={() => setActiveTab("profit")} className={`flex-1 sm:px-6 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === "profit" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              Umumiy (Sof Foyda)
            </button>
          </div>

          {activeTab === "expense" && (
            <button onClick={() => setIsExpenseModalOpen(true)} className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors w-full sm:w-auto justify-center">
              <Plus size={18} /> Xarajat qo'shish
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                {activeTab === "income" && (
                  <>
                    <th className="px-6 py-4">O'quvchi</th>
                    <th className="px-6 py-4 hidden sm:table-cell">Guruh</th>
                    <th className="px-6 py-4">Summa</th>
                    <th className="px-6 py-4 hidden md:table-cell">Sana</th>
                    <th className="px-6 py-4 text-right">Amal</th>
                  </>
                )}
                {activeTab === "expense" && (
                  <>
                    <th className="px-6 py-4">Xarajat sababi</th>
                    <th className="px-6 py-4 hidden sm:table-cell">Kim kiritdi</th>
                    <th className="px-6 py-4">Summa</th>
                    <th className="px-6 py-4 hidden md:table-cell">Sana</th>
                    <th className="px-6 py-4 text-right">Amal</th>
                  </>
                )}
                {activeTab === "profit" && (
                  <>
                    <th className="px-6 py-4">Turi</th>
                    <th className="px-6 py-4">Ma'lumot</th>
                    <th className="px-6 py-4">Summa</th>
                    <th className="px-6 py-4 hidden sm:table-cell">Sana</th>
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
                      <td className="px-6 py-4 font-bold text-emerald-600">{Number(p.amount).toLocaleString("ru-RU")} so'm</td>
                      <td className="px-6 py-4 hidden md:table-cell text-slate-500">{new Date(p.date).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="px-6 py-4 text-right">
                        {/* 🔥 O'zgartirildi: p._id emas, p obyektining o'zi yuboriladi */}
                        <button onClick={() => handleDeletePayment(p)} className="text-rose-500 p-2 hover:bg-rose-50 rounded-lg">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )
              ) : activeTab === "expense" ? (
                filteredExpenses.length === 0 ? (
                  <tr><td colSpan="5" className="py-10 text-center text-slate-400">Bu oy uchun xarajatlar topilmadi.</td></tr>
                ) : (
                  filteredExpenses.map((e) => (
                    <tr key={e._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800">{e.reason}</td>
                      <td className="px-6 py-4 hidden sm:table-cell text-slate-600">{e.adminName}</td>
                      <td className="px-6 py-4 font-bold text-rose-600">{Number(e.amount).toLocaleString("ru-RU")} so'm</td>
                      <td className="px-6 py-4 hidden md:table-cell text-slate-500">{new Date(e.date).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="px-6 py-4 text-right">
                        {/* 🔥 O'zgartirildi: e._id emas, e obyektining o'zi yuboriladi */}
                        <button onClick={() => handleDeleteExpense(e)} className="text-rose-500 p-2 hover:bg-rose-50 rounded-lg">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )
              ) : (
                combinedHistory.length === 0 ? (
                  <tr><td colSpan="5" className="py-10 text-center text-slate-400">Bu oy uchun harakatlar topilmadi.</td></tr>
                ) : (
                  combinedHistory.map((item, idx) => {
                    const isIncome = item.type === "income";
                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${isIncome ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            {isIncome ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                            {isIncome ? "KIRIM" : "CHIQIM"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800">{item.title}</div>
                          <div className="text-xs text-slate-500">{item.detail}</div>
                        </td>
                        <td className={`px-6 py-4 font-bold ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isIncome ? '+' : '-'}{Number(item.amount).toLocaleString("ru-RU")} so'm
                        </td>
                        <td className="px-6 py-4 hidden sm:table-cell text-slate-500">
                          {new Date(item.date).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </td>
                      </tr>
                    )
                  })
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddExpenseModal 
        isOpen={isExpenseModalOpen} 
        onClose={() => setIsExpenseModalOpen(false)} 
        onSuccess={fetchStats} 
        selectedMonth={selectedMonth} 
      />

    </div>
  );
}