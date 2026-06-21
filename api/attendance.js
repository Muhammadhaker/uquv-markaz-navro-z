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
    messageId: Number // 🔥 YANGI: Telegramdagi xabarni o'chirish uchun uni ID'sini saqlaymiz
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
      
      // 1. Bazadagi eski holatni chaqirib olamiz (Eski xabar ID'lari shuning ichida turadi)
      const oldDoc = await Attendance.findOne({ groupName, date });
      const oldDataMap = {};
      if (oldDoc) {
         oldDoc.records.forEach(r => {
             oldDataMap[r.studentId] = { status: r.status, messageId: r.messageId };
         });
      }

      const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
      
      // Faqatgina holati o'zgargan o'quvchilarni ajratib olamiz
      const changedRecords = records.filter(r => !oldDoc || oldDataMap[r.studentId]?.status !== r.status);
      
      let chatIdsMap = {};
      if (changedRecords.length > 0) {
         const studentIds = changedRecords.map(r => {
           try { return new mongoose.Types.ObjectId(r.studentId); } 
           catch(e) { return r.studentId; }
         });

         const studentsInDb = await Student.find({ _id: { $in: studentIds } });
         studentsInDb.forEach(s => {
             chatIdsMap[s._id.toString()] = s.telegramChatId;
         });
      }

      const [yyyy, mm, dd] = date.split("-");
      const formattedDate = `${dd}.${mm}.${yyyy}`;

      const finalRecords = []; // Yangilanadigan to'liq ro'yxat

      // 2. Barcha o'quvchilarni bittama-bitta ko'rib chiqamiz
      for (const record of records) {
          let finalMessageId = oldDataMap[record.studentId]?.messageId;
          const isChanged = !oldDoc || oldDataMap[record.studentId]?.status !== record.status;
          
          if (isChanged && telegramToken) {
              const chatId = chatIdsMap[record.studentId];
              
              if (chatId) {
                  const oldMessageId = oldDataMap[record.studentId]?.messageId;
                  
                  // 🔥 TIZIMNING YURAGI: Agar oldin xabar ketgan bo'lsa, uni Telegramdan o'chiramiz!
                  if (oldMessageId) {
                      try {
                          await fetch(`https://api.telegram.org/bot${telegramToken}/deleteMessage`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ chat_id: chatId, message_id: oldMessageId })
                          });
                      } catch(e) { console.error("Eski xabarni o'chirishda xato:", e); }
                  }

                  // Yangi yuboriladigan xabar matni
                  const isCorrection = oldDataMap[record.studentId] !== undefined; 
                  let text = "";
                  if (isCorrection) {
                      text = `✏️ *Davomat o'zgartirildi*\n\nHurmatli *${record.studentName}*, sizning ${formattedDate} sanasidagi "${groupName}" fani bo'yicha davomatingiz tahrirlandi.\n\n📊 Yangi holat: *${record.status === 'keldi' ? '✅ Darsda qatnashdingiz' : '❌ Darsga kelmadingiz'}*`;
                  } else {
                      text = `📋 *Davomat natijasi*\n\nHurmatli *${record.studentName}*, bugun (${formattedDate}) "${groupName}" fani bo'yicha davomat olindi.\n\n📊 Holat: *${record.status === 'keldi' ? '✅ Darsda qatnashdingiz' : '❌ Darsga kelmadingiz'}*`;
                  }

                  // Xabarni yuboramiz va yangi ID'ni saqlab qolamiz
                  try {
                      const tgRes = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                              chat_id: chatId,
                              text: text,
                              parse_mode: 'Markdown'
                          })
                      });
                      const tgData = await tgRes.json();
                      if (tgData.ok) {
                          finalMessageId = tgData.result.message_id; // 🔥 Yangi xabar ID si bazaga saqlanadi
                      }
                  } catch (err) { console.error("Yuborishda xato:", err); }
              }
          }
          
          finalRecords.push({
              studentId: record.studentId,
              studentName: record.studentName,
              status: record.status,
              messageId: finalMessageId // Baza uchun
          });
      }

      // 3. Bazaga hamma ma'lumotlarni yozib qoyamiz
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
}t