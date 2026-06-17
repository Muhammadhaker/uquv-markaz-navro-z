import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI topilmadi!");
  return mongoose.connect(process.env.MONGODB_URI);
};

// To'lov sxemasiga telegramMessageId maydoni qo'shildi
const paymentSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  groupName: { type: String, required: true },
  amount: { type: Number, required: true },
  paymentType: { type: String, required: true },
  month: { type: String, required: true },
  adminName: { type: String, default: "Admin" },
  telegramChatId: { type: String, default: null },
  telegramMessageId: { type: Number, default: null }, // Bot yuborgan xabar IDsi
  date: { type: Date, default: Date.now }
});

const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema, 'payments');

export default async function handler(req, res) {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  try {
    await connectDB();

    // 1. TO'LOVLARNI OLISH
    if (req.method === 'GET') {
      const payments = await Payment.find({}).sort({ date: -1 });
      return res.status(200).json({ success: true, data: payments });
    }

    // 2. YANGI TO'LOV QISHISH (VA AVTOMATIK CHEK YUBORISH)
    if (req.method === 'POST') {
      const { studentId, studentName, groupName, amount, paymentType, month, adminName, telegramChatId } = req.body;
      
      let messageId = null;

      // Agar o'quvchining telegramChatId si bo'lsa, birinchi chek yuboramiz
      if (telegramChatId) {
        const formatMonthName = (m) => {
          const [y, mm] = m.split("-");
          const names = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];
          return `${names[parseInt(mm) - 1]} ${y}`;
        };

        const text = `🧾 *TO'LOV CHEKI*\n\n👤 *O'quvchi:* ${studentName}\n📚 *Guruh:* ${groupName}\n💰 *Summa:* ${Number(amount).toLocaleString()} so'm\n💳 *Turi:* ${paymentType}\n📅 *Oy:* ${formatMonthName(month)}\n\n✅ _To'lov muvaffaqiyatli qabul qilindi!_`;

        try {
          const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: telegramChatId,
              text: text,
              parse_mode: 'Markdown'
            })
          });
          const tgData = await tgRes.json();
          
          // Telegram yuborgan xabarning ID sini ushlab qolamiz
          if (tgData.ok) {
            messageId = tgData.result.message_id;
          }
        } catch (err) {
          console.error("Telegramga chek yuborishda xato:", err);
        }
      }

      // To'lovni bazaga saqlaymiz (ichida telegramMessageId ham ketadi)
      const newPayment = await Payment.create({
        studentId,
        studentName,
        groupName,
        amount,
        paymentType,
        month,
        adminName,
        telegramChatId,
        telegramMessageId: messageId // Xabar ID si saqlandi
      });

      return res.status(201).json({ success: true, data: newPayment });
    }

    // 3. TO'LOVNI O'CHIRISH (VA TELEGRAMDAN CHEKNI HAM YO'Q QILISH)
    if (req.method === 'DELETE') {
      const { id } = req.body;

      // Avval o'chirilishi kerak bo'lgan to'lovni bazadan topamiz
      const paymentToDelete = await Payment.findById(id);

      if (!paymentToDelete) {
        return res.status(404).json({ success: false, message: "To'lov topilmadi" });
      }

      // Agar ushbu to'lovda telegramChatId va telegramMessageId mavjud bo'lsa
      if (paymentToDelete.telegramChatId && paymentToDelete.telegramMessageId) {
        try {
          // Telegramdan xabarni o'chirish API si
          await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: paymentToDelete.telegramChatId,
              message_id: paymentToDelete.telegramMessageId
            })
          });
        } catch (err) {
          console.error("Telegramdan xabarni o'chirishda xato:", err);
        }
      }

      // Endi to'lovni bazaning o'zidan ham o'chirib tashlaymiz
      await Payment.findByIdAndDelete(id);
      return res.status(200).json({ success: true });
    }

    res.status(405).json({ message: "Metod ruxsat etilmagan" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}