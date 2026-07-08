import mongoose from 'mongoose';

const Payment = mongoose.models.Payment || mongoose.model('Payment', new mongoose.Schema({}, { strict: false }), 'payments');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: "Faqat POST ruxsat etiladi" });

  const { chatId, text, paymentId } = req.body; 
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!chatId) return res.status(400).json({ success: false, error: "Chat ID taqdim etilmagan" });

  try {
    // 🔥 MUAMMO YECHIMI: Qanday formatda kelishidan qat'i nazar (Number, String yoki vergulli ro'yxat) uni xavfsiz Massivga o'zgartiramiz
    const safeChatIds = String(chatId).split(',').map(id => id.trim()).filter(Boolean);

    if (safeChatIds.length === 0) {
        return res.status(400).json({ success: false, error: "Yaroqli Chat ID topilmadi" });
    }

    let successCount = 0;
    let firstMsgId = null;
    let lastError = null;

    // Har bir ota-onaga (agar ular bitta bolaga ulangan bo'lsa) alohida xabar yuboramiz
    await Promise.all(safeChatIds.map(async (cId) => {
        try {
            const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: cId,
                    text: text,
                    parse_mode: 'Markdown'
                })
            });

            const data = await response.json();
            
            if (data.ok) {
                successCount++;
                if (!firstMsgId) firstMsgId = data.result.message_id;
            } else {
                lastError = data.description;
            }
        } catch (e) {
            lastError = e.message;
        }
    }));

    // Agar hech bo'lmaganda 1 kishiga (dadasiga yoki onasiga) yetib borgan bo'lsa - Muvaffaqiyatli deymiz!
    if (successCount > 0) {
      if (paymentId && firstMsgId) {
        if (mongoose.connection.readyState < 1) {
          await mongoose.connect(process.env.MONGODB_URI);
        }
        await Payment.findByIdAndUpdate(paymentId, {
          $push: { extraMessageIds: firstMsgId }
        });
      }
      return res.status(200).json({ success: true, message: `${successCount} ta profilga yuborildi!` });
    } else {
      // Hech kimga bormasa, unda xatoni ko'rsatamiz
      return res.status(400).json({ success: false, error: lastError || "Xabar yuborishda noma'lum xatolik" });
    }
    
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}