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
  priceAtThatTime: { type: Number },
  paymentType: { type: String, required: true },
  month: { type: String, required: true },
  date: { type: Date, default: Date.now },
  adminName: { type: String, required: true },
  telegramChatId: { type: String },
  telegramMessageId: { type: Number },
  teacherId: { type: String, required: true }
});

const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema, 'payments');
const Student = mongoose.models.Student || mongoose.model('Student', new mongoose.Schema({}, { strict: false }), 'students');

export default async function handler(req, res) {
  try {
    await connectDB();

    const role = req.headers['x-user-role'];
    const userId = req.headers['x-user-id'];
    const parentId = req.headers['x-parent-id'];

    // 🔥 1. TO'LOVLARNI O'QISH (Xatolarni ham avtomat to'g'rilab ko'rsatadi)
    if (req.method === 'GET') {
      let query = {};
      const targetTeacherId = role === 'assistant' ? parentId : userId;

      if (role === 'teacher' || role === 'assistant') {
        // Avval bu ustozning barcha o'quvchilari ID larini topib olamiz
        const myStudents = await Student.find({
            $or: [
                { teacherIds: targetTeacherId },
                { teacherId: targetTeacherId } // Eski tizimdagi o'quvchilar uchun
            ]
        }, '_id');
        
        const myStudentIds = myStudents.map(s => s._id.toString());

        // Ustozga faqatgina uning nomiga tushgan pullarni emas, 
        // o'quvchilari nomiga tushgan barcha pullarni (hatto Super Admin urgan bo'lsa ham) ko'rsatamiz!
        query = {
            $or: [
                { teacherId: targetTeacherId },
                { studentId: { $in: myStudentIds } }
            ]
        };
      }

      const payments = await Payment.find(query).sort({ date: -1 });
      return res.status(200).json({ success: true, data: payments });
    }

    // 🔥 2. TO'LOV QABUL QILISH (Aniq egasining kassasiga yozish)
    if (req.method === 'POST') {
      const { studentId, studentName, groupName, amount, priceAtThatTime, paymentType, month, adminName, telegramChatId, targetTeacherId } = req.body;
      
      const ownerId = role === 'assistant' ? parentId : userId;
      
      // Mantiqiy Qulf: Agar ustoz ID si kelmasa, bazadan o'quvchining o'zini topib ustozini sug'urib olamiz
      let finalOwnerId = targetTeacherId;
      const studentObj = await Student.findById(studentId);
      
      if (studentObj) {
          const gData = studentObj.groupsData?.find(g => g.name === groupName);
          if (gData && gData.teacherId) {
              finalOwnerId = gData.teacherId;
          } else if (!finalOwnerId) {
              finalOwnerId = studentObj.teacherIds?.[0] || studentObj.teacherId || ownerId;
          }
      } else if (!finalOwnerId) {
          finalOwnerId = ownerId;
      }

      let messageId = null;

      if (telegramChatId) {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        const formatMonthName = (m) => {
          const [y, mm] = m.split("-");
          const names = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];
          return `${names[parseInt(mm) - 1]} ${y}`;
        };

        const text = `🧾 *TO'LOV CHEKI*\n\n👤 *O'quvchi:* ${studentName}\n📚 *Fan/Guruh:* ${groupName}\n💰 *Summa:* ${Number(amount).toLocaleString()} so'm\n💳 *Turi:* ${paymentType}\n📅 *Oy:* ${formatMonthName(month)}\n\n✅ _To'lov muvaffaqiyatli qabul qilindi!_`;

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
        studentId, studentName, groupName, 
        amount, 
        priceAtThatTime: priceAtThatTime || amount,
        paymentType, month, adminName, telegramChatId,
        telegramMessageId: messageId,
        teacherId: finalOwnerId // 🔥 Pul hech qachon adashmaydi, aniq ustoziga yoziladi!
      });

      return res.status(201).json({ success: true, data: newPayment });
    }

    if (req.method === 'DELETE') {
       await Payment.findByIdAndDelete(req.body.id);
       return res.status(200).json({ success: true });
    }

    res.status(405).json({ message: "Metod ruxsat etilmagan" });
  } catch (error) {
    console.error("To'lov API Xatosi:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}