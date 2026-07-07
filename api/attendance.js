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
  teacherId: { type: String, required: true },
  records: [{
    studentId: String,
    studentName: String,
    status: String,
    messageId: Number,
    arrivalTime: String,
    leaveTime: String,
    lastScan: Number
  }],
  createdAt: { type: Date, default: Date.now }
});

const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema, 'attendances');
const Student = mongoose.models.Student || mongoose.model('Student', new mongoose.Schema({}, { strict: false }), 'students');

export default async function handler(req, res) {
  try {
    await connectDB();
    
    const role = req.headers['x-user-role'];
    const userId = req.headers['x-user-id'];
    const parentId = req.headers['x-parent-id'];
    
    if (req.method === 'GET') {
      const { groupName, date } = req.query;
      
      let query = { groupName, date };
      if (role === 'teacher') query.teacherId = userId;
      else if (role === 'assistant') query.teacherId = parentId;

      const data = await Attendance.findOne(query);
      return res.status(200).json({ success: true, data });
    }
    
    if (req.method === 'POST') {
      const { groupName, date, adminName, records, isScan, scannedRecord } = req.body;
      const ownerId = role === 'assistant' ? parentId : userId;
      
      const oldDoc = await Attendance.findOne({ groupName, date, teacherId: ownerId });
      const oldDataMap = {};
      if (oldDoc) {
         oldDoc.records.forEach(r => {
             oldDataMap[r.studentId] = { status: r.status, messageId: r.messageId };
         });
      }

      // 🔥 AGAR QR KODDAN SCAN QILINSA (Bitta o'quvchi darhol qo'shiladi va saqlanadi)
      if (isScan && scannedRecord) {
        let currentRecords = oldDoc ? [...oldDoc.records] : [];
        const existingIndex = currentRecords.findIndex(r => r.studentId === scannedRecord.studentId);
        
        if (existingIndex >= 0) {
          currentRecords[existingIndex] = { ...currentRecords[existingIndex], ...scannedRecord };
        } else {
          currentRecords.push(scannedRecord);
        }
        
        // Bu skaner qilingan bolani xabari ketyaptimi shuni aniqlaymiz (xuddi siz yozgandek)
        const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
        if (telegramToken && (!oldDataMap[scannedRecord.studentId] || oldDataMap[scannedRecord.studentId].status !== scannedRecord.status)) {
           // Telegram xabar yuborish mantiqi (Siznikidek qoldirdim, faqat shu bitta o'quvchi uchun ishlaydi)
           try {
             let student = await Student.findById(scannedRecord.studentId);
             if(student && student.telegramChatId) {
               const months = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];
               const [yyyy, mm, dd] = date.split("-");
               const formattedDate = `${dd}-${months[parseInt(mm) - 1]}, ${yyyy}-yil`;

               const getStatusText = (record) => {
                  const arr = record.arrivalTime || '--:--';
                  const lev = record.leaveTime || '--:--';
                  if (record.status === 'keldi') return `✅ Darsga keldi\n⏰ Kelgan vaqti: ${arr}`;
                  if (record.status === 'kechikdi') return `⏳ Kechikib keldi\n⏰ Kelgan vaqti: ${arr}`;
                  if (record.status === 'ketdi') return `🏠 Darsdan ketdi\n🟢 Kelgan vaqti: ${arr}\n🔴 Ketgan vaqti: ${lev}`;
                  return '❌ Darsga kelmadi';
               };

               let text = oldDataMap[scannedRecord.studentId] 
                 ? `✏️ *Davomat o'zgartirildi*\n\nHurmatli *${scannedRecord.studentName}*,\n\n📅 Sana: ${formattedDate}\n📚 Fan: ${groupName}\n\n📊 Yangi holat: \n*${getStatusText(scannedRecord)}*`
                 : `📋 *Davomat natijasi*\n\nHurmatli *${scannedRecord.studentName}*,\n\n📅 Sana: ${formattedDate}\n📚 Fan: ${groupName}\n\n📊 Holat: \n*${getStatusText(scannedRecord)}*`;

               // Eski xabarni o'chirish
               if(oldDataMap[scannedRecord.studentId]?.messageId) {
                 await fetch(`https://api.telegram.org/bot${telegramToken}/deleteMessage`, {
                     method: 'POST', headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({ chat_id: student.telegramChatId, message_id: oldDataMap[scannedRecord.studentId].messageId })
                 });
               }

               const tgRes = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
                   method: 'POST', headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({ chat_id: student.telegramChatId, text, parse_mode: 'Markdown' })
               });
               const tgData = await tgRes.json();
               if (tgData.ok) {
                 const updIndex = currentRecords.findIndex(r => r.studentId === scannedRecord.studentId);
                 currentRecords[updIndex].messageId = tgData.result.message_id;
               }
             }
           } catch(e) {}
        }

        const data = await Attendance.findOneAndUpdate(
          { groupName, date, teacherId: ownerId },
          { groupName, date, adminName, teacherId: ownerId, records: currentRecords },
          { new: true, upsert: true }
        );
        return res.status(200).json({ success: true, data });

      } 
      // 🔥 AGAR QO'LDA (MANUAL) "SAQLASH" TUGMASI BOSILSA
      else {
        const finalRecords = records.map(r => ({
            studentId: r.studentId,
            studentName: r.studentName,
            status: r.status,
            arrivalTime: r.arrivalTime || null,
            leaveTime: r.leaveTime || null,
            lastScan: r.lastScan || null,
            messageId: oldDataMap[r.studentId]?.messageId || null
        }));

        const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
        
        if (telegramToken && finalRecords.length > 0) {
           try {
              // FAQAT O'ZGARTIRILGAN YOKI YANGI STATUS QO'YILGANLARNI TOPAMIZ
              const changedRecords = finalRecords.filter(r => r.status && r.status !== "" && (!oldDoc || oldDataMap[r.studentId]?.status !== r.status));
              
              if (changedRecords.length > 0) {
                 const objectIds = [];
                 changedRecords.forEach(r => {
                    if (mongoose.Types.ObjectId.isValid(r.studentId)) objectIds.push(new mongoose.Types.ObjectId(r.studentId));
                    objectIds.push(r.studentId);
                 });
                 
                 const studentsInDb = await Student.find({ _id: { $in: objectIds } });
                 const chatIdsMap = {};
                 studentsInDb.forEach(s => { chatIdsMap[s._id.toString()] = s.telegramChatId; });

                 const months = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];
                 const [yyyy, mm, dd] = date.split("-");
                 const formattedDate = `${dd}-${months[parseInt(mm) - 1]}, ${yyyy}-yil`;

                 const getStatusText = (record) => {
                    const arr = record.arrivalTime || '--:--';
                    const lev = record.leaveTime || '--:--';
                    if (record.status === 'keldi') return `✅ Darsga keldi\n⏰ Kelgan vaqti: ${arr}`;
                    if (record.status === 'kechikdi') return `⏳ Kechikib keldi\n⏰ Kelgan vaqti: ${arr}`;
                    if (record.status === 'ketdi') return `🏠 Darsdan ketdi\n🟢 Kelgan vaqti: ${arr}\n🔴 Ketgan vaqti: ${lev}`;
                    return '❌ Darsga kelmadi';
                 };

                 await Promise.all(changedRecords.map(async (record) => {
                     const chatId = chatIdsMap[record.studentId];
                     if (!chatId) return;

                     // Agar oldin sms borgan bo'lsa uni o'chiramiz (Toza bo'lishi uchun)
                     if (record.messageId) {
                         try {
                             await fetch(`https://api.telegram.org/bot${telegramToken}/deleteMessage`, {
                                 method: 'POST', headers: { 'Content-Type': 'application/json' },
                                 body: JSON.stringify({ chat_id: chatId, message_id: record.messageId })
                             });
                         } catch(e) {}
                     }

                     const isCorrection = oldDataMap[record.studentId] !== undefined && oldDataMap[record.studentId].status !== ""; 
                     
                     let text = isCorrection 
                         ? `✏️ *Davomat o'zgartirildi*\n\nHurmatli *${record.studentName}*,\n\n📅 Sana: ${formattedDate}\n📚 Fan: ${groupName}\n\n📊 Yangi holat: \n*${getStatusText(record)}*`
                         : `📋 *Davomat natijasi*\n\nHurmatli *${record.studentName}*,\n\n📅 Sana: ${formattedDate}\n📚 Fan: ${groupName}\n\n📊 Holat: \n*${getStatusText(record)}*`;

                     try {
                         const tgRes = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
                             method: 'POST', headers: { 'Content-Type': 'application/json' },
                             body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
                         });
                         const tgData = await tgRes.json();
                         if (tgData.ok) {
                             record.messageId = tgData.result.message_id; 
                         } else {
                             record.messageId = null;
                         }
                     } catch(e) {
                         record.messageId = null;
                     }
                 }));
              }
           } catch (tgError) {}
        }

        // MA'LUMOTNI BIR UMRGA BAZAGA MUHRLAYMIZ
        const data = await Attendance.findOneAndUpdate(
          { groupName, date, teacherId: ownerId },
          { groupName, date, adminName, teacherId: ownerId, records: finalRecords },
          { new: true, upsert: true }
        );

        return res.status(200).json({ success: true, data });
      }
    }
    
    res.status(405).json({ message: "Metod ruxsat etilmagan" });
  } catch (error) {
    console.error("Attendance API Xatosi:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}