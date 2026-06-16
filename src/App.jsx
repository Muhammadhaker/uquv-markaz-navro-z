import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Groups from "./pages/Groups";
import Attendance from "./pages/Attendance";
import Admins from "./pages/Admins";
import BotRegister from "./pages/BotRegister"; // <-- SHU QO'SHILDI
import Layout from "./components/Layout";

// Himoyalangan marshrut (Layout bilan o'ralgan)
const ProtectedRoute = ({ children, allowedRoles }) => {
  const role = localStorage.getItem("userRole");

  if (!role) return <Navigate to="/login" replace />;
  // Agar foydalanuvchi roli ruxsat etilgan ro'llar ichida bo'lmasa
  if (allowedRoles && !allowedRoles.includes(role))
    return <Navigate to="/groups" replace />;

  return <Layout>{children}</Layout>;
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* TELEGRAM BOT ANKETASI (Parolsiz, Menyusiz butun ekranda ochiladi) */}
        <Route path="/bot-register" element={<BotRegister />} />

        {/* Faqat Super Admin uchun */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={["super_admin"]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admins"
          element={
            <ProtectedRoute allowedRoles={["super_admin"]}>
              <Admins />
            </ProtectedRoute>
          }
        />

        {/* Barcha adminlar uchun */}
        <Route
          path="/groups"
          element={
            <ProtectedRoute allowedRoles={["super_admin", "admin"]}>
              <Groups />
            </ProtectedRoute>
          }
        />

        <Route
          path="/attendance"
          element={
            <ProtectedRoute allowedRoles={["super_admin", "admin"]}>
              <Attendance />
            </ProtectedRoute>
          }
        />

        {/* Asosiy sahifa yo'naltiruvi */}
        <Route path="/" element={<Navigate to="/groups" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}
