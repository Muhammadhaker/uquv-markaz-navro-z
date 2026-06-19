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
  ShieldAlert,
} from "lucide-react";
import PaymentModal from "./PaymentModal";

const formatPhoneNumber = (phone) => {
  if (!phone) return "";
  const cleaned = ("" + phone).replace(/\D/g, "");
  if (cleaned.length === 12 && cleaned.startsWith("998")) {
    return `+998 ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8, 10)} ${cleaned.slice(10, 12)}`;
  } else if (cleaned.length === 9) {
    return `+998 ${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 7)} ${cleaned.slice(7, 9)}`;
  }
  return phone;
};

const formatMonth = (m) => {
  if (!m) return "";
  const [y, mm] = m.split("-");
  const names = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];
  return `${names[parseInt(mm) - 1]} ${y}`;
};

export default function StudentDetailModal({ student, payments, onClose, onRefresh }) {
  // YANGI: isPayOpen o'rniga payGroup ishlatamiz (Qaysi guruhga to'layotganini bilish uchun)
  const [payGroup, setPayGroup] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [isExcepting, setIsExcepting] = useState(false);

  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  const studentPayments = payments
    .filter((p) => p.studentId === student._id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const filteredHistory = studentPayments.filter(
    (p) =>
      formatMonth(p.month).toLowerCase().includes(historySearch.toLowerCase()) ||
      p.paymentType.toLowerCase().includes(historySearch.toLowerCase()) ||
      (p.groupName && p.groupName.toLowerCase().includes(historySearch.toLowerCase()))
  );

  // O'quvchining guruhlarini alohida massiv qilib ajratib olamiz
  const studentGroups = student.group ? student.group.split(',').map(g => g.trim()).filter(Boolean) : [];
  const isExcepted = student?.exceptionMonths?.includes(currentMonthStr);

  // Kamida bitta fanidan qarzi bormi yo'qmi tekshiramiz (Istisno tugmasi uchun)
  const hasAnyDebt = studentGroups.some(g =>
    !studentPayments.some(p => p.month === currentMonthStr && (p.groupName === g || !p.groupName))
  );

  const exportStudentHistory = () => {
    if (studentPayments.length === 0) return alert("Yuklab olish uchun to'lov tarixi yo'q!");

    let table = `\uFEFF<table border="1">
      <thead>
        <tr style="background-color: #f3f4f6;">
          <th>O'quvchi</th><th>Fan/Guruh</th><th>Summa</th><th>To'lov turi</th><th>Oy</th><th>Sana</th>
        </tr>
      </thead>
      <tbody>`;

    studentPayments.forEach((p) => {
      table += `<tr>
        <td>${student.name}</td><td>${p.groupName || student.group}</td><td>${p.amount}</td>
        <td>${p.paymentType}</td><td>${formatMonth(p.month)}</td><td>${new Date(p.date).toLocaleDateString()}</td>
      </tr>`;
    });

    table += `</tbody></table>`;
    const blob = new Blob([table], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${student.name.replace(/\s+/g, "_")}_tarix.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const shareReceipt = async (p) => {
    const text = `🧾 *TO'LOV CHEKI*\n\n👤 *O'quvchi:* ${student.name}\n📚 *Fan:* ${p.groupName || student.group}\n💰 *Summa:* ${Number(p.amount).toLocaleString()} so'm\n💳 *Turi:* ${p.paymentType}\n📅 *Oy:* ${formatMonth(p.month)}\n\n✅ _To'lov qabul qilindi!_`;

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
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-3 mb-4">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl font-medium text-slate-700">
              <User size={18} className="text-indigo-500" /> {student.parentName || "Ota-ona ismi yo'q"}
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl font-medium text-slate-700">
              <Phone size={18} className="text-indigo-500" /> {formatPhoneNumber(student.phone)}
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl font-medium text-slate-700 text-sm">
              <Clock size={18} className="text-emerald-500 min-w-[18px]" />
              Qo'shilgan: {student.addedAt ? new Date(student.addedAt).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Mavjud emas"}
            </div>
          </div>

          {/* YANGILANGAN QISM: HAR BIR FAN UCHUN ALOHIDA TO'LOV QATORI */}
          <div className="mb-6 space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Guruhlar va To'lov ({currentMonthStr})</h3>

            {studentGroups.length > 0 ? studentGroups.map((g, idx) => {
              // Shu aniq guruh uchun to'lov qilinganini tekshiramiz
              const isGroupPaid = studentPayments.some(p => p.month === currentMonthStr && (p.groupName === g || !p.groupName));

              return (
                <div key={idx} className="flex justify-between items-center p-3 border rounded-xl bg-white shadow-sm">
                  <div className="font-bold text-slate-700 flex items-center gap-2 text-sm">
                    <BookOpen size={16} className="text-indigo-500" /> {g}
                  </div>
                  {isGroupPaid ? (
                    <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold">
                      To'langan
                    </span>
                  ) : (
                    <button
                      onClick={() => setPayGroup(g)} // Qaysi fanga to'layotganini saqlaymiz
                      className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors flex items-center gap-1"
                    >
                      <CreditCard size={14} /> To'lash
                    </button>
                  )}
                </div>
              );
            }) : (
              <div className="p-3 bg-slate-50 text-slate-500 rounded-xl text-sm text-center font-medium">Guruhga qo'shilmagan</div>
            )}
          </div>

          {hasAnyDebt && !isExcepted && (
            <button
              onClick={handleException}
              disabled={isExcepting}
              className="mb-4 w-full bg-amber-50 text-amber-600 border border-amber-200 py-2.5 rounded-xl font-bold hover:bg-amber-100 flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
            >
              <ShieldAlert size={18} /> {isExcepting ? "Kutib turing..." : "To'lovdan istisno qilish"}
            </button>
          )}

          {isExcepted && hasAnyDebt && (
            <div className="mb-4 w-full bg-slate-100 text-slate-500 py-2.5 rounded-xl font-bold text-center text-sm flex items-center justify-center gap-2">
              <ShieldAlert size={16} /> Bu oy to'lovdan istisno qilingan
            </div>
          )}

          <div className="mt-auto">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 flex justify-center items-center gap-2 transition-colors"
            >
              <History size={18} /> Tarixni ko'rish ({studentPayments.length})
            </button>
          </div>

          {showHistory && (
            <div className="border-t pt-4 mt-4 flex flex-col flex-1 min-h-[200px]">
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="Oy yoki fan nomi..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full px-4 py-2 text-sm rounded-xl border outline-none focus:border-indigo-500 bg-slate-50"
                />
                <button
                  onClick={exportStudentHistory}
                  className="bg-emerald-50 text-emerald-600 px-3 rounded-xl hover:bg-emerald-100 transition-colors"
                >
                  <Download size={20} />
                </button>
              </div>

              <div className="overflow-y-auto space-y-2 pb-2 pr-1 max-h-[250px]">
                {filteredHistory.map((p) => (
                  <div key={p._id} className="p-3 border rounded-xl bg-white shadow-sm">
                    <div className="flex justify-between items-center text-sm mb-1.5">
                      <span className="font-bold text-slate-800">{formatMonth(p.month)}</span>
                      <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                        {Number(p.amount).toLocaleString()}
                      </span>
                    </div>
                    {/* Qaysi fanga to'lagani ko'rinib turadi */}
                    <div className="text-xs text-slate-500 font-medium mb-2 flex items-center gap-1">
                      <BookOpen size={12} /> <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">{p.groupName || "Umumiy"}</span>
                    </div>
                    <button
                      onClick={() => shareReceipt(p)}
                      className="w-full mt-1 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold flex justify-center items-center gap-2 hover:bg-blue-100 transition-colors"
                    >
                      <Send size={14} /> Telegramdan chek yuborish
                    </button>
                  </div>
                ))}
                {filteredHistory.length === 0 && (
                  <p className="text-center text-slate-400 text-sm mt-4">Hech narsa topilmadi</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* payGroup ni PaymentModal'ga prop qilib yuboramiz */}
      {payGroup && (
        <PaymentModal
          student={student}
          groupName={payGroup}
          isOpen={true}
          onClose={() => {
            setPayGroup(null); // Yopilganda tanlovni tozalaymiz
            onRefresh();
          }}
        />
      )}
    </>
  );
}