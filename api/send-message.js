import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI topilmadi!");
  return mongoose.connect(process.env.MONGODB_URI);
};

const Payment = mongoose.models.Payment || mongoose.model('Payment', new mongoose.Schema({}, { strict: false }), 'payments');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: "Faqat POST ruxsat etiladi" });
  }

  // FIX: Avtorizatsiya tekshiruvi — bu endpoint ochiq edi.
  // Har kim Telegram xabari yuborishi mumkin edi.
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ success: false, error: "Avtorizatsiyadan o'tilmagan!" });
  }

  const { chatId, text, paymentId } = req.body;
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!chatId) {
    return res.status(400).json({ success: false, error: "chatId taqdim etilmagan" });
  }
  if (!text || !String(text).trim()) {
    return res.status(400).json({ success: false, error: "Xabar matni bo'sh bo'lishi mumkin emas" });
  }
  if (!token) {
    return res.status(500).json({ success: false, error: "Bot token sozlanmagan" });
  }

  try {
    const safeChatIds = String(chatId)
      .split(',')
      .map(id => id.trim())
      .filter(id => id.length > 5); // Juda qisqa/noto'g'ri ID larni o'tkazib yuborish

    if (safeChatIds.length === 0) {
      return res.status(400).json({ success: false, error: "Yaroqli Chat ID topilmadi" });
    }

    let successCount = 0;
    let firstMsgId   = null;
    const errors     = [];

    // FIX 4: Promise.all → Promise.allSettled
    // Bitta chatId xato bo'lsa, boshqalariga xabar yetib boradi.
    const results = await Promise.allSettled(
      safeChatIds.map(cId =>
        fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: cId, text, parse_mode: 'Markdown' })
        }).then(r => r.json())
      )
    );

    results.forEach((result, i) => {
      if (result.status === 'fulfilled' && result.value?.ok) {
        successCount++;
        if (!firstMsgId) firstMsgId = result.value.result.message_id;
      } else {
        const reason = result.status === 'rejected'
          ? result.reason?.message
          : result.value?.description;
        errors.push(`${safeChatIds[i]}: ${reason || "Noma'lum xato"}`);
        console.error(`Telegram xabar xatosi (${safeChatIds[i]}):`, reason);
      }
    });

    if (successCount > 0) {
      // paymentId berilgan bo'lsa — messageId ni bazaga saqlaymiz
      if (paymentId && firstMsgId) {
        try {
          await connectDB();
          if (!mongoose.Types.ObjectId.isValid(paymentId)) {
            console.warn("Noto'g'ri paymentId:", paymentId);
          } else {
            await Payment.findByIdAndUpdate(paymentId, {
              $push: { extraMessageIds: firstMsgId }
            });
          }
        } catch (dbErr) {
          // DB xatosi asosiy javobni to'xtatmasin
          console.error("Payment update xatosi:", dbErr.message);
        }
      }

      return res.status(200).json({
        success: true,
        message: `${successCount} ta profilga yuborildi!`,
        // Qisman muvaffaqiyat bo'lsa xatolarni ham ko'rsatamiz
        ...(errors.length > 0 && { warnings: errors })
      });
    }

    // Hech kimga yetib bormadi
    return res.status(400).json({
      success: false,
      error: "Xabar hech kimga yetib bormadi",
      details: errors
    });

  } catch (error) {
    console.error("send-message xatosi:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}