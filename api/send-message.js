import mongoose from 'mongoose';

// Payment modelini chaqirib olamiz
const Payment = mongoose.models.Payment || mongoose.model('Payment', new mongoose.Schema({}, { strict: false }), 'payments');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: "Faqat POST" });

  const { chatId, text, paymentId } = req.body; 
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!chatId) return res.status(400).json({ success: false, error: "Chat ID yo'q" });

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
      })
    });

    const data = await response.json();
    
    if (data.ok) {
      // YANGI MANTIQ: Agar xabar muvaffaqiyatli ketsa va paymentId mavjud bo'lsa:
      if (paymentId && data.result?.message_id) {
        // Bazaga ulanmagan bo'lsak ulanamiz
        if (mongoose.connection.readyState < 1) {
          await mongoose.connect(process.env.MONGODB_URI);
        }
        // To'lov bazasiga "extraMessageIds" degan ro'yxat ochib, xabar ID sini solib qo'yamiz
        await Payment.findByIdAndUpdate(paymentId, {
          $push: { extraMessageIds: data.result.message_id }
        });
      }

      return res.status(200).json({ success: true });
    } else {
      return res.status(400).json({ success: false, error: data.description });
    }
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}