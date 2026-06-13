import { useState, useEffect } from 'react';

export default function Dashboard() {
  const [stats, setStats] = useState({ payments: [], totalAmount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/payments');
        const data = await res.json();
        
        if (data.success) {
          const total = data.data.reduce((sum, item) => sum + item.amount, 0);
          setStats({ payments: data.data, totalAmount: total });
        }
      } catch (error) {
        console.error("Xatolik:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="text-gray-500">Yuklanmoqda...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Umumiy Statistika</h1>
      
      {/* Kartochkalar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-gray-500 text-sm font-medium">Jami Tushum</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {stats.totalAmount.toLocaleString()} so'm
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-gray-500 text-sm font-medium">To'lovlar soni</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">{stats.payments.length} ta</p>
        </div>
      </div>

      {/* Oxirgi to'lovlar jadvali */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Oxirgi qabul qilingan to'lovlar</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm">
                <th className="px-6 py-3 border-b">Admin</th>
                <th className="px-6 py-3 border-b">Summa</th>
                <th className="px-6 py-3 border-b">To'lov Turi</th>
                <th className="px-6 py-3 border-b">Sana</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {stats.payments.slice(0, 10).map((p, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-6 py-4 border-b">{p.adminName}</td>
                  <td className="px-6 py-4 border-b font-medium text-green-600">{p.amount.toLocaleString()} so'm</td>
                  <td className="px-6 py-4 border-b">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${p.paymentType === 'Naqd' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {p.paymentType}
                    </span>
                  </td>
                  <td className="px-6 py-4 border-b text-gray-500">
                    {new Date(p.date).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}