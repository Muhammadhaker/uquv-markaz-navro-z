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

  // 🔥 1. PROFILNI UZIB TASHLASH (DISCONNECT)
  if (req.method === 'POST') {
    try {
      const { action, studentId } = req.body;
      if (action === 'disconnect') {
        // Shu o'quvchidan telegramChatId ni o'chirib tashlaymiz (null qilamiz)
        await Student.findByIdAndUpdate(studentId, { $set: { telegramChatId: null } });
        return res.status(200).json({ success: true, message: "Profil hisobdan uzildi!" });
      }
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // 🔥 2. BARCHA ULANGAN PROFILLARNI OLIB KELISH
  if (req.method === 'GET') {
    try {
      const { chatId } = req.query;
      
      // Bitta odamga ulangan BARCHA o'quvchilarni topamiz (find ishlatildi)
      const students = await Student.find({ 
        $or: [
          { telegramChatId: Number(chatId) },
          { telegramChatId: String(chatId) }
        ]
      });

      if (!students || students.length === 0) {
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

      // Barcha o'quvchilarning to'lov holatini bittama-bitta hisoblab chiqamiz
      const enrichedStudents = await Promise.all(students.map(async (student) => {
        const safeId = student._id.toString();

        const currentMonthPayments = await Payment.find({ 
          $or: [ { studentId: student._id }, { studentId: safeId } ],
          month: targetMonth 
        });
        
        const studentGroups = student.group ? student.group.split(',').map(g => g.trim()).filter(Boolean) : [];
        
        const getPrice = (groupName) => {
          if (student.groupsData && Array.isArray(student.groupsData)) {
            const match = student.groupsData.find(x => x.name === groupName);
            if (match && match.price !== undefined) return Number(match.price);
          }
          return 300000;
        };

        const debtDetails = [];
        let EXPECTED_TOTAL = 0;
        let totalPaidForMonth = 0;
        let overallQarz = 0;

        if (studentGroups.length > 0) {
          studentGroups.forEach(g => {
            const COURSE_PRICE = getPrice(g); 
            EXPECTED_TOTAL += COURSE_PRICE;

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
              isPaid: qarzForGroup <= 0,
              coursePrice: COURSE_PRICE 
            });
          });
        } else {
           EXPECTED_TOTAL = 300000;
           currentMonthPayments.forEach(p => {
             totalPaidForMonth += Number(p.amount) || 0;
           });
           overallQarz = EXPECTED_TOTAL - totalPaidForMonth;
           if (overallQarz < 0) overallQarz = 0;
        }

        const isExcepted = student.exceptionMonths && student.exceptionMonths.includes(targetMonth);

        let paymentStatus = "unpaid"; 
        if (isExcepted) {
          paymentStatus = "excepted"; 
        } else if (overallQarz <= 0) {
          paymentStatus = "paid"; 
        } else if (totalPaidForMonth > 0) {
          paymentStatus = "partial"; 
        }

        const paymentsHistory = await Payment.find({ 
          $or: [ { studentId: student._id }, { studentId: safeId } ]
        }).sort({ date: -1 });

        // Har bir o'quvchining shaxsiy hisoboti
        return {
          data: student,
          paymentStatus: paymentStatus, 
          month: targetMonth,
          coursePrice: EXPECTED_TOTAL, 
          totalPaid: totalPaidForMonth, 
          qarz: overallQarz, 
          debtDetails: debtDetails, 
          paymentsHistory: paymentsHistory 
        };
      }));

      return res.status(200).json({ 
        success: true, 
        students: enrichedStudents // Endi ro'yxat (massiv) qaytaradi!
      });
    } catch (error) {
      console.error("Profile API xatosi:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  return res.status(405).json({ message: "Ruxsat etilmagan metod" });
}