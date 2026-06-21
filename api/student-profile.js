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
      const safeId = student._id.toString();

      // 1. Joriy oy to'lovlarini chaqirish
      const currentMonthPayments = await Payment.find({ 
        $or: [ { studentId: student._id }, { studentId: safeId } ],
        month: targetMonth 
      });
      
      // 🔥 YANGI: O'quvchining fanlari bo'yicha qarzni hisoblash
      const studentGroups = student.group ? student.group.split(',').map(g => g.trim()).filter(Boolean) : [];
      const COURSE_PRICE = 300000;
      const EXPECTED_TOTAL = Math.max(1, studentGroups.length) * COURSE_PRICE;

      const debtDetails = [];
      let totalPaidForMonth = 0;
      let overallQarz = 0;

      if (studentGroups.length > 0) {
        studentGroups.forEach(g => {
          const groupPayments = currentMonthPayments.filter(p => p.groupName === g || !p.groupName);
          const paidForGroup = groupPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
          totalPaidForMonth += paidForGroup;

          const qarzForGroup = COURSE_PRICE - paidForGroup;
          if (qarzForGroup > 0) {
            overallQarz += qarzForGroup;
          }

          debtDetails.push({
            group: g,
            paid: paidForGroup,
            qarz: qarzForGroup > 0 ? qarzForGroup : 0,
            isPaid: qarzForGroup <= 0
          });
        });
      } else {
         // Guruhsiz bo'lsa
         currentMonthPayments.forEach(p => {
           totalPaidForMonth += Number(p.amount) || 0;
         });
         overallQarz = EXPECTED_TOTAL - totalPaidForMonth;
         if (overallQarz < 0) overallQarz = 0;
      }

      const isExcepted = student.exceptionMonths && student.exceptionMonths.includes(targetMonth);

      // To'lov holatini aniqlash
      let paymentStatus = "unpaid"; 
      if (isExcepted) {
        paymentStatus = "excepted"; 
      } else if (overallQarz <= 0) {
        paymentStatus = "paid"; 
      } else if (totalPaidForMonth > 0) {
        paymentStatus = "partial"; 
      }

      // 🔥 YANGI: To'lovlar tarixini (eski oylarni ham qo'shib) chaqirish
      const paymentsHistory = await Payment.find({ 
        $or: [ { studentId: student._id }, { studentId: safeId } ]
      }).sort({ date: -1 });

      return res.status(200).json({ 
        success: true, 
        data: student,
        paymentStatus: paymentStatus, 
        month: targetMonth,
        coursePrice: EXPECTED_TOTAL, 
        totalPaid: totalPaidForMonth, 
        qarz: overallQarz, 
        debtDetails: debtDetails, // O'quvchi har bir fan qarzini ko'rishi uchun
        paymentsHistory: paymentsHistory 
      });
    } catch (error) {
      console.error("Profile API xatosi:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  return res.status(405).json({ message: "Ruxsat etilmagan metod" });
}