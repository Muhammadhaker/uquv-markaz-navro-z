// ════════════════════════════════════════════════════════════════════════════
// TELEGRAM YORDAMCHI FUNKSIYALARI — bitta joyda.
// Avval bot.js, students.js, scan.js, payments.js va boshqa fayllarda bir xil
// fetch() chaqiruvlari alohida-alohida yozilgan edi. Endi hammasi shu yerdan
// import qilinadi.
// ════════════════════════════════════════════════════════════════════════════

// Telegram chatId har doim kamida 6 ta RAQAMDAN iborat bo'ladi.
export const isValidChatId = (id) => /^\d{6,}$/.test(String(id).trim());

// Vergul bilan ajratilgan bir nechta chatId'ni (masalan "dada,ona") xavfsiz
// massivga o'giradi, noto'g'ri qiymatlarni filtrlaydi.
export const parseChatIds = (raw) => {
  if (!raw) return [];
  return String(raw).split(',').map(id => id.trim()).filter(isValidChatId);
};

export const hasValidChatId = (raw) => parseChatIds(raw).length > 0;

// Xom Telegram API chaqiruvi
export const tg = (token, method, body) =>
  fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).then(r => r.json()).catch(err => {
    console.error(`TG ${method} xatosi:`, err.message);
    return null;
  });

export const sendMessage = (token, chatId, text, extra = {}) =>
  tg(token, 'sendMessage', { chat_id: chatId, text, parse_mode: 'Markdown', ...extra });

export const sendPhoto = (token, chatId, photo, caption, extra = {}) =>
  tg(token, 'sendPhoto', { chat_id: chatId, photo, caption, parse_mode: 'Markdown', ...extra });

export const deleteMessage = (token, chatId, message_id) =>
  tg(token, 'deleteMessage', { chat_id: chatId, message_id });

export const editMessageReplyMarkup = (token, chatId, message_id, markup = []) =>
  tg(token, 'editMessageReplyMarkup', { chat_id: chatId, message_id, reply_markup: { inline_keyboard: markup } });

// Bir nechta chatId'ga xabar yuboradi, natijalarni qaytaradi (allSettled bilan —
// bitta chatId xato bo'lsa boshqalarga yuborish to'xtamaydi).
export const broadcastToChatIds = async (token, chatIds, text, extra = {}) => {
  const results = await Promise.allSettled(
    chatIds.map(cId => sendMessage(token, cId, text, extra))
  );
  const successCount = results.filter(r => r.status === 'fulfilled' && r.value?.ok).length;
  const firstMsgId = results.find(r => r.status === 'fulfilled' && r.value?.ok)?.value?.result?.message_id || null;
  return { successCount, firstMsgId, results };
};