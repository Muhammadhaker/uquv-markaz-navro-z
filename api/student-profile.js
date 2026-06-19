import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  return mongoose.connect(process.env.MONGODB_URI);
};

const Student = mongoose.models.Student || mongoose.model('Student', new mongoose.Schema({}, { strict: false }));
const Payment = mongoose.models.Payment || mongoose.model('Payment', new mongoose.Schema({}, { strict: false }));

export default async function handler(req, res) {
  await connectDB();

  if (req.method === 'GET') {
    try {
      const { chatId } = req.query;
      
      // O'quvchini topamiz
      const student = await Student.findOne({ telegramChatId: Number(chatId) });
      if (!student) {
        return res.status(404).json({ success: false, message: "O'quvchi topilmadi" });
      }

      // To'lovni tekshiramiz (Xuddi Admin panelgiga o'xshab)
      const today = new Date();
      const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
      const lastMonthStr = today.getMonth() === 0
        ? `${today.getFullYear() - 1}-12`
        : `${today.getFullYear()}-${String(today.getMonth()).padStart(2, "0")}`;
      const targetMonth = today.getDate() <= 5 ? lastMonthStr : currentMonthStr;

      const payments = await Payment.find({ studentId: student._id, month: targetMonth });
      const hasPaid = payments.length > 0;

      return res.status(200).json({ 
        success: true, 
        data: student,
        hasPaid: hasPaid,
        month: targetMonth
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  return res.status(405).json({ message: "Ruxsat etilmagan metod" });
}