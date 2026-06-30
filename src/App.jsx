import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
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

// 🛡️ ESKI XOTIRANI XAVFSIZ TOZALASH (Cheksiz yuklanish (Infinite loop) dan mutlaqo himoyalangan)
if (typeof window !== "undefined") {
  const currentRole = localStorage.getItem("userRole");
  if (currentRole === "admin") {
    localStorage.removeItem("userId");
    localStorage.removeItem("userRole");
    localStorage.removeItem("username");
    localStorage.removeItem("userFullName");
    localStorage.removeItem("userPermissions");
    localStorage.removeItem("parentTeacherId");
    window.location.replace("/"); // window.location.href o'rniga replace cheksiz tarix yaratmaydi
  }
}

const ProtectedRoute = () => {
  const role = localStorage.getItem("userRole");
  if (!role) return <Navigate to="/" replace />;
  
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

        {/* 🔒 YOPIQ SAHIFALAR */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/badges" element={<PrintBadges />} />
          <Route path="/admins" element={<Admins />} />
          <Route path="/logs" element={<ActivityLogs />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}