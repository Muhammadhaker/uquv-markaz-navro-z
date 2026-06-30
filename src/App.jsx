import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
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

// 🔥 Himoyalangan marshrut (Faqat tizimga kirganlar uchun ruxsat)
const ProtectedRoute = ({ children }) => {
  const role = localStorage.getItem("userRole");
  if (!role) return <Navigate to="/" replace />;
  return children;
};

export default function App() {
  const role = localStorage.getItem("userRole");

  return (
    <Router>
      <Routes>
        {/* 🔓 OCHIQ SAHIFALAR (Bot va Login uchun) */}
        <Route 
          path="/" 
          element={
            !role ? <Login /> : <Navigate to={role === "assistant" ? "/attendance" : "/groups"} replace />
          } 
        />
        <Route path="/bot-register" element={<BotRegister />} />
        <Route path="/profile" element={<Profile />} />

        {/* 🔒 YOPIQ SAHIFALAR (Faqat tizimga kirgan xodimlar uchun) */}
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
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