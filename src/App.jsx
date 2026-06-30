import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom"; // 🔥 Outlet qo'shildi
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Groups from "./pages/Groups";
import Attendance from "./pages/Attendance";
import PrintBadges from "./pages/PrintBadges";
import Admins from "./pages/Admins";
import ActivityLogs from "./pages/ActivityLogs";
import BotRegister from "./pages/BotRegister";
import Profile from "./pages/Profile";

// 🔥 ESKI XOTIRANI XAVFSIZ TOZALASH
if (typeof window !== "undefined") {
  const currentRole = localStorage.getItem("userRole");
  if (currentRole === "admin") {
    localStorage.clear();
    window.location.href = "/";
  }
}

// 🛡️ HIMOYA VA LAYOUT BOG'LANISHI
const ProtectedRoute = () => {
  const role = localStorage.getItem("userRole");
  if (!role) return <Navigate to="/" replace />;
  
  // 🔥 MANA SIR QAYERDA: Layout ichiga Outlet beriladi, 
  // shunda u Layout.jsx dagi {children} ning o'rniga borib tushadi!
  return (
    <Layout>
      <Outlet /> 
    </Layout>
  );
};

export default function App() {
  const role = localStorage.getItem("userRole");

  return (
    <Router>
      <Routes>
        {/* 🔓 OCHIQ SAHIFALAR */}
        <Route 
          path="/" 
          element={
            !role ? <Login /> : <Navigate to={role === "assistant" ? "/attendance" : "/groups"} replace />
          } 
        />
        <Route path="/bot-register" element={<BotRegister />} />
        <Route path="/profile" element={<Profile />} />

        {/* 🔒 YOPIQ SAHIFALAR (Barchasi ProtectedRoute orqali o'tadi) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/badges" element={<PrintBadges />} />
          <Route path="/admins" element={<Admins />} />
          <Route path="/logs" element={<ActivityLogs />} />
        </Route>

        {/* Noto'g'ri manzil yozilsa, avtomat bosh sahifaga qaytaradi */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}