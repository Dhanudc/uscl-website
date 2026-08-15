import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { SiteSettingsProvider } from "./context/SiteSettingsContext";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import About from "./pages/About";
import Wesley from "./pages/Wesley";
import Franchises from "./pages/Franchises";
import Franchise from "./pages/Franchise";
import Sponsorship from "./pages/Sponsorship";
import Media from "./pages/Media";
import LiveUpdates from "./pages/LiveUpdates";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

function ApprovedOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <section className="px-4 py-20 text-center text-[color:var(--text-muted)]">Loading...</section>;
  if (!user) return <Navigate to="/register" replace />;
  if (user.role === "admin") return <Navigate to="/admin" replace />;
  return children;
}

function SignedInOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <section className="px-4 py-20 text-center text-[color:var(--text-muted)]">Loading...</section>;
  if (!user) return <Navigate to="/signin" replace state={{ from: "/sponsorship" }} />;
  return children;
}

function PublicShell({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-ink text-[color:var(--text)]">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

function AppRoutes() {
  const location = useLocation();
  const isAdminArea = location.pathname.startsWith("/admin");

  if (isAdminArea) {
    return (
      <Routes>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/*" element={<Admin />} />
      </Routes>
    );
  }

  return (
    <PublicShell>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/wesley" element={<Wesley />} />
        <Route path="/franchises" element={<Franchises />} />
        <Route path="/franchise" element={<Franchise />} />
        <Route
          path="/sponsorship"
          element={
            <SignedInOnly>
              <Sponsorship />
            </SignedInOnly>
          }
        />
        <Route path="/media" element={<Media />} />
        <Route path="/live" element={<LiveUpdates />} />
        <Route path="/signup" element={<Navigate to="/register" replace />} />
        <Route path="/signin" element={<Login />} />
        <Route path="/register-account" element={<Navigate to="/register" replace />} />
        <Route path="/login" element={<Navigate to="/signin" replace />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/pending" element={<Navigate to="/register" replace />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <ApprovedOnly>
              <Dashboard />
            </ApprovedOnly>
          }
        />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </PublicShell>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SiteSettingsProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </SiteSettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
