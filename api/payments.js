// ... yuqoridagi kod qismi bir xil ...
export default async function handler(req, res) {
  await connectDB();
  try {
    if (req.method === 'GET') {
      const payments = await Payment.find({}).sort({ date: -1 });
      return res.status(200).json({ success: true, data: payments });
    }
    if (req.method === 'POST') {
      const newPayment = await Payment.create(req.body);
      return res.status(201).json({ success: true, data: newPayment });
    }
    if (req.method === 'DELETE') {
      await Payment.findByIdAndDelete(req.body.id);
      return res.status(200).json({ success: true });
    }
    if (req.method === 'PUT') {
      const { id, ...updateData } = req.body;
      const updated = await Payment.findByIdAndUpdate(id, updateData, { new: true });
      return res.status(200).json({ success: true, data: updated });
    }
    res.status(405).json({ message: "Metod ruxsat etilmagan" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}