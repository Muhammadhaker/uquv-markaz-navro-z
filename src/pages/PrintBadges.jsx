import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Printer, ArrowLeft, Loader2, Filter, Users } from "lucide-react";

export default function PrintBadges() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState("Barchasi");

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await fetch("/api/students");
        const data = await res.json();
        if (data.success) {
          // O'quvchilarni alifbo tartibida to'g'irlaymiz (A-Z)
          const sortedStudents = data.data.sort((a, b) => a.name.localeCompare(b.name));
          setStudents(sortedStudents);
        }
      } catch (err) {
        console.error("O'quvchilarni yuklashda xato:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  // Barcha mavjud guruhlarni ajratib olish
  const allGroups = students.flatMap((s) =>
    s.group ? s.group.split(",").map((g) => g.trim()) : []
  );
  const uniqueGroups = ["Barchasi", ...new Set(allGroups)].filter(Boolean);

  // Tanlangan guruh bo'yicha o'quvchilarni saralash
  const filteredStudents = students.filter((s) => {
    if (selectedGroup === "Barchasi") return true;
    const sGroups = s.group ? s.group.split(",").map((g) => g.trim()) : [];
    return sGroups.includes(selectedGroup);
  });

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
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24 relative">
      
      {/* 🛑 BOSHQARUV PANELI (PRINT PAYTIDA YASHIRINADI) */}
      <div className="no-print">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-slate-200 pb-6">
          <div>
            <button 
              onClick={() => window.history.back()} 
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 font-bold mb-3 transition-colors w-fit px-3 py-1.5 -ml-3 rounded-lg hover:bg-slate-100"
            >
              <ArrowLeft size={16} /> Orqaga qaytish
            </button>
            <h1 className="text-2xl font-bold text-slate-800">B2 Bejiklar Chop Etish</h1>
            <p className="text-slate-500 text-sm mt-1">
              B2 (80x124mm) karmashkalar uchun maxsus andoza
            </p>
          </div>

          <button 
            onClick={handlePrint}
            disabled={filteredStudents.length === 0}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <Printer size={20} /> <span>Print ({filteredStudents.length} ta)</span>
          </button>
        </div>

        {/* Guruh bo'yicha filter */}
        <div className="mb-8 flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 w-full sm:w-auto text-slate-500 font-bold px-2">
            <Filter size={20} className="text-indigo-500" /> Guruhni tanlang:
          </div>
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="w-full sm:w-72 py-2.5 px-4 rounded-xl outline-none font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 cursor-pointer focus:ring-2 focus:ring-indigo-500/50"
          >
            {uniqueGroups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 🖨️ BEJIKLAR ZONASI (A4 QOG'OZ UCHUN MOSLANGAN) */}
      <div id="print-section" className="print-area">
        {filteredStudents.map((student) => (
          <div key={student._id} className="badge-card">
            
            <div className="badge-header">
              <h2>{student.name}</h2>
              <div className="badge-group">{student.group || "G'ulomov Math Group"}</div>
            </div>

            <div className="badge-qr">
              {/* Davomat skaneri to'g'ri ishlashi uchun to'g'ridan-to'g'ri ID beramiz */}
              <QRCodeSVG value={student._id} size={200} level="H" />
            </div>

            <div className="badge-footer">
              <div className="badge-brand">G'ULOMOV MATH GROUP</div>
              <div className="badge-tagline">Davomat tizimi orqali himoyalangan</div>
            </div>

          </div>
        ))}

        {filteredStudents.length === 0 && (
          <div className="w-full text-center py-16 text-slate-400 no-print flex flex-col items-center gap-3">
            <Users size={48} className="opacity-40" />
            <p className="font-medium text-lg">Bu guruhda o'quvchilar yo'q.</p>
          </div>
        )}
      </div>

      {/* 💅 CSS STYLING (B2 O'LCHAM VA PRINT PARAMETRLARI) */}
      <style>{`
        .print-area {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          justify-content: center;
        }

        /* TIKKA (VERTICAL) B2 BEJIK O'LCHAMLARI */
        .badge-card {
          width: 80mm;
          height: 124mm;
          background: white;
          border: 1px dashed #cbd5e1;
          box-sizing: border-box;
          padding: 10mm 6mm;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          border-radius: 8px;
          background-color: #fff;
        }

        @media screen {
          .badge-card {
            box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
            border: 2px dashed #94a3b8;
          }
        }

        .badge-header { text-align: center; width: 100%; }
        .badge-header h2 { 
          margin: 0 0 4px 0; 
          color: #1e293b; 
          font-size: 24px; 
          font-weight: 800; 
          line-height: 1.1; 
          text-transform: uppercase; 
        }
        .badge-group { font-size: 13px; color: #64748b; font-weight: bold; }
        
        .badge-qr { 
          margin: 0 auto; 
          display: flex; 
          justify-content: center; 
          align-items: center; 
          padding: 12px; 
          border: 2px solid #e2e8f0; 
          border-radius: 16px; 
          background: #fff; 
        }
        /* QR KOD O'LCHAMINI 80MM GA MOSLASHTIRISH */
        .badge-qr svg { width: 55mm !important; height: 55mm !important; }
        
        .badge-footer { text-align: center; width: 100%; }
        .badge-brand { color: #4f46e5; font-size: 16px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; }
        .badge-tagline { font-size: 10px; color: #94a3b8; font-weight: bold; margin-top: 2px; }

        /* 🖨️ PRINT BOSILGANDAGI HOLAT */
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm; /* A4 qog'oz chekkasidan qoladigan joy */
          }
          
          /* Menyular va UI tugmalarni yashirish */
          body * {
            visibility: hidden;
          }
          .no-print {
            display: none !important;
          }

          /* Faqat qog'oz hududini ko'rsatish */
          #print-section, #print-section * {
            visibility: visible;
          }

          #print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 5mm !important; /* Bejiklar orasidagi joy */
            justify-content: center !important;
            align-items: flex-start !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .badge-card {
            border: 1px dashed #000 !important; /* Qora nuqtali qirqish chizig'i */
            box-shadow: none !important;
            border-radius: 0 !important;
            break-inside: avoid; /* Qog'oz yarmidan bo'linib qolishini oldini oladi */
            page-break-inside: avoid;
            margin-bottom: 5mm;
          }
          
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}