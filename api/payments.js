import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI topilmadi!");
  return mongoose.connect(process.env.MONGODB_URI);
};

// 🔥 YANGI: teacherId maydoni qo'shildi
const paymentSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  groupName: { type: String, required: true },
  amount: { type: Number, required: true },
  paymentType: { type: String, required: true },
  month: { type: String, required: true },
  adminName: { type: String, default: "Admin" },
  telegramChatId: { type: String, default: null },
  telegramMessageId: { type: Number, default: null }, 
  extraMessageIds: { type: [Number], default: [] }, 
  teacherId: { type: String, required: true }, // To'lov qaysi ustozning kassasiga tushgani
  date: { type: Date, default: Date.now }
});

const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema, 'payments');

export default async function handler(req, res) {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  try {
    await connectDB();

    const role = req.headers['x-user-role'];
    const userId = req.headers['x-user-id'];
    const parentId = req.headers['x-parent-id'];

    // 1. TO'LOVLARNI OLISH
    if (req.method === 'GET') {
      let query = {};
      if (role === 'teacher') query = { teacherId: userId };
      else if (role === 'assistant') query = { teacherId: parentId };

      const payments = await Payment.find(query).sort({ date: -1 });
      return res.status(200).json({ success: true, data: payments });
    }

    // 2. YANGI TO'LOV QO'SHISH (VA CHEK YUBORISH)
    if (req.method === 'POST') {
      const { studentId, studentName, groupName, amount, paymentType, month, adminName, telegramChatId } = req.body;
      const ownerId = role === 'assistant' ? parentId : userId;
      let messageId = null;

      if (telegramChatId) {
        const formatMonthName = (m) => {
          const [y, mm] = m.split("-");
          const names = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];
          return `${names[parseInt(mm) - 1]} ${y}`;
        };

        const text = `🧾 *TO'LOV CHEKI*\n\n👤 *O'quvchi:* ${studentName}\n📚 *Guruh:* ${groupName}\n💰 *Summa:* ${Number(amount).toLocaleString()} so'm\n💳 *Turi:* ${paymentType}\n📅 *Oy:* ${formatMonthName(month)}\n\n✅ _To'lov muvaffaqiyatli qabul qilindi!_`;

        try {
          const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: telegramChatId, text: text, parse_mode: 'Markdown' })
          });
          const tgData = await tgRes.json();
          if (tgData.ok) messageId = tgData.result.message_id;
        } catch (err) { }
      }

      const newPayment = await Payment.create({
        studentId, studentName, groupName, amount, paymentType, month, adminName, telegramChatId,
        telegramMessageId: messageId,
        teacherId: ownerId // To'lov ustozning shaxsiy kassasiga tushadi
      });

      return res.status(201).json({ success: true, data: newPayment });
    }

    // 3. TO'LOVNI O'CHIRISH
    if (req.method === 'DELETE') {
      const { id } = req.body;
      const payment = await Payment.findById(id);

      // Agar Yordamchi yoki Ustoz o'chirmoqchi bo'lsa, bu uning pulimi yoki yo'qmi tekshiramiz
      const ownerId = role === 'assistant' ? parentId : userId;
      if (role !== 'super_admin' && payment.teacherId !== ownerId) {
         return res.status(403).json({ success: false, message: "Siz faqat o'zingizning kassangizdagi to'lovlarni o'chira olasiz!" });
      }

      if (payment && payment.telegramChatId) {
        const messagesToDelete = [];
        if (payment.telegramMessageId) messagesToDelete.push(payment.telegramMessageId);
        if (payment.messageId) messagesToDelete.push(payment.messageId); 
        if (payment.message_id) messagesToDelete.push(payment.message_id);
        if (payment.extraMessageIds && payment.extraMessageIds.length > 0) {
          messagesToDelete.push(...payment.extraMessageIds);
        }

        for (let msgId of messagesToDelete) {
          try {
            await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: payment.telegramChatId, message_id: msgId })
            });
          } catch (err) {}
        }
      }

      await Payment.findByIdAndDelete(id);
      return res.status(200).json({ success: true });
    }

    res.status(405).json({ message: "Metod ruxsat etilmagan" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}