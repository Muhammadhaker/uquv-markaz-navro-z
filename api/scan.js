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
    const { studentId, date, groupName, teacherId, adminName } = req.body;

    const cleanInputId = studentId ? studentId.toString().trim() : "";
    if (!cleanInputId || !mongoose.Types.ObjectId.isValid(cleanInputId)) {
        return res.status(400).json({ success: false, message: "Noto'g'ri QR-kod!" });
    }
    
    const student = await Student.findById(cleanInputId);
    if (!student) {
        return res.status(404).json({ success: false, message: "Bunday o'quvchi topilmadi!" });
    }

    if (!groupName || !teacherId) {
         return res.status(400).json({ success: false, message: "Guruh yoki Ustoz aniqlanmadi. Iltimos, Veb-sahifadan guruhni tanlang." });
    }

    const validStudentIdStr = student._id.toString();
    
    let oldDoc = await Attendance.findOne({ groupName, date, teacherId });
    let existingRecords = [];
    
    // Eski ma'lumotlarni xavfsiz ko'chirib olish
    if (oldDoc) {
        oldDoc.records.forEach(r => {
            existingRecords.push({
                studentId: r.studentId,
                studentName: r.studentName,
                status: r.status || "",
                messageId: r.messageId || null,
                arrivalTime: r.arrivalTime || null,
                leaveTime: r.leaveTime || null,
                lastScan: r.lastScan || 0
            });
        });
    }

    const studentIndex = existingRecords.findIndex(r => String(r.studentId) === validStudentIdStr);

    const timeStr = new Date().toLocaleTimeString('ru-RU', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit' });
    const now = Date.now();

    let newStatus = "keldi";
    let arrTime = timeStr;
    let levTime = null;
    let currentOldMsgId = null;

    if (studentIndex >= 0) {
        let current = existingRecords[studentIndex];
        const currentStatus = (current.status || '').toLowerCase().trim();
        currentOldMsgId = current.messageId;
        
        let safeLastScan = current.lastScan ? Number(current.lastScan) : 0; 
        const timePassed = now - safeLastScan;
        
        // 30 daqiqa himoyasi
        if (safeLastScan > 0 && timePassed < 1800000) {
           return res.status(200).json({ success: true, message: `${student.name} qayd etilmadi (Hali 30 daqiqa o'tmadi).` });
        }

        if (safeLastScan === 0 || timePassed > 18000000) {
            newStatus = 'keldi';
            arrTime = timeStr;
            levTime = null;
        } else if (currentStatus === 'keldi' || currentStatus === 'kechikdi') {
            newStatus = 'ketdi';
            arrTime = current.arrivalTime || '--:--'; 
            levTime = timeStr; 
        } else if (currentStatus === 'ketdi') {
            newStatus = 'keldi';
            arrTime = timeStr;
            levTime = null;
        } 
    }

    // Telegramga xabar jo'natish
    let firstMsgId = null;
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN;

    if (telegramToken && student.telegramChatId) {
        const chatIds = String(student.telegramChatId).split(',').map(id => id.trim()).filter(Boolean);

        const getStatusText = (st, arr, lev) => {
           if (st === 'keldi') return `✅ Darsga keldi\n⏰ Kelgan vaqti: ${arr || '--:--'}`;
           if (st === 'kechikdi') return `⏳ Kechikib keldi\n⏰ Kelgan vaqti: ${arr || '--:--'}`;
           if (st === 'ketdi') return `🏠 Darsdan ketdi\n🟢 Kelgan vaqti: ${arr || '--:--'}\n🔴 Ketgan vaqti: ${lev || '--:--'}`;
           return '❌ Darsga kelmadi';
        };

        const isCorrection = studentIndex >= 0 && existingRecords[studentIndex].status !== "" && newStatus === 'ketdi';
        const [yyyy, mm, dd] = date.split("-");
        const formattedDate = `${dd}.${mm}.${yyyy}`;

        let text = isCorrection 
            ? `✏️ *Davomat o'zgartirildi*\n\nHurmatli *${student.name}*,\n\n📅 Sana: ${formattedDate}\n📚 Fan: ${groupName}\n\n📊 Yangi holat: \n*${getStatusText(newStatus, arrTime, levTime)}*`
            : `📋 *Davomat (QR-Kod)*\n\nHurmatli *${student.name}*,\n\n📅 Sana: ${formattedDate}\n📚 Fan: ${groupName}\n\n📊 Holat: \n*${getStatusText(newStatus, arrTime, levTime)}*`;

        await Promise.all(chatIds.map(async (cId) => {
            if (currentOldMsgId) {
                try {
                    await fetch(`https://api.telegram.org/bot${telegramToken}/deleteMessage`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ chat_id: cId, message_id: currentOldMsgId })
                    });
                } catch(e) {}
            }
            try {
                const tgRes = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: cId, text, parse_mode: 'Markdown' })
                });
                const tgData = await tgRes.json();
                if (tgData.ok && !firstMsgId) firstMsgId = tgData.result.message_id;
            } catch(e) {}
        }));
    }

    const newRecordData = {
        studentId: validStudentIdStr,
        studentName: student.name,
        status: newStatus,
        arrivalTime: arrTime,
        leaveTime: levTime,
        lastScan: now,
        messageId: firstMsgId || currentOldMsgId
    };

    if (studentIndex >= 0) {
        existingRecords[studentIndex] = newRecordData;
    } else {
        existingRecords.push(newRecordData);
    }

    await Attendance.findOneAndUpdate(
        { groupName, date, teacherId },
        { groupName, date, adminName, teacherId, records: existingRecords },
        { new: true, upsert: true }
    );

    return res.status(200).json({ success: true, message: `${student.name} muvaffaqiyatli belgilandi!` });

  } catch (error) {
    console.error("QR Scan Xatosi:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}