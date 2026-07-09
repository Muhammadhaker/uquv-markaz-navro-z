import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  return mongoose.connect(process.env.MONGODB_URI);
};

// Attendance sxemasiga compound UNIQUE index qo'shildi.
// Bu bir xil guruh/sana/ustoz uchun ikkita alohida hujjat yaratilishining
// (upsert race condition) oldini oladi.
const attendanceSchema = new mongoose.Schema({}, { strict: false });
attendanceSchema.index({ groupName: 1, date: 1, teacherId: 1 }, { unique: true });

const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema, 'attendances');
const Student = mongoose.models.Student || mongoose.model('Student', new mongoose.Schema({}, { strict: false }), 'students');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: "Metod ruxsat etilmagan" });

  // 3. Avtorizatsiya endi MAJBURIY
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ success: false, message: "Avtorizatsiyadan o'tilmagan!" });
  }

  try {
    await connectDB();
    const { studentId, date, groupName, teacherId, adminName } = req.body;

    const cleanInputId = studentId ? studentId.toString().trim() : "";
    if (!cleanInputId || !mongoose.Types.ObjectId.isValid(cleanInputId)) {
        return res.status(400).json({ success: false, message: "Noto'g'ri QR-kod!" });
    }

    const student = await Student.findById(cleanInputId).lean();
    if (!student) {
        return res.status(404).json({ success: false, message: "Bunday o'quvchi topilmadi!" });
    }

    let actualGroupName = student.group ? student.group.split(',')[0].trim() : (groupName || "Guruhsiz");
    let actualTeacherId = student.teacherId || teacherId;

    if (!actualGroupName || !actualTeacherId) {
         return res.status(400).json({ success: false, message: "Guruh yoki Ustoz aniqlanmadi." });
    }

    const validStudentIdStr = student._id.toString();

    let oldDoc = await Attendance.findOne({ groupName: actualGroupName, date, teacherId: actualTeacherId }).lean();

    const now = Date.now();
    let firstScanTime = oldDoc?.firstScanTime || now;

    let existingRecords = oldDoc?.records || [];
    let currentRecord = existingRecords.find(r => String(r.studentId) === validStudentIdStr);

    const timeStr = new Date().toLocaleTimeString('ru-RU', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit' });

    const isLate = (now - firstScanTime) > 15 * 60 * 1000;
    const initialStatus = isLate ? "kechikdi" : "keldi";

    let newStatus = initialStatus;
    let arrTime = timeStr;
    let levTime = null;
    let currentOldMsgId = null;

    if (currentRecord) {
        const currentStatus = (currentRecord.status || '').toLowerCase().trim();
        currentOldMsgId = currentRecord.messageId;

        let safeLastScan = currentRecord.lastScan ? Number(currentRecord.lastScan) : 0;
        const timePassed = now - safeLastScan;

        if (safeLastScan > 0 && timePassed < 1800000) {
           return res.status(200).json({ success: true, message: `${student.name} qayd etilmadi (Hali 30 daqiqa o'tmadi).` });
        }

        if (currentStatus === 'keldi' || currentStatus === 'kechikdi') {
            newStatus = 'ketdi';
            arrTime = currentRecord.arrivalTime || '--:--';
            levTime = timeStr;
        } else {
            newStatus = initialStatus;
            arrTime = timeStr;
            levTime = null;
        }
    }

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

        const [yyyy, mm, dd] = date.split("-");
        const formattedDate = `${dd}.${mm}.${yyyy}`;
        let text = `📋 *Davomat (QR-Kod)*\n\nHurmatli *${student.name}*,\n\n📅 Sana: ${formattedDate}\n📚 Fan: ${actualGroupName}\n\n📊 Holat: \n*${getStatusText(newStatus, arrTime, levTime)}*`;

        await Promise.allSettled(chatIds.map(async (cId) => {
            if (currentOldMsgId) {
                try {
                    await fetch(`https://api.telegram.org/bot${telegramToken}/deleteMessage`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ chat_id: cId, message_id: currentOldMsgId })
                    });
                } catch(e) { console.error(`Telegram Delete Xatosi (Chat ID: ${cId}):`, e); }
            }
            try {
                const tgRes = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: cId, text, parse_mode: 'Markdown' })
                });
                const tgData = await tgRes.json();
                if (tgData.ok && !firstMsgId) firstMsgId = tgData.result.message_id;
            } catch(e) { console.error(`Telegram Send Xatosi (Chat ID: ${cId}):`, e); }
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

    try {
        if (currentRecord) {
            await Attendance.updateOne(
                { groupName: actualGroupName, date, teacherId: actualTeacherId },
                {
                    $set: {
                        "records.$[elem]": newRecordData,
                        firstScanTime: firstScanTime
                    }
                },
                { arrayFilters: [{ "elem.studentId": validStudentIdStr }] }
            );
        } else {
            await Attendance.findOneAndUpdate(
                { groupName: actualGroupName, date, teacherId: actualTeacherId },
                {
                    $set: { adminName, firstScanTime },
                    $push: { records: newRecordData }
                },
                { new: true, upsert: true }
            );
        }
    } catch (writeErr) {
        // E11000 duplicate key: ikkita so'rov bir vaqtda kunning birinchi
        // hujjatini upsert qilishga urinib, biri parallel ravishda yaratib
        // ulgurgan bo'lishi mumkin. Bu holatda operatsiyani qayta urinamiz —
        // endi hujjat mavjud, shuning uchun oddiy $push/$set yetarli.
        if (writeErr.code === 11000) {
            await Attendance.updateOne(
                { groupName: actualGroupName, date, teacherId: actualTeacherId },
                currentRecord
                    ? {
                        $set: {
                            "records.$[elem]": newRecordData,
                            firstScanTime: firstScanTime
                        }
                      }
                    : { $push: { records: newRecordData } },
                currentRecord ? { arrayFilters: [{ "elem.studentId": validStudentIdStr }] } : {}
            );
        } else {
            throw writeErr;
        }
    }

    return res.status(200).json({ success: true, message: `${student.name} - ${newStatus.toUpperCase()} belgilandi!` });

  } catch (error) {
    console.error("QR Scan Xatosi:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}