import mongoose from 'mongoose';

// ════════════════════════════════════════════════════════════════════════════
// BARCHA MONGOOSE MODELLARI — BITTA JOYDA.
//
// Avval bir xil model (masalan Schedule, Homework, Grade, Message) bir nechta
// api/ faylida alohida-alohida e'lon qilingan edi (student-profile.js va
// students.js ichida bir xil sxema ikki marta yozilgan). Bu xavfli edi —
// agar bittasida sxema o'zgartirilsa, ikkinchisi eskirib qolishi mumkin edi.
// Endi har bir model FAQAT shu yerda ta'riflanadi, boshqa fayllar shu yerdan
// import qiladi.
// ════════════════════════════════════════════════════════════════════════════

const flexSchema = () => new mongoose.Schema({}, { strict: false });

export const Student = mongoose.models.Student || mongoose.model('Student', new mongoose.Schema({
  name:            { type: String,   required: true },
  parentName:      { type: String,   required: true },
  phone:           { type: String,   default: "Kiritilmagan" },
  group:           { type: String,   required: true },
  telegramChatId:  { type: String,   default: null },
  groupsData:      { type: Array,    default: [] },
  isNewStudent:    { type: Boolean,  default: true },
  exceptionMonths: { type: [String], default: [] },
  teacherIds:      { type: [String], default: [] },
  lastReminderDate:{ type: String,   default: null },
  addedAt:         { type: Date,     default: Date.now }
}, { strict: false }), 'students');

export const Payment = mongoose.models.Payment || mongoose.model('Payment', new mongoose.Schema({
  studentId:         { type: String, required: true },
  studentName:       { type: String, required: true },
  groupName:         { type: String, required: true },
  amount:            { type: Number, required: true },
  priceAtThatTime:   { type: Number },
  paymentType:       { type: String, required: true },
  month:             { type: String, required: true },
  date:              { type: Date, default: Date.now },
  adminName:         { type: String, required: true },
  telegramChatId:    { type: String },
  telegramMessageId: { type: Number },
  extraMessageIds:   { type: [Number], default: [] },
  teacherId:         { type: String, required: true }
}), 'payments');

export const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
  username:        { type: String, required: true, unique: true },
  password:        { type: String, required: true }, // bcrypt hash
  fullName:        { type: String, default: "Xodim" },
  role:            { type: String, enum: ['super_admin', 'teacher', 'assistant'], default: 'teacher' },
  parentTeacherId: { type: String, default: null },
  subject:         { type: String, default: "Umumiy" },
  permissions:     { type: Array, default: ['davomat', 'guruhlar'] },
  loginHistory:    { type: Array, default: [] },
  addedAt:         { type: Date, default: Date.now }
}), 'users');

export const Expense = mongoose.models.Expense || mongoose.model('Expense', new mongoose.Schema({
  reason:    { type: String, required: true },
  amount:    { type: Number, required: true },
  month:     { type: String, required: true },
  adminName: { type: String, default: "Admin" },
  teacherId: { type: String, required: true },
  date:      { type: Date, default: Date.now }
}), 'expenses');

export const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', flexSchema(), 'attendances');

export const BotAdmin = mongoose.models.BotAdmin || mongoose.model('BotAdmin', new mongoose.Schema({
  chatId: String
}), 'bot_admins');

export const Broadcast = mongoose.models.Broadcast || mongoose.model('Broadcast', new mongoose.Schema({
  text: String,
  date: { type: Date, default: Date.now },
  messages: [{ chatId: String, messageId: Number }]
}), 'broadcasts');

export const CronLog = mongoose.models.CronLog || mongoose.model('CronLog', flexSchema(), 'cron_logs');

// ─── YANGI FUNKSIYALAR UCHUN MODELLAR ────────────────────────────────────────

export const Schedule = mongoose.models.Schedule || mongoose.model('Schedule', new mongoose.Schema({
  groupName: { type: String, required: true },
  teacherId: { type: String, required: true },
  days: [{
    day:       { type: String, required: true },
    startTime: { type: String, required: true },
    endTime:   { type: String, required: true },
    room:      { type: String, default: "" }
  }],
  updatedAt: { type: Date, default: Date.now }
}, { strict: false }), 'schedules');

export const Homework = mongoose.models.Homework || mongoose.model('Homework', new mongoose.Schema({
  groupName:   { type: String, required: true },
  teacherId:   { type: String, required: true },
  title:       { type: String, required: true },
  description: { type: String, default: "" },
  dueDate:     { type: String, required: true }, // "YYYY-MM-DD"
  createdAt:   { type: Date, default: Date.now }
}, { strict: false }), 'homeworks');

export const Grade = mongoose.models.Grade || mongoose.model('Grade', new mongoose.Schema({
  studentId: { type: String, required: true },
  groupName: { type: String, required: true },
  teacherId: { type: String, required: true },
  score:     { type: Number, required: true },
  maxScore:  { type: Number, default: 100 },
  comment:   { type: String, default: "" },
  date:      { type: Date, default: Date.now }
}, { strict: false }), 'grades');

export const Message = mongoose.models.Message || mongoose.model('Message', new mongoose.Schema({
  studentId:  { type: String, required: true },
  teacherId:  { type: String, required: true },
  fromParent: { type: Boolean, default: true },
  text:       { type: String, required: true },
  date:       { type: Date, default: Date.now },
  isRead:     { type: Boolean, default: false }
}, { strict: false }), 'messages');