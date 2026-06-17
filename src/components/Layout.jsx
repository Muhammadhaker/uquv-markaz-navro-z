import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function Layout({ children }) {
  // Yon menyu ochiq yoki yopiqligini saqlovchi state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Barmoq bilan surishni hisoblash uchun state'lar
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  // Qancha masofaga surilganda ishlashi kerakligi (50px yetarli)
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEndEvent = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isRightSwipe) {
      setIsSidebarOpen(true); // Chapdan o'ngga surilganda menyuni ochish
    }
    if (isLeftSwipe) {
      setIsSidebarOpen(false); // O'ngdan chapga surilganda menyuni yopish
    }
  };

  return (
    <div 
      className="flex min-h-screen bg-slate-50 relative"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEndEvent}
    >
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