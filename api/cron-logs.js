import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  return mongoose.connect(process.env.MONGODB_URI);
};

const CronLog = mongoose.models.CronLog || mongoose.model('CronLog', new mongoose.Schema({}, { strict: false }), 'cron_logs');

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send('Ruxsat yoq');

  try {
    await connectDB();
    // Oxirgi 30 ta hisobotni (oxirgi 1 oyni) eng yangisidan boshlab tortib olamiz
    const logs = await CronLog.find({}).sort({ date: -1 }).limit(30);
    return res.status(200).json({ success: true, data: logs });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}