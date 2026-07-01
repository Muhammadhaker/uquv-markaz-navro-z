import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  return mongoose.connect(process.env.MONGODB_URI);
};

const Student = mongoose.models.Student || mongoose.model('Student', new mongoose.Schema({}, { strict: false }), 'students');
const Payment = mongoose.models.Payment || mongoose.model('Payment', new mongoose.Schema({}, { strict: false }), 'payments');

const calculateCycles = (addedAtStr) => {
  if (!addedAtStr) return 1;
  const added = new Date(addedAtStr);
  if (isNaN(added.getTime())) return 1;
  
  const today = new Date();
  let m = (today.getFullYear() - added.getFullYear()) * 12 + today.getMonth() - added.getMonth();
  if (today.getDate() < added.getDate()) m--;
  return Math.max(1, m + 1);
};

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send('Ruxsat yoq');

  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ success: false, message: 'Ruxsat etilmagan!' });
  }

  try {
    await connectDB();
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    const students = await Student.find({ telegramChatId: { $ne: null } });
    const payments = await Payment.find({});
    
    const today = new Date();
    const currentDay = today.getDate(); 
    const targetMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

    // 🔥 YANGI: Hisoblagich o'rniga aniq ro'yxat yig'amiz!
    let sentStudents = [];
    let failedStudents = [];

    for (const student of students) {
      if (student.exceptionMonths && student.exceptionMonths.includes(targetMonthStr)) continue;

      const addedDate = new Date(student.addedAt || today);
      const joinedDay = addedDate.getDate(); 
      const activeCycles = calculateCycles(student.addedAt); 

      const studentGroups = student.group ? student.group.split(',').map(g => g.trim()).filter(Boolean) : [];
      let overallDebt = 0;

      const getPrice = (groupName) => {
        if (student.groupsData && Array.isArray(student.groupsData)) {
          const match = student.groupsData.find(x => x.name?.trim().toLowerCase() === groupName?.trim().toLowerCase());
          if (match && match.price !== undefined) return Number(match.price);
        }
        return 300000; 
      };

      if (studentGroups.length > 0) {
        studentGroups.forEach(g => {
          const expectedTotal = getPrice(g) * activeCycles;
          const totalPaid = payments
            .filter(p => p.studentId === student._id.toString() && (p.groupName === g || !p.groupName))
            .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
          const qarz = expectedTotal - totalPaid;
          if (qarz > 0) overallDebt += qarz;
        });
      } else {
        const expectedTotal = 300000 * activeCycles;
        const totalPaid = payments
            .filter(p => p.studentId === student._id.toString())
            .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        const qarz = expectedTotal - totalPaid;
        if(qarz > 0) overallDebt += qarz;
      }

      if (overallDebt > 0) {
        let messageText = "";

        if (currentDay === joinedDay - 2) {
          messageText = `🟡 *TO'LOV VAQTI YAQINLASHMOQDA*\n\n👤 *O'quvchi:* ${student.name}\n\nEslatib o'tamiz, 2 kundan so'ng sizning navbatdagi oylik to'lov vaqtingiz keladi.\n💰 *Hozirgi qoldiq qarz:* ${overallDebt.toLocaleString()} so'm\n\n_Iltimos, to'lovni o'z vaqtida amalga oshirishni unutmang._`;
        } 
        else if (currentDay > joinedDay && currentDay % 2 !== 0) {
          messageText = `🔴 *QARZDORLIK ESLATMASI!*\n\n👤 *O'quvchi:* ${student.name}\n📅 *Holat:* To'lov muddati o'tgan!\n\n💰 *Jami qarzingiz:* ${overallDebt.toLocaleString()} so'm\n\n_Sizning to'lov vaqtingiz o'tib ketgan. Iltimos, darslardan chetlatilmaslik uchun to'lovni zudlik bilan amalga oshiring._`;
        }

        if (messageText) {
          try {
            // Telegramga so'rov yuboramiz
            const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: student.telegramChatId, text: messageText, parse_mode: 'Markdown' })
            });
            
            const tgData = await tgRes.json();
            
            // 🔥 TELEGRAM QABUL QILDIMI YUQMI TEKSHIRAMIZ
            if (tgData.ok) {
               sentStudents.push(student.name);
            } else {
               failedStudents.push({ 
                 name: student.name, 
                 error: tgData.description // Nega xatolik berganini yozadi
               });
            }
          } catch (err) {
             failedStudents.push({ name: student.name, error: err.message });
          }
        }
      }
    }

    // Brauzerga hamma ro'yxatni chiroyli qilib chiqaramiz
    return res.status(200).json({ 
        success: true, 
        message: `${sentStudents.length} ta o'quvchiga muvaffaqiyatli yuborildi.`,
        muvaffaqiyatli_yuborildi: sentStudents,
        xatolik_berdi: failedStudents
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}