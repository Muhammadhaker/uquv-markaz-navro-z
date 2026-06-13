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
import Layout from "./components/Layout";
import Admins from "./pages/Admins";
// Himoyalangan va Layout bilan o'ralgan marshrut
const ProtectedRoute = ({ children, allowedRoles }) => {
  const role = localStorage.getItem("userRole");

  if (!role) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(role)) return <Navigate to="/groups" replace />;

  return <Layout>{children}</Layout>;
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Faqat Bosh Admin uchun Dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={["super_admin"]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Barcha adminlar ko'ra oladigan sahifalar */}
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
        <Route path="/admins" element={<Admins />} />
        {/* Asosiy sahifaga kirganda Login yoki kerakli joyga yo'naltirish */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}
