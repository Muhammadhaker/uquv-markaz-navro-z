import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI topilmadi!");
  return mongoose.connect(process.env.MONGODB_URI);
};

const paymentSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  groupName: { type: String, required: true },
  amount: { type: Number, required: true },
  paymentType: { type: String, enum: ['Naqd', 'Plastik'], required: true },
  month: { type: String, required: true },
  adminName: { type: String, required: true },
  date: { type: Date, default: Date.now }
});

const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema, 'payments');

// OYNI O'ZBEKCHAGA O'GIRISH FUNKSIYASI (Chek uchun)
const formatMonth = (m) => {
  if (!m) return "";
  const [y, mm] = m.split("-");
  const names = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];
  return `${names[parseInt(mm) - 1]} ${y}`;
};

export default async function handler(req, res) {
  try {
    await connectDB();

    if (req.method === 'GET') {
      const payments = await Payment.find({}).sort({ date: -1 });
      return res.status(200).json({ success: true, data: payments });
    }

    if (req.method === 'POST') {
      // Frontenddan kelgan ma'lumotlarni ikkiga bo'lamiz: telegramChatId va qolgan bazaga yoziladiganlari
      const { telegramChatId, ...paymentData } = req.body;

      // 1. To'lovni bazaga saqlaymiz
      const newPayment = await Payment.create(paymentData);

      // 2. AGAR O'QUVCHI BOT ORQALI RO'YXATDAN O'TGAN BO'LSA VA CHAT ID BO'LSA
      if (telegramChatId && process.env.TELEGRAM_BOT_TOKEN) {
        // Chek matni xuddi ulashish tugmasidagidek tayyorlanadi
        const text = `🧾 *TO'LOV CHEKI*\n\n🏢 *Markaz:* Navro'z O'quv Markazi\n👤 *O'quvchi:* ${paymentData.studentName}\n📚 *Guruh:* ${paymentData.groupName}\n💰 *Summa:* ${Number(paymentData.amount).toLocaleString()} so'm\n💳 *To'lov turi:* ${paymentData.paymentType}\n📅 *Qaysi oy uchun:* ${formatMonth(paymentData.month)}\n📆 *To'lov sanasi:* ${new Date().toLocaleDateString()}\n\n✅ _To'lov muvaffaqiyatli qabul qilindi!_`;

        // Telegram API orqali yuborish
        try {
          await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: telegramChatId,
              text: text,
              parse_mode: 'Markdown' // Bu yozuvlarni qalin (*) qilib beradi
            })
          });
        } catch (tgError) {
          console.error("Telegramga yuborishda xatolik:", tgError);
        }
      }

      return res.status(201).json({ success: true, data: newPayment });
    }

    if (req.method === 'DELETE') {
      await Payment.findByIdAndDelete(req.body.id);
      return res.status(200).json({ success: true });
    }

    if (req.method === 'PUT') {
      const { id, ...updateData } = req.body;
      const updated = await Payment.findByIdAndUpdate(id, updateData, { new: true });
      return res.status(200).json({ success: true, data: updated });
    }

    res.status(405).json({ message: "Metod ruxsat etilmagan" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}