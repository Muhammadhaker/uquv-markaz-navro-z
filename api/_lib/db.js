import mongoose from 'mongoose';

// Barcha api/ fayllar shu funksiyani ishlatadi — avval har bir faylda
// alohida-alohida yozilgan edi (12 marta takrorlangan kod).
export const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI topilmadi!");
  return mongoose.connect(process.env.MONGODB_URI);
};

export default connectDB;