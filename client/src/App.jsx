import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { isAuthenticated, getUser } from "./utils/api";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import StudentDashboard from "./pages/StudentDashboard";
import WardenDashboard from "./pages/WardenDashboard";

function ProtectedRoute({ children, requiredRole }) {
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  const user = getUser();
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AuthRedirect() {
  if (isAuthenticated()) {
    const user = getUser();
    if (user?.role === "warden") {
      return <Navigate to="/warden/dashboard" replace />;
    }
    return <Navigate to="/student/dashboard" replace />;
  }
  return <Login />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AuthRedirect />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/student/dashboard"
          element={
            <ProtectedRoute requiredRole="student">
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/warden/dashboard"
          element={
            <ProtectedRoute requiredRole="warden">
              <WardenDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
