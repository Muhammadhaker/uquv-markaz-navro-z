import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  return mongoose.connect(process.env.MONGODB_URI);
};

const Student = mongoose.models.Student || mongoose.model('Student', new mongoose.Schema({}, { strict: false }), 'students');
const Payment = mongoose.models.Payment || mongoose.model('Payment', new mongoose.Schema({}, { strict: false }), 'payments');

export default async function handler(req, res) {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  try {
    await connectDB();

    const today = new Date();
    const currentDay = today.getDate();

    // 1. FAqat oyning 1-sanasidan 5-sanasigacha ishlashini ta'minlaymiz
    if (currentDay < 1 || currentDay > 5) {
      return res.status(200).json({ message: "Bugun 1-5 sanalar emas. Xabar yuborilmaydi." });
    }

    // 2. Qaysi oy uchun qarzni so'rayapmiz? 
    // (Odatda 1-5 sanalarda oldingi oy yoki shu oy uchun to'lov qilinadi, tizimingizga moslab 5-sanagacha bo'lsa oldingi oyni tortamiz)
    let year = today.getFullYear();
    let month = today.getMonth() + 1;

    if (currentDay <= 5) {
      month -= 1;
      if (month === 0) {
        month = 12;
        year -= 1;
      }
    }
    const targetMonthStr = `${year}-${String(month).padStart(2, "0")}`;

    // 3. Barcha o'quvchilarni va kerakli oydagi to'lovlarni tortib olamiz
    const allStudents = await Student.find({ telegramChatId: { $exists: true, $ne: null } });
    const targetMonthPayments = await Payment.find({ month: targetMonthStr });

    let sentCount = 0;

    // 4. Har bir o'quvchini tekshirib chiqamiz
    for (let student of allStudents) {
      // Agar admin bu o'quvchini "Istisno (Exception)" qilgan bo'lsa, xabar yubormaymiz
      if (student.exceptionMonths && student.exceptionMonths.includes(targetMonthStr)) {
        continue;
      }

      // O'quvchi nechta fanga qatnashishini aniqlaymiz
      const studentSubjects = student.group ? student.group.split(",").filter(Boolean) : [];
      const subjectCount = studentSubjects.length > 0 ? studentSubjects.length : 1;
      
      // Jami to'lashi kerak bo'lgan summa (masalan: 2 ta fan = 600,000)
      const COURSE_PRICE = 300000;
      const totalRequiredAmount = subjectCount * COURSE_PRICE;

      // Shu o'quvchining joriy oydagi to'lovlari summasini hisoblash
      const studentPayments = targetMonthPayments.filter(p => p.studentId === student._id.toString());
      let totalPaid = 0;
      studentPayments.forEach(p => {
        totalPaid += Number(p.amount) || 0;
      });

      // Agar to'liq to'lamagan bo'lsa (qarz qolgan bo'lsa), xabar yuboramiz!
      if (totalPaid < totalRequiredAmount) {
        const remainingDebt = totalRequiredAmount - totalPaid;
        
        // Oylarni o'zbekchada chiroyli yozish uchun yordamchi funksiya
        const formatMonthName = (m) => {
          const [y, mm] = m.split("-");
          const names = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];
          return `${names[parseInt(mm) - 1]} ${y}`;
        };

        const text = `⚠️ *TO'LOV ESLATMASI*\n\nHurmatli *${student.name}*, sizda o'quv markazimizdan **${formatMonthName(targetMonthStr)}** oyi uchun to'lov qarzdorligi mavjud.\n\n💰 *To'lanishi kerak bo'lgan qarz:* ${remainingDebt.toLocaleString()} so'm.\n\n_Iltimos, darslardan chetlashtirilmaslik uchun to'lovni 5-sanagacha amalga oshirishingizni so'raymiz._`;

        try {
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: student.telegramChatId,
              text: text,
              parse_mode: 'Markdown'
            })
          });
          sentCount++; // Nechta odamga borganini hisoblaymiz
        } catch (err) {
          console.error(`Xabar yuborishda xato (${student.name}):`, err);
        }
      }
    }

    return res.status(200).json({ success: true, message: `${sentCount} ta qarzdor o'quvchiga eslatma yuborildi.` });

  } catch (error) {
    console.error("Cron xatosi:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}