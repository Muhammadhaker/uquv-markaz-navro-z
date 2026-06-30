import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Printer, ArrowLeft, Loader2, Filter, Users, Image as ImageIcon, CheckSquare, Square } from "lucide-react";

export default function PrintBadges() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState("Barchasi");
  
  const [printMode, setPrintMode] = useState("front"); 
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await fetch("/api/students");
        const data = await res.json();
        if (data.success) {
          const sortedStudents = data.data.sort((a, b) => a.name.localeCompare(b.name));
          setStudents(sortedStudents);
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

  const toggleSelection = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === filteredStudents.length) {
      setSelectedIds([]); 
    } else {
      setSelectedIds(filteredStudents.map(s => s._id)); 
    }
  };

  const handlePrint = (mode) => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
      setTimeout(() => setPrintMode("front"), 500);
    }, 300);
  };

  // 🔥 CHOP ETISH UCHUN MATEMATIK SAHIFALASH VA KO'GULASH LOGIKASI
  const selectedStudents = filteredStudents.filter(s => selectedIds.includes(s._id));
  
  // O'quvchilarni 4 tadan qilib sahifalarga (A4) bo'lamiz
  const printPages = [];
  for (let i = 0; i < selectedStudents.length; i += 4) {
    printPages.push(selectedStudents.slice(i, i + 4));
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24">
      
      {/* 🛑 DASHBOARD INTERFEYSI (FAQAT EKRANDA KO'RINADI, PRINTDA MUTLAQ YASHIRILADI) */}
      <div className="no-print">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6 border-b border-slate-200 pb-6">
          <div>
            <button 
              onClick={() => window.history.back()} 
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 font-bold mb-3 transition-colors w-fit px-3 py-1.5 -ml-3 rounded-lg hover:bg-slate-100"
            >
              <ArrowLeft size={16} /> Orqaga qaytish
            </button>
            <h1 className="text-2xl font-bold text-slate-800">Ikki Tomonlama Simmetrik Bejiklar</h1>
            <p className="text-slate-500 text-sm mt-1">
              Yangi o'lcham: 69x111mm. Qog'oz ag'darilganda logotiplar aniq joyiga tushadi.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button 
              onClick={() => handlePrint('front')}
              disabled={selectedIds.length === 0}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <Printer size={20} /> <span>Oldi (QR) - {selectedIds.length} ta</span>
            </button>

            <button 
              onClick={() => handlePrint('back')}
              disabled={selectedIds.length === 0}
              className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <ImageIcon size={20} /> <span>Orqasi (Katta Logo) - {selectedIds.length} ta</span>
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

          <button 
            onClick={toggleAll}
            className="text-sm font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-4 py-2.5 rounded-xl transition-colors w-full sm:w-auto text-center"
          >
            {selectedIds.length === filteredStudents.length ? "Barchasini bekor qilish" : "Barchasini tanlash"}
          </button>
        </div>

        {/* Ekranda boshqarish uchun oddiy ro'yxat */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filteredStudents.map((student) => {
            const isSelected = selectedIds.includes(student._id);
            return (
              <div 
                key={student._id}
                onClick={() => toggleSelection(student._id)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                  isSelected ? "bg-indigo-50/80 border-indigo-200" : "bg-white border-slate-100 hover:bg-slate-50"
                }`}
              >
                <div>
                  <div className="font-bold text-slate-800 text-sm">{student.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">📚 {student.group || "Guruhsiz"}</div>
                </div>
                <div>
                  {isSelected ? <CheckSquare className="text-indigo-600" size={22} /> : <Square className="text-slate-300" size={22} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 🖨️ MAXSUS CHOP ETISH ANDOZASI (CHOP ETILGANDA ISHGA TUSHADI) */}
      <div className="print-only">
        {printPages.map((pageStudents, pageIdx) => (
          <div key={pageIdx} className="print-page">
            {[0, 1, 2, 3].map((slotIndex) => {
              let student = null;

              if (printMode === "front") {
                // To'g'ri tartib
                student = pageStudents[slotIndex] || null;
              } else {
                // 🔥 AQLLI GORIZONTAL KO'ZGULASH REJIM (BACK SIDE)
                // Qog'oz ag'darilganda: 0-slot 1 ga, 1-slot 0 ga, 2-slot 3 ga, 3-slot 2 ga o'tadi
                const mirroredIndex = slotIndex === 0 ? 1 : slotIndex === 1 ? 0 : slotIndex === 2 ? 3 : 2;
                student = pageStudents[mirroredIndex] || null;
              }

              if (!student) return <div key={slotIndex} className="empty-badge-slot"></div>;

              return (
                <div key={slotIndex} className={`badge-card slot-${slotIndex}`}>
                  {printMode === "front" ? (
                    /* OLDI QISMI (QR-KOD) */
                    <>
                      <div className="header-section">
                        <div className="header-title">G'ulomov Math Group</div>
                        <div className="header-sub">Student Access Badge</div>
                      </div>
                      <div className="qr-container">
                        <div className="qr-box">
                          <QRCodeSVG value={`https://t.me/navroz_math_group_bot?start=${student._id}`} size={160} level="M" />
                        </div>
                      </div>
                      <div className="student-details">
                        <div className="st-name">{student.name}</div>
                        <div className="st-group">📚 {student.group || "Guruhsiz"}</div>
                      </div>
                    </>
                  ) : (
                    /* ORQA QISMI (YIRIKLASHTIRILGAN LOGOTIP) */
                    <>
                      <div className="logo-wrapper">
                        <img src="/icon-192.png" className="logo-img" alt="Logo" />
                      </div>
                      <div className="footer-strip">Mantiq • Bilim • Natija</div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* 💅 PRINT STYLING PANELI (MUTLAQ GEOMETRIYA) */}
      <style>{`
        /* Oddiy holatda print andozasini yashiramiz */
        .print-only { display: none; }

        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }

          @page { 
            size: A4 portrait; 
            margin: 0 !important; 
          }

          html, body, #root {
            background-color: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* HAR BIR A4 VARAG'I MATEMATIK GEOMETRIYA */
          .print-page {
            width: 210mm;
            height: 297mm;
            position: relative;
            background-color: #ffffff !important;
            page-break-after: always;
            break-after: page;
            box-sizing: border-box;
          }

          /* 🆕 69x111MM ICHKI KARTA O'LCHAMI */
          .badge-card, .empty-badge-slot {
            width: 69mm;
            height: 111mm;
            position: absolute;
            box-sizing: border-box;
          }

          .badge-card {
            background: white !important;
            display: flex;
            flex-direction: column;
            align-items: center;
            overflow: hidden;
            outline: 1px dashed #cbd5e1 !important; /* Kesish chizig'i */
          }

          /* 🔥 IKKALA TOMON BIR XIL TUSHISHI UCHUN ANIQ KOORDINATALAR */
          /* Eni: 69+4+69 = 142mm. Chetidan: (210-142)/2 = 34mm margin */
          /* Bo'yi: 111+5+111 = 227mm. Tepadan: (297-227)/2 = 35mm margin */
          .slot-0 { top: 35mm; left: 34mm; }
          .slot-1 { top: 35mm; left: 107mm; }  /* 34 + 69 + 4 = 107mm */
          .slot-2 { top: 151mm; left: 34mm; }  /* 35 + 111 + 5 = 151mm */
          .slot-3 { top: 151mm; left: 107mm; }

          /* Front Side dizayni */
          .front-side { justify-content: space-between; }
          
          .header-section {
            width: 100%;
            background-color: #1e3a8a !important; 
            padding: 6mm 0;
            text-align: center;
          }
          .header-title {
            color: #ffffff !important;
            font-size: 11px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .header-sub {
            color: #93c5fd !important;
            font-size: 7px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 2px;
          }
          .qr-container {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
          }
          .qr-box { padding: 4px; background: #fff !important; }
          .qr-box svg { width: 44mm !important; height: 44mm !important; }
          
          .student-details { width: 100%; text-align: center; padding-bottom: 6mm; }
          .st-name {
            font-size: 15px;
            font-weight: 800;
            color: #1e293b !important;
            text-transform: uppercase;
            line-height: 1.1;
            margin-bottom: 3px;
          }
          .st-group { font-size: 10px; color: #4f46e5 !important; font-weight: 700; }

          /* 🔥 LOGOTIPNI MAKSIMAL KATTALASHTIRISH (ORQA TOMON) */
          .logo-wrapper {
            width: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            flex: 1;
            padding-top: 10mm;
            padding-bottom: 12mm;
          }
          .logo-img {
            width: 60mm; /* 69mm dan 60mm logotipga berildi - Maksimal yirik */
            height: 60mm;
            object-fit: contain;
          }
          .footer-strip {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            background: #1e3a8a !important;
            color: #fff !important;
            font-size: 8px;
            font-weight: 800;
            text-align: center;
            padding: 6px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
        }
      `}</style>
    </div>
  );
}