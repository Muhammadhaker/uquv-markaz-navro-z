import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  return mongoose.connect(process.env.MONGODB_URI);
};

// Modellar (Collection nomlari aniq ko'rsatildi)
const Student = mongoose.models.Student || mongoose.model('Student', new mongoose.Schema({}, { strict: false }), 'students');
const Payment = mongoose.models.Payment || mongoose.model('Payment', new mongoose.Schema({}, { strict: false }), 'payments');

export default async function handler(req, res) {
  await connectDB();

  if (req.method === 'GET') {
    try {
      const { chatId } = req.query;
      
      // XAVFSIZ QIDIRUV: chatId ni ham raqam, ham matn sifatida izlaymiz
      const student = await Student.findOne({ 
        $or: [
          { telegramChatId: Number(chatId) },
          { telegramChatId: String(chatId) }
        ]
      });

      if (!student) {
        return res.status(404).json({ success: false, message: "O'quvchi topilmadi" });
      }

      // To'lov oyni tekshiramiz
      const today = new Date();
      let year = today.getFullYear();
      let month = today.getMonth() + 1;

      if (today.getDate() <= 5) {
        month -= 1;
        if (month === 0) {
          month = 12;
          year -= 1;
        }
      }
      
      const targetMonth = `${year}-${String(month).padStart(2, "0")}`;

      // To'lovlar ro'yxatini tekshirish
      const payments = await Payment.find({ studentId: student._id, month: targetMonth });
      
      // YANGI: Agar o'quvchi shu oy uchun istisno (exception) qilingan bo'lsa, uni qarz deb hisoblamaymiz
      const isExcepted = student.exceptionMonths && student.exceptionMonths.includes(targetMonth);
      const hasPaid = payments.length > 0 || isExcepted;

      return res.status(200).json({ 
        success: true, 
        data: student,
        hasPaid: hasPaid,
        month: targetMonth
      });
    } catch (error) {
      console.error("Profile API xatosi:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  return res.status(405).json({ message: "Ruxsat etilmagan metod" });
}