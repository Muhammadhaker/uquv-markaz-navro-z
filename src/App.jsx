import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Groups from "./pages/Groups";
import Attendance from "./pages/Attendance";
import Admins from "./pages/Admins";
import BotRegister from "./pages/BotRegister";
import ActivityLogs from "./pages/ActivityLogs";
import Layout from "./components/Layout";
import Profile from './pages/Profile';
import PrintBadges from './pages/PrintBadges'; // 🔥 Bejiklar sahifasini import qildik

const ProtectedRoute = ({ children, allowedRoles }) => {
  const role = localStorage.getItem("userRole");

  if (!role) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to="/groups" replace />;

  return <Layout>{children}</Layout>;
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/bot-register" element={<BotRegister />} />

        <Route path="/dashboard" element={<ProtectedRoute allowedRoles={["super_admin"]}><Dashboard /></ProtectedRoute>} />
        <Route path="/admins" element={<ProtectedRoute allowedRoles={["super_admin"]}><Admins /></ProtectedRoute>} />
        <Route path="/logs" element={<ProtectedRoute allowedRoles={["super_admin"]}><ActivityLogs /></ProtectedRoute>} />

        <Route path="/profile" element={<Profile />} />

        <Route path="/groups" element={<ProtectedRoute allowedRoles={["super_admin", "admin"]}><Groups /></ProtectedRoute>} />
        <Route path="/attendance" element={<ProtectedRoute allowedRoles={["super_admin", "admin"]}><Attendance /></ProtectedRoute>} />

        {/* 🔥 YANGI: Printer sahifasi */}
        <Route path="/badges" element={<ProtectedRoute allowedRoles={["super_admin", "admin"]}><PrintBadges /></ProtectedRoute>} />

        <Route path="/" element={<Navigate to="/groups" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}