import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI topilmadi!");
  return mongoose.connect(process.env.MONGODB_URI);
};

// 🔥 O'ZGARTIRILDI: phone endi majburiy emas.
const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  parentName: { type: String, required: true },
  phone: { type: String, default: "Kiritilmagan" }, 
  group: { type: String, required: true },
  telegramChatId: { type: String, default: null },
  groupsData: { type: Array, default: [] },
  isNewStudent: { type: Boolean, default: true },
  exceptionMonths: { type: [String], default: [] },
  addedAt: { type: Date, default: Date.now }
}, { strict: false }); 

const Student = mongoose.models.Student || mongoose.model('Student', studentSchema, 'students');

export default async function handler(req, res) {
  try {
    await connectDB();

    if (req.method === 'GET') {
      const { telegramChatId } = req.query;
      if (telegramChatId) {
        const student = await Student.findOne({ 
            $or: [
                { telegramChatId: telegramChatId },
                { telegramChatId: String(telegramChatId) },
                { telegramChatId: Number(telegramChatId) }
            ] 
        });
        return res.status(200).json({ exists: !!student });
      }
      
      const students = await Student.find({}).sort({ addedAt: -1 });
      return res.status(200).json({ success: true, data: students });
    }

    if (req.method === 'POST') {
      const newStudent = await Student.create(req.body);

      // Agar formadan to'g'ridan-to'g'ri TG ID kiritilgan bo'lsa xabar boradi
      if (newStudent.telegramChatId && newStudent.telegramChatId.trim() !== "") {
        try {
          await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: newStudent.telegramChatId,
              text: `🎉 *Tabriklaymiz, ${newStudent.name}!*\n\nSiz ro'yxatdan o'tdingiz.\n\n📚 *Fan:* ${newStudent.group}\n\n👇 _Pastki menyudan Shaxsiy Kabinetingizga kirishingiz mumkin!_`,
              parse_mode: 'Markdown',
              reply_markup: {
                keyboard: [
                  [{ text: "👤 Shaxsiy Kabinet", web_app: { url: `https://uquv-markaz-navroz.vercel.app/profile?chatId=${newStudent.telegramChatId}` } }],
                  [{ text: "📋 Mening ma'lumotlarim" }]
                ],
                resize_keyboard: true,
                is_persistent: true
              }
            })
          });
        } catch (err) {
          console.error("Xabar yuborishda xato:", err);
        }
      }
      return res.status(201).json({ success: true, data: newStudent });
    }

    if (req.method === 'PUT') {
      const { id, ...updateData } = req.body;
      const updatedStudent = await Student.findByIdAndUpdate(id, updateData, { new: true });
      return res.status(200).json({ success: true, data: updatedStudent });
    }

    if (req.method === 'DELETE') {
      await Student.findByIdAndDelete(req.body.id);
      return res.status(200).json({ success: true });
    }

    res.status(405).json({ message: "Metod ruxsat etilmagan" });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}