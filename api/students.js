// ... yuqoridagi kod qismi bir xil ...
export default async function handler(req, res) {
  await connectDB();
  try {
    if (req.method === 'GET') {
      const students = await Student.find({}).sort({ addedAt: -1 });
      return res.status(200).json({ success: true, data: students });
    }
    if (req.method === 'POST') {
      const newStudent = await Student.create(req.body);
      return res.status(201).json({ success: true, data: newStudent });
    }
    if (req.method === 'DELETE') {
      await Student.findByIdAndDelete(req.body.id);
      return res.status(200).json({ success: true });
    }
    res.status(405).json({ message: "Metod ruxsat etilmagan" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}