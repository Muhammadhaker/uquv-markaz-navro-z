import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  return mongoose.connect(process.env.MONGODB_URI);
};

const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', new mongoose.Schema({}, { strict: false }), 'attendances');
const Student = mongoose.models.Student || mongoose.model('Student', new mongoose.Schema({}, { strict: false }), 'students');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: "Metod ruxsat etilmagan" });

  try {
    await connectDB();
    const { studentId, date, adminName } = req.body;

    // 1. O'quvchini topish
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
        return res.status(400).json({ success: false, message: "Noto'g'ri QR-kod tizimi!" });
    }
    
    const student = await Student.findById(studentId);
    if (!student) {
        return res.status(404).json({ success: false, message: "Bunday o'quvchi topilmadi!" });
    }

    const studentGroups = student.group ? student.group.split(',').map(g => g.trim()).filter(Boolean) : [];
    if (studentGroups.length === 0) {
        return res.status(400).json({ success: false, message: "O'quvchi hech qaysi guruhda yo'q!" });
    }

    const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
    const [yyyy, mm, dd] = date.split("-");
    const formattedDate = `${dd}.${mm}.${yyyy}`;

    // 2. Har bir guruhi uchun davomatni yozish
    for (const groupName of studentGroups) {
        const oldAttendance = await Attendance.findOne({ groupName, date });
        let existingRecords = oldAttendance ? oldAttendance.records : [];
        
        const studentIndex = existingRecords.findIndex(r => r.studentId === studentId);
        
        if (studentIndex >= 0 && existingRecords[studentIndex].status === "keldi") {
            continue; 
        }

        let currentOldMsgId = studentIndex >= 0 ? existingRecords[studentIndex].messageId : null;
        if (currentOldMsgId && telegramToken && student.telegramChatId) {
            try {
                await fetch(`https://api.telegram.org/bot${telegramToken}/deleteMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: student.telegramChatId, message_id: currentOldMsgId })
                });
            } catch(e) { console.error("Xabar o'chirishda xato:", e); }
        }

        let newMessageId = null;
        if (telegramToken && student.telegramChatId) {
            try {
                const text = `📋 *Davomat (QR-kod)*\n\nHurmatli *${student.name}*, tizim sizni darsga kirganingizni tasdiqladi.\n\n📅 Sana: ${formattedDate}\n📚 Fan: ${groupName}\n📊 Holat: *✅ Darsda qatnashdingiz*`;
                
                const tgRes = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: student.telegramChatId, text, parse_mode: 'Markdown' })
                });
                
                const tgData = await tgRes.json();
                if (tgData.ok) newMessageId = tgData.result.message_id;
            } catch(e) { console.error("Xabar yuborishda xato:", e); }
        }

        const newRecordData = {
            studentId: student._id.toString(),
            studentName: student.name,
            status: "keldi",
            messageId: newMessageId
        };

        if (studentIndex >= 0) {
            existingRecords[studentIndex] = newRecordData;
        } else {
            existingRecords.push(newRecordData);
        }

        await Attendance.findOneAndUpdate(
            { groupName, date },
            { groupName, date, adminName, records: existingRecords },
            { new: true, upsert: true }
        );
    }

    return res.status(200).json({ success: true, message: `${student.name} muvaffaqiyatli belgilandi!` });

  } catch (error) {
    console.error("QR Scan Xatosi:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}