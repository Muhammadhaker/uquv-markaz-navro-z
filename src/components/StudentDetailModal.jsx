import {
  X,
  Phone,
  BookOpen,
  CreditCard,
  History,
  CalendarCheck,
  Download,
  Send,
  Search,
} from "lucide-react";
import PaymentModal from "./PaymentModal";
import { useState } from "react";

const formatPhoneNumber = (phone) => {
  if (!phone) return "";
  const cleaned = ("" + phone).replace(/\D/g, "");
  if (cleaned.length === 12 && cleaned.startsWith("998")) {
    return `+998 ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(
      8,
      10
    )} ${cleaned.slice(10, 12)}`;
  } else if (cleaned.length === 9) {
    return `+998 ${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(
      5,
      7
    )} ${cleaned.slice(7, 9)}`;
  }
  return phone;
};

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

export default function StudentDetailModal({
  student,
  payments,
  onClose,
  onRefresh,
}) {
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState(""); // Tarix ichida qidiruv

  const studentPayments = payments
    .filter((p) => p.studentId === student._id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  // Qidiruv bo'yicha filtrlash
  const filteredHistory = studentPayments.filter(
    (p) =>
      formatMonth(p.month)
        .toLowerCase()
        .includes(historySearch.toLowerCase()) ||
      p.paymentType.toLowerCase().includes(historySearch.toLowerCase())
  );

  // 1. FAQAT SHU O'QUVCHI UCHUN EXCEL YUKLASH
  const exportStudentHistory = () => {
    if (studentPayments.length === 0)
      return alert("Yuklab olish uchun to'lov tarixi yo'q!");

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

    studentPayments.forEach((p) => {
      table += `<tr>
        <td>${student.name}</td>
        <td>${student.group}</td>
        <td>${p.amount}</td>
        <td>${p.paymentType}</td>
        <td>${formatMonth(p.month)}</td>
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
    link.download = `${student.name.replace(/\s+/g, "_")}_tarix.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2. TELEGRAM ORQALI CHEK YUBORISH
  const shareReceipt = (p) => {
    const text = `🧾 *TO'LOV CHEKI*\n\n🏢 *Markaz:* Navro'z O'quv Markazi\n👤 *O'quvchi:* ${
      student.name
    }\n📚 *Guruh:* ${student.group}\n💰 *Summa:* ${Number(
      p.amount
    ).toLocaleString()} so'm\n💳 *To'lov turi:* ${
      p.paymentType
    }\n📅 *Qaysi oy uchun:* ${formatMonth(
      p.month
    )}\n📆 *To'lov sanasi:* ${new Date(
      p.date
    ).toLocaleDateString()}\n\n✅ _To'lov muvaffaqiyatli qabul qilindi!_`;

    // Telegram share havolasi
    const url = `https://t.me/share/url?url=&text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[95vh] flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800">{student.name}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl font-medium text-slate-700">
              <Phone size={18} className="text-indigo-500" />{" "}
              {formatPhoneNumber(student.phone)}
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl font-medium text-slate-700">
              <BookOpen size={18} className="text-indigo-500" /> {student.group}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4 shrink-0">
            <button
              onClick={() => setIsPayOpen(true)}
              className="flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-sm"
            >
              <CreditCard size={18} /> To'lov
            </button>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${
                showHistory
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <History size={18} /> Tarix ({studentPayments.length})
            </button>
          </div>

          {/* TARIX QISMI (Ochilganda) */}
          {showHistory && (
            <div className="border-t pt-4 mt-2 flex flex-col min-h-0">
              {/* Qidiruv va Excel tugmalari */}
              <div className="flex gap-2 mb-3">
                <div className="relative flex-1">
                  <Search
                    className="absolute left-3 top-2.5 text-slate-400"
                    size={16}
                  />
                  <input
                    type="text"
                    placeholder="Oy yoki turini qidiring..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border outline-none focus:border-indigo-500"
                  />
                </div>
                <button
                  onClick={exportStudentHistory}
                  className="bg-emerald-50 text-emerald-600 p-2 rounded-lg hover:bg-emerald-100 transition-colors"
                  title="Shu o'quvchi hisobotini Excelda yuklash"
                >
                  <Download size={20} />
                </button>
              </div>

              <div className="overflow-y-auto pr-2 custom-scrollbar flex-1 space-y-2 pb-2">
                {filteredHistory.length === 0 ? (
                  <div className="text-center p-4 bg-slate-50 rounded-xl text-slate-500 text-sm">
                    To'lovlar topilmadi.
                  </div>
                ) : (
                  filteredHistory.map((p) => (
                    <div
                      key={p._id}
                      className="p-3 border rounded-xl hover:border-indigo-200 transition-all bg-white"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className="bg-emerald-100 p-1.5 rounded-md text-emerald-600">
                            <CalendarCheck size={16} />
                          </div>
                          <div>
                            <div className="font-bold text-slate-700 text-sm">
                              {formatMonth(p.month)}
                            </div>
                            <div className="text-xs text-slate-400">
                              {new Date(p.date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-emerald-600 text-sm">
                            {Number(p.amount).toLocaleString()}
                          </div>
                          <div className="text-[10px] uppercase font-bold text-slate-400">
                            {p.paymentType}
                          </div>
                        </div>
                      </div>

                      {/* CHEK ULASHISH TUGMASI */}
                      <button
                        onClick={() => shareReceipt(p)}
                        className="w-full mt-2 flex items-center justify-center gap-2 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors"
                      >
                        <Send size={14} /> Telegram orqali chek ulashish
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {isPayOpen && (
        <PaymentModal
          student={student}
          isOpen={true}
          onClose={() => {
            setIsPayOpen(false);
            onRefresh();
          }}
        />
      )}
    </>
  );
}
