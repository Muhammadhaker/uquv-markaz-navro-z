import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Printer, ArrowLeft, Loader2, Filter, Users, Image as ImageIcon, CheckSquare, Square } from "lucide-react";

export default function PrintBadges() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState("Barchasi");
  
  const [printMode, setPrintMode] = useState("front"); 
  const [selectedIds, setSelectedIds] = useState([]); // 🔥 Tanlangan o'quvchilarni saqlash uchun

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await fetch("/api/students");
        const data = await res.json();
        if (data.success) {
          const sortedStudents = data.data.sort((a, b) => a.name.localeCompare(b.name));
          setStudents(sortedStudents);
          // Boshida ekrandagi barcha o'quvchilarni avtomatik tanlaymiz
          setSelectedIds(sortedStudents.map(s => s._id)); 
        }
      } catch (err) {
        console.error("O'quvchilarni yuklashda xato:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  const allGroups = students.flatMap((s) =>
    s.group ? s.group.split(",").map((g) => g.trim()) : []
  );
  const uniqueGroups = ["Barchasi", ...new Set(allGroups)].filter(Boolean);

  const filteredStudents = students.filter((s) => {
    if (selectedGroup === "Barchasi") return true;
    const sGroups = s.group ? s.group.split(",").map((g) => g.trim()) : [];
    return sGroups.includes(selectedGroup);
  });

  // Guruh o'zgarganda tanlanganlarni ham shu guruhga moslab yangilash
  const handleGroupChange = (e) => {
    const newGroup = e.target.value;
    setSelectedGroup(newGroup);
    
    const newFiltered = students.filter((s) => {
      if (newGroup === "Barchasi") return true;
      const sGroups = s.group ? s.group.split(",").map((g) => g.trim()) : [];
      return sGroups.includes(newGroup);
    });
    setSelectedIds(newFiltered.map(s => s._id));
  };

  // 🔥 O'quvchini tanlash yoki tanlovni bekor qilish
  const toggleSelection = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // 🔥 Barchasini birdaniga tanlash yoki olib tashlash
  const toggleAll = () => {
    if (selectedIds.length === filteredStudents.length) {
      setSelectedIds([]); // Hammasini bekor qilish
    } else {
      setSelectedIds(filteredStudents.map(s => s._id)); // Hammasini tanlash
    }
  };

  const handlePrint = (mode) => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
      // Print oynasi yopilgach ekranni yana o'quvchilar holatiga qaytarish
      setTimeout(() => setPrintMode("front"), 500);
    }, 300);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24">
      
      {/* 🛑 BOSHQARUV PANELI (PRINTDA YASHIRILADI) */}
      <div className="no-print">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6 border-b border-slate-200 pb-6">
          <div>
            <button 
              onClick={() => window.history.back()} 
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 font-bold mb-3 transition-colors w-fit px-3 py-1.5 -ml-3 rounded-lg hover:bg-slate-100"
            >
              <ArrowLeft size={16} /> Orqaga qaytish
            </button>
            <h1 className="text-2xl font-bold text-slate-800">Tanlab Chop Etish</h1>
            <p className="text-slate-500 text-sm mt-1">
              Faqat kerakli o'quvchilarni ustiga bosib tanlang. Logotiplar ham shunga mos chiqadi.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {/* OLDI QISMNI CHOP ETISH TUGMASI */}
            <button 
              onClick={() => handlePrint('front')}
              disabled={selectedIds.length === 0}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <Printer size={20} /> <span>Oldi (QR) - {selectedIds.length} ta</span>
            </button>

            {/* ORQA QISMNI (LOGOTIPLARNI) CHOP ETISH TUGMASI */}
            <button 
              onClick={() => handlePrint('back')}
              disabled={selectedIds.length === 0}
              className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <ImageIcon size={20} /> <span>Orqasi (Logo) - {selectedIds.length} ta</span>
            </button>
          </div>
        </div>

        <div className="mb-8 flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100 justify-between">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="text-slate-500 font-bold px-2 flex items-center gap-2">
              <Filter size={20} className="text-indigo-500" /> Guruh:
            </div>
            <select
              value={selectedGroup}
              onChange={handleGroupChange}
              className="w-full sm:w-64 py-2.5 px-4 rounded-xl outline-none font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 cursor-pointer focus:ring-2 focus:ring-indigo-500/50"
            >
              {uniqueGroups.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* 🔥 BARCHASINI TANLASH TUGMASI */}
          <button 
            onClick={toggleAll}
            className="text-sm font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-4 py-2.5 rounded-xl transition-colors w-full sm:w-auto text-center"
          >
            {selectedIds.length === filteredStudents.length ? "Barchasini bekor qilish" : "Barchasini tanlash"}
          </button>
        </div>
      </div>

      {/* 🖨️ CHOP ETISH ZONASI */}
      <div id="print-section" className="print-area">
        
        {/* OLDI QISMI (O'QUVCHILAR RO'YXATI) */}
        {printMode === 'front' && filteredStudents.map((student) => {
          const isSelected = selectedIds.includes(student._id);
          
          return (
            <div 
              key={student._id} 
              onClick={() => toggleSelection(student._id)}
              // Tanlanmagan bo'lsa xiralashtiramiz va PRINTDA YASHIRAMIZ (no-print)
              className={`badge-card front-side cursor-pointer transition-all duration-200 
                ${isSelected ? 'ring-2 ring-indigo-500 shadow-md' : 'opacity-40 grayscale-[40%] scale-95 no-print'}`}
            >
              {/* Tanlash pichkasi */}
              <div className="absolute top-3 right-3 no-print bg-white rounded-md z-10 shadow-sm">
                {isSelected ? <CheckSquare className="text-indigo-600" size={24} /> : <Square className="text-slate-400" size={24} />}
              </div>

              <div>
                <div className="header-title">G'ulomov Math Group</div>
                <div className="header-sub">Student Access Badge</div>
              </div>

              <div className="qr-box">
                <QRCodeSVG value={`https://t.me/navroz_math_group_bot?start=${student._id}`} size={160} level="H" />
              </div>

              <div className="student-details">
                <div className="st-name">{student.name}</div>
                <div className="st-group">📚 {student.group || "Guruhsiz"}</div>
              </div>
            </div>
          )
        })}

        {/* ORQA QISMI (FAQAT TANLANGANLAR SONICHA LOGOTIP CHIQARISH) */}
        {printMode === 'back' && Array.from({ length: selectedIds.length }).map((_, index) => (
          <div key={index} className="badge-card back-side shadow-sm">
            <img src="/icon-192.png" className="logo-img" alt="Logo" />
            <div className="footer-strip">Mantiq • Bilim • Natija</div>
          </div>
        ))}

        {printMode === 'front' && filteredStudents.length === 0 && (
          <div className="w-full text-center py-16 text-slate-400 no-print flex flex-col items-center gap-3">
            <Users size={48} className="opacity-40" />
            <p className="font-medium text-lg">Bu guruhda o'quvchilar yo'q.</p>
          </div>
        )}
      </div>

      {/* 💅 STYLING PANELI */}
      <style>{`
        .print-area {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          justify-content: center;
        }

        .badge-card {
          width: 80mm;
          height: 124mm;
          background: white;
          border: 1px dashed #cbd5e1;
          box-sizing: border-box;
          padding: 12mm 6mm;
          display: flex;
          flex-direction: column;
          align-items: center;
          border-radius: 6px;
          position: relative;
        }

        /* Front Side (QR) Styles */
        .front-side {
          justify-content: space-between;
        }
        .header-title {
          color: #1e3a8a;
          font-size: 13px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          text-align: center;
        }
        .header-sub {
          font-size: 9px;
          color: #64748b;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
          text-align: center;
          margin-bottom: 8px;
        }
        .qr-box {
          padding: 8px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .qr-box svg {
          width: 42mm !important;
          height: 42mm !important;
        }
        .student-details { text-align: center; width: 100%; }
        .st-name {
          font-size: 19px;
          font-weight: 800;
          color: #1e293b;
          text-transform: uppercase;
          margin-bottom: 4px;
          line-height: 1.2;
        }
        .st-group { font-size: 12px; color: #4f46e5; font-weight: 700; }

        /* Back Side (Logo) Styles */
        .back-side {
          justify-content: center;
          background-color: #fafafa;
        }
        .logo-img {
          width: 55mm;
          height: 55mm;
          object-fit: contain;
        }
        .footer-strip {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          background: #1e3a8a;
          color: #fff;
          font-size: 9px;
          font-weight: 800;
          text-align: center;
          padding: 6px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom-left-radius: 4px;
          border-bottom-right-radius: 4px;
        }

        /* 🖨️ CHOP ETISH (PRINT) SOZLAMALARI */
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          
          html, body {
            height: auto !important;
            overflow: visible !important;
            background: white;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .no-print { display: none !important; }
          #print-section, #print-section * { visibility: visible; }

          #print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: flex !important;
            flex-wrap: wrap !important;
            justify-content: center !important;
            align-content: flex-start !important;
            gap: 10mm 15mm !important; 
            padding-top: 5mm !important;
          }

          .badge-card {
            border: 1px dashed #000 !important; 
            box-shadow: none !important;
            border-radius: 0 !important;
            page-break-inside: avoid;
            break-inside: avoid;
            /* Ekrandagi xiralik yoki effektlarni printda bekor qilish */
            opacity: 1 !important;
            transform: scale(1) !important;
            filter: none !important;
          }
          
          .footer-strip { border-radius: 0 !important; }
        }
      `}</style>
    </div>
  );
}