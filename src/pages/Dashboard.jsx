import { useState, useEffect } from "react";
import { CalendarDays, Loader2, Download, Trash2 } from "lucide-react";

export default function Dashboard() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState("all");

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payments");
      const data = await res.json();
      if (data.success && data.data) {
        setPayments(data.data);
      }
    } catch (error) {
      console.error("Xatolik:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`${name} to'lovini o'chirmoqchimisiz?`)) return;
    await fetch("/api/payments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchStats();
  };

  const availableMonths = [...new Set(payments.map((p) => p.month))]
    .sort()
    .reverse();
  const filteredPayments =
    selectedMonth === "all"
      ? payments
      : payments.filter((p) => p.month === selectedMonth);
  const totalAmount = filteredPayments.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0
  );

  const formatMonth = (m) => {
    if (!m) return "";
    const [y, mm] = m.split("-");
    const names = [
      "Yanvar",
      "Fevral",
      "Mart",
      "Aprel",
      "May",
      "Iyun",
      "Iyul",
      "Avgust",
      "Sentabr",
      "Oktabr",
      "Noyabr",
      "Dekabr",
    ];
    return `${names[parseInt(mm) - 1]} ${y}`;
  };

  // YANGI PROFESSIONAL EXCEL EXPORT
  const exportToExcel = () => {
    if (filteredPayments.length === 0)
      return alert("Yuklab olish uchun ma'lumot yo'q!");

    let table = `\uFEFF<table border="1">
      <thead>
        <tr style="background-color: #f3f4f6;">
          <th>O'quvchi ismi</th>
          <th>Guruh</th>
          <th>Summa</th>
          <th>To'lov turi</th>
          <th>Oy</th>
          <th>Sana</th>
        </tr>
      </thead>
      <tbody>`;

    filteredPayments.forEach((p) => {
      table += `<tr>
        <td>${p.studentName}</td>
        <td>${p.groupName}</td>
        <td>${p.amount}</td>
        <td>${p.paymentType}</td>
        <td>${p.month}</td>
        <td>${new Date(p.date).toLocaleDateString()}</td>
      </tr>`;
    });

    table += `</tbody></table>`;

    const blob = new Blob([table], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hisobot_${
      selectedMonth === "all" ? "barcha" : selectedMonth
    }.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            <span>Umumiy Statistika</span>
          </h1>
          <p className="text-slate-500 text-sm">
            <span>Markazning moliyaviy holati</span>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <CalendarDays className="text-indigo-500" size={20} />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent font-semibold text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">Barcha oylar tarixi</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {formatMonth(m)}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={exportToExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <Download size={18} /> <span>Excel Yuklash</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-indigo-600 p-6 rounded-2xl shadow-lg text-white">
          <p className="text-indigo-100 text-sm mb-1">
            <span>
              {selectedMonth === "all"
                ? "Jami Tushum"
                : `${formatMonth(selectedMonth)}dagi tushum`}
            </span>
          </p>
          <h3 className="text-3xl font-bold">
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <span>{totalAmount.toLocaleString()} so'm</span>
            )}
          </h3>
        </div>
        <div className="bg-white border p-6 rounded-2xl shadow-sm">
          <p className="text-slate-500 text-sm mb-1">
            <span>Tranzaksiyalar soni</span>
          </p>
          <h3 className="text-3xl font-bold text-slate-800">
            {loading ? (
              <Loader2 className="animate-spin text-slate-400" />
            ) : (
              <span>{filteredPayments.length} ta</span>
            )}
          </h3>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="px-6 py-4">O'quvchi</th>
                <th className="px-6 py-4 hidden sm:table-cell">Guruh</th>
                <th className="px-6 py-4">Summa</th>
                <th className="px-6 py-4 text-right">Amal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="4" className="py-10 text-center text-slate-400">
                    Yuklanmoqda...
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-10 text-center text-slate-400">
                    To'lovlar topilmadi.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      {p.studentName}
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell text-slate-600">
                      {p.groupName}
                    </td>
                    <td className="px-6 py-4 font-bold text-emerald-600">
                      {Number(p.amount).toLocaleString()} so'm
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(p._id, p.studentName)}
                        className="text-rose-500 p-2 hover:bg-rose-50 rounded-lg"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
