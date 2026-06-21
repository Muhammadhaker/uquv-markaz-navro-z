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

      // 1. Joriy oy to'lovlarini tekshirish
      const currentMonthPayments = await Payment.find({ studentId: student._id, month: targetMonth });
      
      // 🔥 YANGI: Qarzni hisoblash (Oylik to'lov 300,000 deb belgilandi)
      const COURSE_PRICE = 300000;
      let totalPaidForMonth = 0;
      
      // Bu oyda bir necha marta to'lagan bo'lsa, hammasini qo'shamiz
      currentMonthPayments.forEach(p => {
        totalPaidForMonth += Number(p.amount) || 0; 
      });

      const qarz = COURSE_PRICE - totalPaidForMonth;
      const isExcepted = student.exceptionMonths && student.exceptionMonths.includes(targetMonth);

      // 🔥 YANGI: To'lov holatini 3 ta turga ajratamiz (unpaid, partial, paid, excepted)
      let paymentStatus = "unpaid"; 
      if (isExcepted) {
        paymentStatus = "excepted"; 
      } else if (qarz <= 0) {
        paymentStatus = "paid"; // To'liq to'lagan
      } else if (totalPaidForMonth > 0) {
        paymentStatus = "partial"; // Chala to'lagan (Bo'lib to'lash)
      }

      const paymentsHistory = await Payment.find({ studentId: student._id }).sort({ date: -1 });

      return res.status(200).json({ 
        success: true, 
        data: student,
        paymentStatus: paymentStatus, 
        month: targetMonth,
        coursePrice: COURSE_PRICE, // Frontendga yuboramiz
        totalPaid: totalPaidForMonth, // Frontendga yuboramiz
        qarz: qarz > 0 ? qarz : 0, // Frontendga yuboramiz
        paymentsHistory: paymentsHistory 
      });
    } catch (error) {
      console.error("Profile API xatosi:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  return res.status(405).json({ message: "Ruxsat etilmagan metod" });
}