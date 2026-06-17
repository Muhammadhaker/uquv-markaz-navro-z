export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: "Faqat POST" });

  const { chatId, text } = req.body;
  
  // DIQQAT: Sizning api/bot.js dagi o'zgaruvchi nomingiz bilan bir xil qildik!
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
      return res.status(200).json({ success: true });
    } else {
      return res.status(400).json({ success: false, error: data.description });
    }
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}