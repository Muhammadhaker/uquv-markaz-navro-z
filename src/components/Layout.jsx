import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function Layout({ children }) {
  // Yon menyu ochiq yoki yopiqligini saqlovchi state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // TUZATISH: barmoq bilan surish (swipe) logikasi avval BU YERDA ham,
  // Sidebar.jsx'da ham mustaqil yozilgan edi — ikkalasi bir vaqtda ishga
  // tushib, kutilmagan holatga olib kelishi mumkin edi. Sidebar.jsx'dagi
  // versiya yaxshiroq (vertikal skrolldan gorizontal svaypni farqlaydi va
  // butun hujjat bo'ylab ishlaydi), shuning uchun shu yerdagi nusxa olib
  // tashlandi — endi yagona manba Sidebar.jsx.

  return (
    <div className="flex min-h-screen bg-slate-50 relative">
      {/* State'larni Sidebar va Header'ga ulashimiz kerak */}
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Header setIsOpen={setIsSidebarOpen} />
        <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}