import { useState } from "react";
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
  User,
  Clock,
  ShieldAlert, // Yangi: Istisno ikonkasi
} from "lucide-react";
import PaymentModal from "./PaymentModal";

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
  const [historySearch, setHistorySearch] = useState("");
  const [isExcepting, setIsExcepting] = useState(false); // Yangi: Istisno holati

  // Joriy oyni hisoblash (masalan "2026-06")
  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  const studentPayments = payments
    .filter((p) => p.studentId === student._id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const filteredHistory = studentPayments.filter(
    (p) =>
      formatMonth(p.month)
        .toLowerCase()
        .includes(historySearch.toLowerCase()) ||
      p.paymentType.toLowerCase().includes(historySearch.toLowerCase())
  );

  // Shu oydagi to'lovini va istisnosini tekshiramiz
  const hasPaidCurrentMonth = studentPayments.some(p => p.month === currentMonthStr);
  const isExcepted = student?.exceptionMonths?.includes(currentMonthStr);

  const exportStudentHistory = () => {
    if (studentPayments.length === 0)
      return alert("Yuklab olish uchun to'lov tarixi yo'q!");

    let table = `\uFEFF<table border="1">
      <thead>
        <tr style="background-color: #f3f4f6;">
          <th>O'quvchi</th><th>Guruh</th><th>Summa</th><th>To'lov turi</th><th>Oy</th><th>Sana</th>
        </tr>
      </thead>
      <tbody>`;

    studentPayments.forEach((p) => {
      table += `<tr>
        <td>${student.name}</td><td>${student.group}</td><td>${p.amount}</td>
        <td>${p.paymentType}</td><td>${formatMonth(p.month)}</td><td>${new Date(
        p.date
      ).toLocaleDateString()}</td>
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

  const shareReceipt = async (p) => {
    const text = `🧾 *TO'LOV CHEKI*\n\n👤 *O'quvchi:* ${
      student.name
    }\n📚 *Guruh:* ${student.group}\n💰 *Summa:* ${Number(
      p.amount
    ).toLocaleString()} so'm\n💳 *Turi:* ${
      p.paymentType
    }\n📅 *Oy:* ${formatMonth(p.month)}\n\n✅ _To'lov qabul qilindi!_`;

    if (student.telegramChatId) {
      try {
        const res = await fetch("/api/send-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatId: student.telegramChatId, text }),
        });
        const data = await res.json();
        
        if (data.success) {
          alert("✅ Chek o'quvchiga bot orqali yuborildi!");
        } else {
          alert("Chekni yuborishda xatolik yuz berdi.");
        }
      } catch (error) {
        console.error("Bot orqali yuborish xatosi:", error);
      }
    } else {
      window.open(`tg://msg_url?url=${encodeURIComponent(text)}`, "_blank");
    }
  };

  // Yangi: ISTISNO QILISH FUNKSIYASI
  const handleException = async () => {
    if (!window.confirm("Bu o'quvchini joriy oy uchun qarzlar ro'yxatidan yashirib, unga bot orqali ogohlantirish bormaydigan qilasizmi?")) return;
    setIsExcepting(true);
    try {
      const updatedExceptions = [...(student.exceptionMonths || []), currentMonthStr];
      await fetch("/api/students", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: student._id, exceptionMonths: updatedExceptions }),
      });
      onRefresh(); 
      onClose(); 
    } catch (err) {
      console.error(err);
    } finally {
      setIsExcepting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[95vh] flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800">{student.name}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl font-medium text-slate-700">
              <User size={18} className="text-indigo-500" />{" "}
              {student.parentName || "Ota-ona ismi yo'q"}
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl font-medium text-slate-700">
              <Phone size={18} className="text-indigo-500" />{" "}
              {formatPhoneNumber(student.phone)}
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl font-medium text-slate-700">
              <BookOpen size={18} className="text-indigo-500" /> {student.group}
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl font-medium text-slate-700">
              <Clock size={18} className="text-emerald-500" />
              Qo'shilgan:{" "}
              {student.addedAt
                ? new Date(student.addedAt).toLocaleString("ru-RU", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Mavjud emas"}
            </div>
          </div>

          {/* YANGI: ISTISNO TUGMASI (Faqat to'lamagan va hali istisno qilinmaganlarga chiqadi) */}
          {!hasPaidCurrentMonth && !isExcepted && (
             <button 
               onClick={handleException}
               disabled={isExcepting}
               className="mb-4 w-full bg-amber-50 text-amber-600 border border-amber-200 py-2.5 rounded-xl font-bold hover:bg-amber-100 flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
             >
               <ShieldAlert size={18} /> {isExcepting ? "Kutib turing..." : "To'lovni istisno qilish (Kechiktirish)"}
             </button>
          )}

          {/* YANGI: ISTISNO QILINGANLIGI HAQIDA XABAR */}
          {isExcepted && !hasPaidCurrentMonth && (
             <div className="mb-4 w-full bg-slate-100 text-slate-500 py-2.5 rounded-xl font-bold text-center text-sm flex items-center justify-center gap-2">
                <ShieldAlert size={16} /> Bu oydagi to'lovdan istisno qilingan
             </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => setIsPayOpen(true)}
              className="bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 flex justify-center gap-2"
            >
              <CreditCard size={18} /> To'lov
            </button>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 flex justify-center gap-2"
            >
              <History size={18} /> Tarix ({studentPayments.length})
            </button>
          </div>

          {showHistory && (
            <div className="border-t pt-4 mt-2 flex flex-col flex-1 min-h-0">
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="Qidiruv..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full px-4 py-2 text-sm rounded-lg border outline-none focus:border-indigo-500"
                />
                <button
                  onClick={exportStudentHistory}
                  className="bg-emerald-50 text-emerald-600 p-2 rounded-lg"
                >
                  <Download size={20} />
                </button>
              </div>

              <div className="overflow-y-auto space-y-2 pb-2">
                {filteredHistory.map((p) => (
                  <div key={p._id} className="p-3 border rounded-xl bg-white">
                    <div className="flex justify-between text-sm">
                      <span className="font-bold">{formatMonth(p.month)}</span>
                      <span className="font-bold text-emerald-600">
                        {Number(p.amount).toLocaleString()}
                      </span>
                    </div>
                    <button
                      onClick={() => shareReceipt(p)}
                      className="w-full mt-2 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold flex justify-center gap-2"
                    >
                      <Send size={14} /> Telegram orqali ulashish
                    </button>
                  </div>
                ))}
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