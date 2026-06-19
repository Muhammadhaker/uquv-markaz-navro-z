import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI topilmadi!");
  return mongoose.connect(process.env.MONGODB_URI);
};

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  parentName: { type: String, required: true },
  phone: { type: String, required: true },
  group: { type: String, required: true },
  telegramChatId: { type: String, default: null },
  isNewStudent: { type: Boolean, default: true }, // <--- YANGI QO'SHILDI
  exceptionMonths: { type: [String], default: [] },
  addedAt: { type: Date, default: Date.now } // Mana shu qator vaqtni real-time saqlaydi!
});

const Student = mongoose.models.Student || mongoose.model('Student', studentSchema, 'students');

export default async function handler(req, res) {
  try {
    await connectDB();

    if (req.method === 'GET') {
      const students = await Student.find({}).sort({ addedAt: -1 });
      return res.status(200).json({ success: true, data: students });
    }

    if (req.method === 'POST') {
      const newStudent = await Student.create(req.body);

      if (newStudent.telegramChatId) {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        const text = `🎉 *Tabriklaymiz, ${newStudent.name}!*\n\nSiz Navro'z O'quv Markazidan muvaffaqiyatli ro'yxatdan o'tdingiz.\n\n📚 *Tanlagan faningiz:* ${newStudent.group}\n\n⏳ _Tez orada adminlarimiz siz bilan bog'lanishadi. Darslarda ko'rishguncha!_`;

        // AWAIT qo'shildi: Endi xabar yuborilmaguncha server kutib turadi
        try {
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: newStudent.telegramChatId,
              text: text,
              parse_mode: 'Markdown'
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

// api/students.js faylingizga qo'shing
if (req.method === 'GET') {
    const { telegramChatId } = req.query;
    if (telegramChatId) {
        const student = await Student.findOne({ telegramChatId: Number(telegramChatId) });
        return res.status(200).json({ exists: !!student });
    }
    const students = await Student.find({});
    return res.status(200).json({ success: true, data: students });
}