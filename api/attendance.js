import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI topilmadi!");
  return mongoose.connect(process.env.MONGODB_URI);
};

const attendanceSchema = new mongoose.Schema({
  groupName: { type: String, required: true },
  date: { type: String, required: true },
  adminName: { type: String, required: true },
  records: [{
    studentId: String,
    studentName: String,
    status: String
  }],
  createdAt: { type: Date, default: Date.now }
});

const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema, 'attendances');
// 🔥 Botga xabar yuborish uchun Student modelini ham chaqiramiz (ChatID ni olish uchun)
const Student = mongoose.models.Student || mongoose.model('Student', new mongoose.Schema({}, { strict: false }), 'students');

export default async function handler(req, res) {
  try {
    await connectDB();
    
    if (req.method === 'GET') {
      const { groupName, date } = req.query;
      const data = await Attendance.findOne({ groupName, date });
      return res.status(200).json({ success: true, data });
    }
    
    if (req.method === 'POST') {
      const { groupName, date, adminName, records } = req.body;
      
      // 1. Qayta-qayta xabar bormasligi va "Xato qilib tahrirlangan"larni farqlash uchun 
      // bazadagi eskisini (agar bo'lsa) chaqirib olamiz:
      const oldDoc = await Attendance.findOne({ groupName, date });
      const oldStatuses = {};
      if (oldDoc) {
         oldDoc.records.forEach(r => {
             oldStatuses[r.studentId] = r.status;
         });
      }

      // 2. Yangi davomatni bazaga saqlaymiz
      const data = await Attendance.findOneAndUpdate(
        { groupName, date },
        { groupName, date, adminName, records },
        { new: true, upsert: true }
      );

      // 3. TELEGRAM BOTGA XABAR YUBORISH LOGIKASI
      const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
      if (telegramToken && records && records.length > 0) {
         
         // Faqatgina holati o'zgargan (masalan kelmadi -> keldi) yoki yangi kiritilgan o'quvchilarni topamiz
         const changedRecords = records.filter(r => oldStatuses[r.studentId] !== r.status);
         
         if (changedRecords.length > 0) {
             // Ularning telegramChatId larini olish uchun bazadan qidiramiz
             const studentIds = changedRecords.map(r => r.studentId);
             const studentsInDb = await Student.find({ _id: { $in: studentIds } });
             const chatIdsMap = {};
             studentsInDb.forEach(s => {
                 chatIdsMap[s._id.toString()] = s.telegramChatId;
             });

             // Sanani chiroyli ko'rinishga keltiramiz (2026-06-21 -> 21.06.2026)
             const [yyyy, mm, dd] = date.split("-");
             const formattedDate = `${dd}.${mm}.${yyyy}`;

             const telegramPromises = [];

             for (const record of changedRecords) {
                 const chatId = chatIdsMap[record.studentId];
                 
                 // Agar o'quvchining telegramChatId si bo'lsa xabar tayyorlaymiz
                 if (chatId) {
                     // Agar oldin kiritilgan bo'lib, endi statusi o'zgargan bo'lsa -> TAHRIRLASH xabari
                     const isCorrection = oldStatuses[record.studentId] !== undefined; 
                     
                     let text = "";
                     if (isCorrection) {
                         text = `✏️ *Davomat o'zgartirildi*\n\nHurmatli *${record.studentName}*, sizning ${formattedDate} sanasidagi "${groupName}" fani bo'yicha davomatingiz tahrirlandi.\n\n📊 Yangi holat: *${record.status === 'keldi' ? '✅ Darsda qatnashdingiz' : '❌ Darsga kelmadingiz'}*`;
                     } else {
                         // Birinchi marta kiritilayotgan bo'lsa -> ODDIY xabar
                         text = `📋 *Davomat natijasi*\n\nHurmatli *${record.studentName}*, bugun (${formattedDate}) "${groupName}" fani bo'yicha davomat olindi.\n\n📊 Holat: *${record.status === 'keldi' ? '✅ Darsda qatnashdingiz' : '❌ Darsga kelmadingiz'}*`;
                     }

                     // Xabarni yuborish jarayonini ro'yxatga qo'shamiz
                     const promise = fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
                         method: 'POST',
                         headers: { 'Content-Type': 'application/json' },
                         body: JSON.stringify({
                             chat_id: chatId,
                             text: text,
                             parse_mode: 'Markdown'
                         })
                     });
                     telegramPromises.push(promise);
                 }
             }

             // Barcha tayyorlangan xabarlarni bir vaqtda jo'natamiz
             if (telegramPromises.length > 0) {
                 await Promise.all(telegramPromises).catch(err => console.error("Telegram xato:", err));
             }
         }
      }

      return res.status(200).json({ success: true, data });
    }
    
    res.status(405).json({ message: "Metod ruxsat etilmagan" });
  } catch (error) {
    console.error("Attendance API Xatosi:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}