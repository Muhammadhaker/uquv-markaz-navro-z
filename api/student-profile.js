import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  return mongoose.connect(process.env.MONGODB_URI);
};

const Student = mongoose.models.Student || mongoose.model('Student', new mongoose.Schema({}, { strict: false }), 'students');
const Payment = mongoose.models.Payment || mongoose.model('Payment', new mongoose.Schema({}, { strict: false }), 'payments');

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  await connectDB();

  if (req.method === 'GET') {
    try {
      const { chatId } = req.query;
      
      const student = await Student.findOne({ 
        $or: [
          { telegramChatId: Number(chatId) },
          { telegramChatId: String(chatId) }
        ]
      });

      if (!student) {
        return res.status(404).json({ success: false, message: "O'quvchi topilmadi" });
      }

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

      // 1. Joriy oy to'lovini tekshirish
      const currentMonthPayments = await Payment.find({ studentId: student._id, month: targetMonth });
      
      const isExcepted = student.exceptionMonths && student.exceptionMonths.includes(targetMonth);
      const actuallyPaid = currentMonthPayments.length > 0;

      let paymentStatus = "unpaid"; 
      if (actuallyPaid) {
        paymentStatus = "paid"; 
      } else if (isExcepted) {
        paymentStatus = "excepted"; 
      }

      // 🔥 YANGI: O'quvchining hamma oylardagi hamma to'lovlarini tariq sifatida tortamiz
      const paymentsHistory = await Payment.find({ studentId: student._id }).sort({ date: -1 });

      return res.status(200).json({ 
        success: true, 
        data: student,
        paymentStatus: paymentStatus, 
        month: targetMonth,
        paymentsHistory: paymentsHistory // Tarix massivi ketdi
      });
    } catch (error) {
      console.error("Profile API xatosi:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  return res.status(405).json({ message: "Ruxsat etilmagan metod" });
}