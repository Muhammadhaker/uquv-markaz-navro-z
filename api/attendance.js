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
    status: String,
    messageId: Number // Telegramdagi xabarni o'chirish uchun ID saqlanadi
  }],
  createdAt: { type: Date, default: Date.now }
});

const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema, 'attendances');
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
      
      // 1. Bazadagi eski holatni chaqirib olamiz
      const oldDoc = await Attendance.findOne({ groupName, date });
      const oldDataMap = {};
      if (oldDoc) {
         oldDoc.records.forEach(r => {
             oldDataMap[r.studentId] = { status: r.status, messageId: r.messageId };
         });
      }

      // Kiritilgan ma'lumotlarni klon qilamiz (Eski messageId larni ulash uchun)
      const finalRecords = records.map(r => ({
          studentId: r.studentId,
          studentName: r.studentName,
          status: r.status,
          messageId: oldDataMap[r.studentId]?.messageId || null
      }));

      const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
      
      // 2. TELEGRAM QISMI (Xatolik bo'lsa ham dastur to'xtab qolmasligi uchun himoyalangan)
      if (telegramToken && finalRecords.length > 0) {
         try {
            // Faqat o'zgarganlarni olamiz
            const changedRecords = finalRecords.filter(r => !oldDoc || oldDataMap[r.studentId]?.status !== r.status);
            
            if (changedRecords.length > 0) {
               // Xavfsiz qidiruv: Mongoose Error bermasligi uchun tekshiramiz
               const objectIds = [];
               changedRecords.forEach(r => {
                  if (mongoose.Types.ObjectId.isValid(r.studentId)) {
                      objectIds.push(new mongoose.Types.ObjectId(r.studentId));
                  }
                  objectIds.push(r.studentId);
               });
               
               const studentsInDb = await Student.find({ _id: { $in: objectIds } });
               const chatIdsMap = {};
               studentsInDb.forEach(s => {
                   chatIdsMap[s._id.toString()] = s.telegramChatId;
               });

               const [yyyy, mm, dd] = date.split("-");
               const formattedDate = `${dd}.${mm}.${yyyy}`;

               // Barcha xabarlarni parallell yuborish (Vaqtni tejaydi)
               await Promise.all(changedRecords.map(async (record) => {
                   const chatId = chatIdsMap[record.studentId];
                   if (!chatId) return;

                   // Eski xabarni topib o'chirish
                   if (record.messageId) {
                       try {
                           await fetch(`https://api.telegram.org/bot${telegramToken}/deleteMessage`, {
                               method: 'POST',
                               headers: { 'Content-Type': 'application/json' },
                               body: JSON.stringify({ chat_id: chatId, message_id: record.messageId })
                           });
                       } catch(e) { console.error("Eski xabarni o'chirishda xato", e); }
                   }

                   // Yangi xabarni tayyorlash va yuborish
                   const isCorrection = oldDataMap[record.studentId] !== undefined; 
                   let text = isCorrection 
                       ? `✏️ *Davomat o'zgartirildi*\n\nHurmatli *${record.studentName}*, sizning ${formattedDate} sanasidagi "${groupName}" fani bo'yicha davomatingiz tahrirlandi.\n\n📊 Yangi holat: *${record.status === 'keldi' ? '✅ Darsda qatnashdingiz' : '❌ Darsga kelmadingiz'}*`
                       : `📋 *Davomat natijasi*\n\nHurmatli *${record.studentName}*, bugun (${formattedDate}) "${groupName}" fani bo'yicha davomat olindi.\n\n📊 Holat: *${record.status === 'keldi' ? '✅ Darsda qatnashdingiz' : '❌ Darsga kelmadingiz'}*`;

                   try {
                       const tgRes = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
                           method: 'POST',
                           headers: { 'Content-Type': 'application/json' },
                           body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
                       });
                       const tgData = await tgRes.json();
                       if (tgData.ok) {
                           record.messageId = tgData.result.message_id; // Yangi xabar ID saqlandi
                       } else {
                           record.messageId = null;
                       }
                   } catch(e) {
                       record.messageId = null;
                   }
               }));
            }
         } catch (tgError) {
            console.error("Telegram jarayonida xatolik yuz berdi, lekin saqlash davom etadi:", tgError);
         }
      }

      // 3. ASOSIY QISM: Davomat BAZAGA yozilishi shart!
      const data = await Attendance.findOneAndUpdate(
        { groupName, date },
        { groupName, date, adminName, records: finalRecords },
        { new: true, upsert: true }
      );

      return res.status(200).json({ success: true, data });
    }
    
    res.status(405).json({ message: "Metod ruxsat etilmagan" });
  } catch (error) {
    console.error("Attendance API Xatosi:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}