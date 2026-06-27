import { useState } from "react";
import {
  X, Phone, BookOpen, CreditCard, History, Download, Send, User, Clock, ShieldAlert, Loader2, QrCode, Printer
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
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

const calculateCycles = (addedAtStr) => {
  if (!addedAtStr) return 1;
  const added = new Date(addedAtStr);
  if (isNaN(added.getTime())) return 1;

  const today = new Date();
  let m = (today.getFullYear() - added.getFullYear()) * 12 + today.getMonth() - added.getMonth();

  if (today.getDate() < added.getDate()) {
    m--;
  }
  return Math.max(1, m + 1);
};

export default function StudentDetailModal({ student, payments, onClose, onRefresh }) {
  const [payGroup, setPayGroup] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [isExcepting, setIsExcepting] = useState(false);
  const [isSendingWarning, setIsSendingWarning] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [localException, setLocalException] = useState(student?.exceptionMonths || []);

  const today = new Date();
  const targetMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

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

  const isExcepted = localException.includes(targetMonth);
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

  if (studentGroups.length > 0) {
    studentGroups.forEach(g => {
      const COURSE_PRICE = getPrice(g);
      const EXPECTED_TOTAL = COURSE_PRICE * activeCycles;

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
    const isCurrentlyExcepted = localException.includes(targetMonth);
    const confirmMsg = isCurrentlyExcepted
      ? "Bu o'quvchidan istisnoni olib tashlab, yana qarzlar ro'yxatiga qo'shasizmi?"
      : "Bu o'quvchini qarzlar ro'yxatidan yashirib, unga bot orqali ogohlantirish bormaydigan qilasizmi?";

    if (!window.confirm(confirmMsg)) return;

    setIsExcepting(true);
    try {
      let updatedExceptions;
      if (isCurrentlyExcepted) {
        updatedExceptions = localException.filter(m => m !== targetMonth);
      } else {
        updatedExceptions = [...localException, targetMonth];
      }

      const res = await fetch("/api/students", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: student._id, exceptionMonths: updatedExceptions }),
      });

      if (res.ok) {
        setLocalException(updatedExceptions);
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsExcepting(false);
    }
  };

// 🔥 QR KODNI CHOP ETISH FUNKSIYASI (FAQT OLDI QISMI 67x107mm)
  const handlePrintQR = () => {
    const qrElement = document.getElementById("qr-print-area");
    if (!qrElement) return;
    
    const printWindow = window.open('', '_blank', 'width=800,height=800');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${student.name} - Bejik (Oldi)</title>
          <style>
            @page { size: A4; margin: 10mm; }
            body { 
              font-family: 'Segoe UI', Arial, sans-serif; 
              display: flex; 
              justify-content: center; 
              align-items: flex-start; 
              padding-top: 25mm;
              height: 100vh; 
              margin: 0; 
              background-color: #fff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .badge-side {
              width: 67mm;
              height: 107mm;
              border: 1px dashed #000;
              box-sizing: border-box;
              padding: 8mm 4mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: space-between;
              background: #fff;
            }
            .header-title {
              color: #1e3a8a;
              font-size: 11px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              text-align: center;
              margin-bottom: 2px;
            }
            .header-sub {
              font-size: 8px;
              color: #64748b;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 1px;
              text-align: center;
            }
            .qr-box {
              padding: 6px;
              border: 2px solid #e2e8f0;
              border-radius: 10px;
              background: #fff;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .qr-box svg {
              width: 38mm !important;
              height: 38mm !important;
            }
            .student-details { text-align: center; width: 100%; }
            .st-name {
              font-size: 16px;
              font-weight: 800;
              color: #1e293b;
              text-transform: uppercase;
              margin-bottom: 3px;
              line-height: 1.1;
            }
            .st-group { font-size: 10px; color: #4f46e5; font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="badge-side">
            <div>
              <div class="header-title">G'ulomov Math Group</div>
              <div class="header-sub">Student Access Badge</div>
            </div>
            
            <div class="qr-box">
              ${qrElement.innerHTML}
            </div>
            
            <div class="student-details">
              <div class="st-name">${student.name}</div>
              <div class="st-group">📚 ${student.group || "Guruhsiz"}</div>
            </div>
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 400);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[95vh] flex flex-col relative overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800">{student.name}</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="overflow-y-auto pr-2 pb-4 custom-scrollbar">

            <button
              onClick={() => setShowQR(true)}
              className="w-full bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 flex justify-center items-center gap-2 transition-colors mb-4"
            >
              <QrCode size={18} /> QR-kodni ko'rish
            </button>

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
                        {g} <br />
                        <span className="text-[10px] text-slate-400 font-medium">Jami to'lashi kerak: {EXPECTED_TOTAL.toLocaleString()} so'm</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isGroupPaid ? (
                        <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold w-full text-center sm:w-auto">To'langan</span>
                      ) : isPartial ? (
                        <span className="bg-orange-100 text-orange-700 px-2 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap">Qarz: {qarz.toLocaleString()}</span>
                      ) : (
                        <span className="bg-rose-100 text-rose-700 px-2 py-1.5 rounded-lg text-xs font-bold">To'lanmagan</span>
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
                  className="w-full bg-rose-50 text-rose-600 border border-rose-200 py-2.5 rounded-xl font-bold hover:bg-rose-100 flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-wait"
                >
                  {isSendingWarning ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  {isSendingWarning ? "Yuborilmoqda..." : `Qarz haqida eslatish (${OVERALL_DEBT.toLocaleString()} so'm)`}
                </button>

                <button
                  onClick={handleException}
                  disabled={isExcepting}
                  className="w-full bg-amber-50 text-amber-600 border border-amber-200 py-2.5 rounded-xl font-bold hover:bg-amber-100 flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-wait"
                >
                  {isExcepting ? <Loader2 size={18} className="animate-spin" /> : <ShieldAlert size={18} />}
                  {isExcepting ? "Kutib turing..." : "To'lovdan istisno qilish"}
                </button>
              </div>
            )}

            {isExcepted && hasAnyDebt && (
              <button
                onClick={handleException}
                disabled={isExcepting}
                className="mb-4 w-full bg-slate-800 text-white py-3 rounded-xl font-bold hover:bg-slate-900 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait shadow-lg"
              >
                {isExcepting ? <Loader2 size={18} className="animate-spin text-amber-400" /> : <ShieldAlert size={18} className="text-amber-400" />}
                {isExcepting ? "Kutib turing..." : "Istisnoni olib tashlash"}
              </button>
            )}

            <div>
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

                <div className="space-y-2">
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
      </div>

      {/* 🔥 QR KOD MODAL OYNASI VA CHOP ETISH TUGMASI */}
      {showQR && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[70] animate-in fade-in duration-200">
          <div className="bg-white p-8 rounded-3xl text-center shadow-2xl relative w-full max-w-sm">

            <button
              onClick={handlePrintQR}
              className="absolute top-4 left-4 p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-full transition-colors flex items-center justify-center"
              title="QR kodni chop etish"
            >
              <Printer size={20} />
            </button>

            <button
              onClick={() => setShowQR(false)}
              className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-rose-100 hover:text-rose-600 rounded-full transition-colors text-slate-500"
            >
              <X size={20} />
            </button>

            <h3 className="font-bold text-xl mb-6 text-slate-800 mt-2">{student.name}</h3>

            <div id="qr-print-area" className="p-6 bg-slate-50 rounded-3xl border border-slate-200 inline-block shadow-inner">
              {/* 🔥 BOTA YO'NALTIRUVCHI QR KOD */}
              <QRCodeSVG value={`https://t.me/navroz_math_group_bot?start=${student._id}`} size={220} level="H" />
            </div>

            <p className="text-sm text-slate-500 mt-6 font-medium">Profilni ulash uchun skanerlang</p>
          </div>
        </div>
      )}

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

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </>
  );
}