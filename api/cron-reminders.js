import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  return mongoose.connect(process.env.MONGODB_URI);
};

export default async function handler(req, res) {
  // Xavfsizlik uchun faqat GET so'rovni qabul qilamiz
  if (req.method !== 'GET') return res.status(405).send('Ruxsat yoq');

  const today = new Date();
  const day = today.getDate();

  // Agar juft kun bo'lsa (2, 4, 6...) kodni shu yerda to'xtatamiz. Faqat toq kunlari ishlaydi (1, 3, 5...)
  if (day % 2 === 0) {
    return res.status(200).json({ message: "Juft kun, xabar yuborilmaydi." });
  }

  try {
    await connectDB();
    
    // Joriy oyni aniqlash (Masalan: "2026-06")
    const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    const token = process.env.TELEGRAM_BOT_TOKEN;

    // Barcha o'quvchilar va joriy oydagi barcha to'lovlarni tortib olamiz
    const db = mongoose.connection.db;
    const students = await db.collection('students').find({ telegramChatId: { $ne: null } }).toArray();
    const currentMonthPayments = await db.collection('payments').find({ month: currentMonthStr }).toArray();

    // To'lov qilgan o'quvchilarning ID larini ajratib olamiz
    const paidStudentIds = currentMonthPayments.map(p => p.studentId.toString());

    let sentCount = 0;

    for (const student of students) {
      const studentId = student._id.toString();
      
      // 1. Agar to'lov qilgan bo'lsa -> O'tkazib yuborish
      if (paidStudentIds.includes(studentId)) continue;

      // 2. Agar admin bu oy uchun "Istisno" qilgan bo'lsa -> O'tkazib yuborish
      if (student.exceptionMonths && student.exceptionMonths.includes(currentMonthStr)) continue;

      // 3. Demak, to'lov qilmagan va istisno qilinmagan. Unga ogohlantirish yuboramiz:
      const warningText = `⚠️ *DIQQAT: TO'LOV MUDDATI*\n\nAssalomu alaykum, hurmatli ${student.name}ning ota-onasi!\n\nJoriy oy uchun to'lovni amalga oshirishingizni so'raymiz. \n\n❗️ *Agar to'lov amalga oshirilmasa, o'quvchi darsga kiritilmasligi mumkin.*\n\n_(Agar to'lovni kechiktirishga uzrli sababingiz bo'lsa, iltimos, ma'muriyat bilan bog'laning)_`;

      try {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: student.telegramChatId, text: warningText, parse_mode: 'Markdown' })
        });
        sentCount++;
      } catch (err) {
        console.error("Xatolik:", err);
      }
    }

    return res.status(200).json({ success: true, message: `${sentCount} ta o'quvchiga ogohlantirish yuborildi.` });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}