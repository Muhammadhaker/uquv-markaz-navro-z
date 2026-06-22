import { useState } from "react";
import {
  X, Phone, BookOpen, CreditCard, History, Download, Send, User, Clock, ShieldAlert,
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

// 🔥 TIZIMNING YURAGI: Necha oy (sikl) o'tganini hisoblaydi
const calculateCycles = (addedAtStr) => {
  if (!addedAtStr) return 1;
  const added = new Date(addedAtStr);
  if (isNaN(added.getTime())) return 1;
  
  const today = new Date();
  let m = (today.getFullYear() - added.getFullYear()) * 12 + today.getMonth() - added.getMonth();
  
  // Agar bugungi kun, o'quvchi qo'shilgan kundan hali kichik bo'lsa (sana kelmagan bo'lsa)
  if (today.getDate() < added.getDate()) {
    m--;
  }
  
  // O'quvchi har doim kelgan kunidan kamida 1 oy (oldindan) to'lashi shart
  return Math.max(1, m + 1);
};

export default function StudentDetailModal({ student, payments, onClose, onRefresh }) {
  const [payGroup, setPayGroup] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [isExcepting, setIsExcepting] = useState(false);
  const [isSendingWarning, setIsSendingWarning] = useState(false);

  const today = new Date();
  const targetMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`; // Faqat istisnolar uchun kerak

  const studentPayments = payments
    .filter((p) => p.studentId === student._id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const filteredHistory = studentPayments.filter(
    (p) =>
      formatMonth(p.month).toLowerCase().includes(historySearch.toLowerCase()) ||
      p.paymentType.toLowerCase().includes(historySearch.toLowerCase()) ||
      (p.groupName && p.groupName.toLowerCase().includes(historySearch.toLowerCase()))
  );

  const studentGroups = student.group ? student.group.split(',').map(g => g.trim()).filter(Boolean) : [];
  const isExcepted = student?.exceptionMonths?.includes(targetMonth);

  // O'quvchining jami aktiv oylari soni
  const activeCycles = calculateCycles(student.addedAt);

  const getPrice = (groupName) => {
    if (student.groupsData && Array.isArray(student.groupsData) && student.groupsData.length > 0) {
      const match = student.groupsData.find(x => x.name?.trim().toLowerCase() === groupName?.trim().toLowerCase());
      if (match && match.price !== undefined) return Number(match.price);
    }
    return 300000; 
  };

  const debtDetails = [];
  let OVERALL_DEBT = 0;

  // 🔥 Yangi Logika: Barcha vaqt uchun jami kutilayotgan summa - jami to'langan summa
  if (studentGroups.length > 0) {
    studentGroups.forEach(g => {
      const COURSE_PRICE = getPrice(g);
      const EXPECTED_TOTAL = COURSE_PRICE * activeCycles; // Masalan: 2 oydan beri o'qiydi = 2 * 300ming = 600ming
      
      const groupPayments = studentPayments.filter(p => p.groupName === g || !p.groupName);
      const totalPaid = groupPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      
      const qarz = EXPECTED_TOTAL - totalPaid;
      
      if (qarz > 0) {
        debtDetails.push({ group: g, qarz });
        OVERALL_DEBT += qarz;
      }
    });
  } else {
    const COURSE_PRICE = 300000;
    const EXPECTED_TOTAL = COURSE_PRICE * activeCycles;
    const totalPaid = studentPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const qarz = EXPECTED_TOTAL - totalPaid;
    if (qarz > 0) {
      OVERALL_DEBT += qarz;
    }
  }

  const hasAnyDebt = OVERALL_DEBT > 0;

  const sendDebtWarning = async () => {
    if (!student.telegramChatId) return alert("Bu o'quvchi bot orqali ro'yxatdan o'tmagan!");
    if (!window.confirm(`${student.name} ga ${OVERALL_DEBT.toLocaleString()} so'm qarz haqida eslatma yuborasizmi?`)) return;

    setIsSendingWarning(true);

    const debtText = debtDetails.map(d => `▪️ *${d.group}:* ${d.qarz.toLocaleString()} so'm`).join("\n");
    const text = `⚠️ *DIQQAT: QARZDORLIK!*\n\n👤 *O'quvchi:* ${student.name}\n📅 *Holat:* ${activeCycles} oylik davr uchun\n\n📚 *Fanlar bo'yicha jami qarz:*\n${debtText}\n\n💰 *Jami qarzingiz:* ${OVERALL_DEBT.toLocaleString()} so'm\n\n_Iltimos, to'lovni tezroq amalga oshirishingizni so'raymiz._`;

    try {
      const res = await fetch("/api/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: student.telegramChatId, text }),
      });
      const data = await res.json();
      if (data.success) {
        alert("✅ Qarz eslatmasi o'quvchiga yuborildi!");
      } else {
        alert("Xatolik: " + data.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSendingWarning(false);
    }
  };

  const exportStudentHistory = () => {
    if (studentPayments.length === 0) return alert("Yuklab olish uchun to'lov tarixi yo'q!");

    let table = `\uFEFF
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <style>
          table { border-collapse: collapse; font-family: 'Segoe UI', Arial, sans-serif; width: 100%; }
          th { background-color: #4f46e5; color: #ffffff; font-weight: bold; border: 1px solid #000000; padding: 12px; text-align: center; }
          td { border: 1px solid #d1d5db; padding: 8px; vertical-align: middle; }
          .num { text-align: right; white-space: nowrap; font-weight: bold; color: #059669; }
          .text-center { text-align: center; }
          .bold { font-weight: bold; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>
              <th>O'quvchi</th>
              <th>Fan/Guruh</th>
              <th>Summa</th>
              <th>To'lov turi</th>
              <th>Oy</th>
              <th>Sana</th>
            </tr>
          </thead>
          <tbody>`;

    studentPayments.forEach((p) => {
      table += `<tr>
        <td class="bold">${student.name}</td>
        <td class="text-center">${p.groupName || student.group}</td>
        <td class="num">${Number(p.amount).toLocaleString("ru-RU")}</td>
        <td class="text-center">${p.paymentType}</td>
        <td class="text-center">${formatMonth(p.month)}</td>
        <td class="text-center">${new Date(p.date).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
      </tr>`;
    });

    table += `</tbody></table></body></html>`;

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
    const text = `🧾 *TO'LOV CHEKI*\n\n👤 *O'quvchi:* ${student.name}\n📚 *Fan:* ${p.groupName || student.group}\n💰 *Summa:* ${Number(p.amount).toLocaleString()} so'm\n💳 *Turi:* ${p.paymentType}\n📅 *To'lov vaqti:* ${new Date(p.date).toLocaleString("ru-RU")}\n\n✅ _To'lov qabul qilindi!_`;

    if (student.telegramChatId) {
      try {
        const res = await fetch("/api/send-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatId: student.telegramChatId, text, paymentId: p._id }),
        });
        const data = await res.json();
        if (data.success) alert("✅ Chek o'quvchiga bot orqali yuborildi!");
        else alert("Chekni yuborishda xatolik yuz berdi.");
      } catch (error) { console.error("Bot orqali yuborish xatosi:", error); }
    } else {
      window.open(`tg://msg_url?url=${encodeURIComponent(text)}`, "_blank");
    }
  };

  const handleException = async () => {
    const isCurrentlyExcepted = student.exceptionMonths?.includes(targetMonth);
    const confirmMsg = isCurrentlyExcepted 
      ? "Bu o'quvchidan istisnoni olib tashlab, yana qarzlar ro'yxatiga qo'shasizmi?"
      : "Bu o'quvchini qarzlar ro'yxatidan yashirib, unga bot orqali ogohlantirish bormaydigan qilasizmi?";
      
    if (!window.confirm(confirmMsg)) return;

    setIsExcepting(true);
    try {
      let updatedExceptions;
      if (isCurrentlyExcepted) {
         updatedExceptions = (student.exceptionMonths || []).filter(m => m !== targetMonth);
      } else {
         updatedExceptions = [...(student.exceptionMonths || []), targetMonth];
      }

      await fetch("/api/students", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: student._id, exceptionMonths: updatedExceptions }),
      });
      onRefresh();
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
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl font-medium text-slate-700 text-sm">
              <User size={18} className="text-indigo-500" /> {student.parentName || "Ota-ona ismi yo'q"}
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl font-medium text-slate-700 text-sm">
              <Phone size={18} className="text-indigo-500" /> {formatPhoneNumber(student.phone)}
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl font-medium text-slate-700 text-sm">
              <Clock size={18} className="text-emerald-500 min-w-[18px]" />
              Qo'shilgan: {student.addedAt ? new Date(student.addedAt).toLocaleDateString("ru-RU") : "Noma'lum"}
            </div>
          </div>

          <div className="mb-6 space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Guruhlar va Jami To'lov ({activeCycles} oylik davr)</h3>

            {studentGroups.length > 0 ? studentGroups.map((g, idx) => {
              const COURSE_PRICE = getPrice(g);
              const EXPECTED_TOTAL = COURSE_PRICE * activeCycles;
              const groupPayments = studentPayments.filter(p => p.groupName === g || !p.groupName);
              const totalPaid = groupPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
              const qarz = EXPECTED_TOTAL - totalPaid;
              
              const isGroupPaid = qarz <= 0;
              const isPartial = totalPaid > 0 && qarz > 0;

              return (
                <div key={idx} className="flex flex-col sm:flex-row justify-between sm:items-center p-3 border rounded-xl bg-white shadow-sm gap-3">
                  <div className="font-bold text-slate-700 flex items-center gap-2 text-sm">
                    <BookOpen size={16} className="text-indigo-500 min-w-[16px]" /> 
                    <div>
                       {g} <br/>
                       <span className="text-[10px] text-slate-400 font-medium">Jami to'lashi kerak: {EXPECTED_TOTAL.toLocaleString()} so'm</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {isGroupPaid ? (
                      <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold w-full text-center sm:w-auto">
                        To'langan
                      </span>
                    ) : isPartial ? (
                      <span className="bg-orange-100 text-orange-700 px-2 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap">
                        Qarz: {qarz.toLocaleString()}
                      </span>
                    ) : (
                      <span className="bg-rose-100 text-rose-700 px-2 py-1.5 rounded-lg text-xs font-bold">
                        To'lanmagan
                      </span>
                    )}

                    {!isGroupPaid && (
                      <button
                        onClick={() => setPayGroup(g)}
                        className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors flex items-center gap-1 justify-center whitespace-nowrap"
                      >
                        <CreditCard size={14} /> To'lash
                      </button>
                    )}
                  </div>
                </div>
              );
            }) : (
              <div className="p-3 bg-slate-50 text-slate-500 rounded-xl text-sm text-center font-medium">Guruhga qo'shilmagan</div>
            )}
          </div>

          {!isExcepted && hasAnyDebt && (
            <div className="space-y-3 mb-4">
              <button
                onClick={sendDebtWarning}
                disabled={isSendingWarning}
                className="w-full bg-rose-50 text-rose-600 border border-rose-200 py-2.5 rounded-xl font-bold hover:bg-rose-100 flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
              >
                <Send size={18} /> {isSendingWarning ? "Yuborilmoqda..." : `Qarz haqida eslatish (${OVERALL_DEBT.toLocaleString()} so'm)`}
              </button>

              <button
                onClick={handleException}
                disabled={isExcepting}
                className="w-full bg-amber-50 text-amber-600 border border-amber-200 py-2.5 rounded-xl font-bold hover:bg-amber-100 flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
              >
                <ShieldAlert size={18} /> {isExcepting ? "Kutib turing..." : "To'lovdan istisno qilish"}
              </button>
            </div>
          )}

          {isExcepted && hasAnyDebt && (
            <button
              onClick={handleException}
              disabled={isExcepting}
              className="mb-4 w-full bg-slate-800 text-white py-3 rounded-xl font-bold hover:bg-slate-900 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg"
            >
              <ShieldAlert size={18} className="text-amber-400" /> {isExcepting ? "Kutib turing..." : "Istisnoni olib tashlash"}
            </button>
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
                        {Number(p.amount).toLocaleString("ru-RU")}
                      </span>
                    </div>
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

      {payGroup && (
        <PaymentModal
          student={student}
          groupName={payGroup}
          isOpen={true}
          onClose={() => {
            setPayGroup(null);
            onRefresh();
          }}
        />
      )}
    </>
  );
}