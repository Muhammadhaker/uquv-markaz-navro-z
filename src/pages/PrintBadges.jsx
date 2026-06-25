import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";

export default function PrintBadges() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await fetch("/api/students");
        const data = await res.json();
        if (data.success) setStudents(data.data);
      } catch (err) {
        console.error("O'quvchilarni yuklashda xato:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  const handlePrint = () => {
    window.print(); 
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto pb-24">
      {/* 🔥 PRINT PAYTIDA BU NAVIGATSIYA QISMI YASHIRINADI */}
      <div className="no-print flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 border-b pb-4">
        <div>
          <button 
            onClick={() => window.history.back()} 
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 font-bold mb-2 transition-colors"
          >
            <ArrowLeft size={16} /> Orqaga qaytish
          </button>
          <h1 className="text-2xl font-bold text-slate-800">O'quvchilar Bejiklari</h1>
          <p className="text-slate-500 text-sm">A4 qog'ozga chiqarish va kesib olish uchun tayyor andoza</p>
        </div>

        <button 
          onClick={handlePrint}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all transform hover:scale-102"
        >
          <Printer size={20} /> <span>Printerga chiqarish (Ctrl + P)</span>
        </button>
      </div>

      {/* 🔥 BEJIKLAR SETKASI (GRID) */}
      <div className="badge-grid">
        {students.map((student) => (
          <div key={student._id} className="badge-card">
            
            {/* Bejikning tepa qismi (Sarlavha) */}
            <div className="badge-header">
              <div className="badge-logo">G'ulomov</div>
              <div className="badge-sub">MATH GROUP</div>
            </div>

            {/* Bejikning asosiy qismi (QR kod va Ism) */}
            <div className="badge-body">
              <div className="qr-container">
                {/* 🔥 BOT MANZILI TO'G'RI VA ANIQ QO'YILDI */}
                <QRCodeSVG value={`https://t.me/navroz_math_group_bot?start=${student._id}`} size={110} level="H" />
              </div>
              
              <div className="student-info">
                <div className="student-name">{student.name}</div>
                <div className="student-group">📚 {student.group || "Guruhsiz"}</div>
                <div className="student-id">ID: {student._id.slice(-6).toUpperCase()}</div>
              </div>
            </div>

            {/* Bejikning tag qismi */}
            <div className="badge-footer">
              Sifatli ta'lim — kelajak garovi!
            </div>

          </div>
        ))}
      </div>

      {/* 🔥 PRINT PARAMETRLARI UCHUN CSS STYLES */}
      <style jsx>{`
        .badge-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(9cm, 1fr));
          gap: 15px;
          justify-items: center;
        }

        .badge-card {
          width: 9cm;
          height: 6cm;
          border: 1px dashed #cbd5e1; 
          border-radius: 8px;
          background-color: #ffffff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          display: flex;
          flex-col: column;
          flex-direction: column;
          overflow: hidden;
          box-sizing: border-box;
          page-break-inside: avoid;
        }

        .badge-header {
          background: linear-gradient(135deg, #4f46e5, #3730a3);
          color: white;
          text-align: center;
          padding: 6px 4px;
        }
        .badge-logo { font-size: 14px; font-weight: 900; letter-spacing: 1px; }
        .badge-sub { font-size: 8px; font-weight: bold; opacity: 0.8; }

        .badge-body {
          display: flex;
          padding: 10px;
          gap: 12px;
          align-items: center;
          flex-1: 1;
          height: 4.2cm;
        }

        .qr-container {
          border: 1px solid #e2e8f0;
          padding: 4px;
          background: white;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .student-info {
          display: flex;
          flex-direction: column;
          justify-content: center;
          text-align: left;
          overflow: hidden;
        }
        .student-name { font-size: 13px; font-weight: bold; color: #1e293b; line-height: 1.2; margin-bottom: 4px; }
        .student-group { font-size: 10px; color: #475569; font-weight: 500; }
        .student-id { font-size: 9px; color: #94a3b8; font-weight: bold; margin-top: 2px; }

        .badge-footer {
          background-color: #f8fafc;
          border-top: 1px solid #f1f5f9;
          font-size: 8px;
          color: #64748b;
          text-align: center;
          padding: 4px;
          font-weight: 600;
        }

        @media print {
          body {
            background: white;
            color: black;
            padding: 0;
            margin: 0;
          }
          .no-print, navigation, sidebar, header, footer, button {
            display: none !important;
          }
          .badge-grid {
            display: grid;
            grid-template-columns: repeat(2, 9cm); 
            gap: 10px;
            padding: 0;
            margin: 0;
            background: transparent;
          }
          .badge-card {
            box-shadow: none !important;
            border: 1px solid #000000 !important; 
            background-color: white !important;
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact;
          }
          @page {
            size: A4;
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  );
}