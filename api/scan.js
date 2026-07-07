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

    // 🔥 QR koddan kelgan ID ni ortiqcha bo'sh joylardan tozalaymiz
    const cleanInputId = studentId ? studentId.toString().trim() : "";

    if (!cleanInputId || !mongoose.Types.ObjectId.isValid(cleanInputId)) {
        return res.status(400).json({ success: false, message: "Noto'g'ri QR-kod tizimi!" });
    }

    const student = await Student.findById(cleanInputId);
    if (!student) {
        return res.status(404).json({ success: false, message: "Bunday o'quvchi topilmadi!" });
    }

    const validStudentIdStr = student._id.toString();

    const studentGroups = student.group ? student.group.split(',').map(g => g.trim()).filter(Boolean) : [];
    if (studentGroups.length === 0) {
        return res.status(400).json({ success: false, message: "O'quvchi hech qaysi guruhda yo'q!" });
    }

    const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
    const [yyyy, mm, dd] = date.split("-");
    const formattedDate = `${dd}.${mm}.${yyyy}`;

    const timeStr = new Date().toLocaleTimeString('ru-RU', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit' });
    const now = Date.now();

    let anyUpdate = false;

    for (const groupName of studentGroups) {

        // 1) Guruh/sana uchun hujjat borligini KAFOLATLAYMIZ.
        //    records massiviga TEGMAYMIZ - shu bilan bir nechta dublikat hujjat
        //    yaratilishining oldi olinadi.
        await Attendance.findOneAndUpdate(
            { groupName, date },
            {
                $setOnInsert: { groupName, date, records: [] },
                $set: { adminName }
            },
            { upsert: true }
        );

        // 2) O'quvchining ESKI yozuvini FAQAT shu odam uchun o'qib olamiz
        //    (butun records massivini emas - $elemMatch orqali faqat kerakli elementni)
        const doc = await Attendance.findOne(
            { groupName, date },
            { records: { $elemMatch: { studentId: validStudentIdStr } }, teacherId: 1 }
        );

        const current = (doc && doc.records && doc.records.length > 0) ? doc.records[0] : null;

        let newStatus = "keldi";
        let arrTime = timeStr;
        let levTime = null;

        if (current) {
            const currentStatus = (current.status || '').toLowerCase().trim();
            const safeLastScan = current.lastScan ? Number(current.lastScan) : 0;
            const timePassed = now - safeLastScan;

            // 30 daqiqa himoyasi
            if (safeLastScan > 0 && timePassed < 1800000) {
                continue;
            }

            // 5 soatdan oshsa yangidan "Keldi", aks holda "Ketdi"
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

        anyUpdate = true;

        let firstMsgId = null;
        let currentOldMsgId = current ? current.messageId : null;

        if (telegramToken && student.telegramChatId) {
            const chatIds = student.telegramChatId.split(',').filter(Boolean);

            const getStatusText = (st, arr, lev) => {
               if (st === 'keldi') return `✅ Darsga keldi\n⏰ Kelgan vaqti: ${arr || '--:--'}`;
               if (st === 'kechikdi') return `⏳ Kechikib keldi\n⏰ Kelgan vaqti: ${arr || '--:--'}`;
               if (st === 'ketdi') return `🏠 Darsdan ketdi\n🟢 Kelgan vaqti: ${arr || '--:--'}\n🔴 Ketgan vaqti: ${lev || '--:--'}`;
               return '❌ Darsga kelmadi';
            };

            const isCorrection = !!current && current.status !== "" && newStatus === 'ketdi';

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

        // teacherId ni aniqlash
        let teacherId = doc ? doc.teacherId : null;
        if (!teacherId) {
            if (student.groupsData && Array.isArray(student.groupsData)) {
                const match = student.groupsData.find(x => x.name === groupName);
                if (match && match.teacherId) teacherId = match.teacherId;
            }
            if (!teacherId && student.teacherIds && student.teacherIds.length > 0) teacherId = student.teacherIds[0];
        }

        // 3) 🔥 ATOMIK YOZISH: butun massivni EMAS, faqat shu o'quvchining
        //    elementini yozamiz - shu bilan boshqa o'quvchilarning parallel
        //    yozuvlari YO'QOLIB KETMAYDI.
        if (current) {
            await Attendance.updateOne(
                { groupName, date },
                {
                    $set: {
                        "records.$[elem]": newRecordData,
                        ...(teacherId ? { teacherId } : {})
                    }
                },
                { arrayFilters: [{ "elem.studentId": validStudentIdStr }] }
            );
        } else {
            // Poyga holatidan qo'shimcha himoya: agar shu oraliqda boshqa so'rov
            // allaqachon shu o'quvchini qo'shib ulgurgan bo'lsa, $ne shartiga
            // ko'ra bu yozuv hech narsani o'zgartirmaydi (dublikat bo'lmaydi).
            await Attendance.updateOne(
                { groupName, date, "records.studentId": { $ne: validStudentIdStr } },
                {
                    $push: { records: newRecordData },
                    ...(teacherId ? { $set: { teacherId } } : {})
                }
            );
        }
    }

    if (!anyUpdate) {
         return res.status(200).json({ success: true, message: `${student.name} qayd etilmadi (Hali 30 daqiqa o'tmadi).` });
    }

    return res.status(200).json({ success: true, message: `${student.name} muvaffaqiyatli belgilandi!` });

  } catch (error) {
    console.error("QR Scan Xatosi:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}