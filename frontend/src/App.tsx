import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Auth } from './pages/Auth';
import { Sidebar } from './components/Sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import { authService } from './services/authService';

// Placeholder pages for integration
const Dashboard = () => <div className="p-8"><h2 className="text-3xl font-bold">Dashboard</h2></div>;
const BookAppointment = () => <div className="p-8"><h2 className="text-3xl font-bold">Book Appointment</h2></div>;
const MyAppointments = () => <div className="p-8"><h2 className="text-3xl font-bold">My Appointments</h2></div>;

const Layout = ({ children }: { children: React.ReactNode }) => (
  <div className="flex bg-[#0f172a] min-h-screen text-slate-200 overflow-hidden">
    <Sidebar />
    <main className="flex-1 overflow-y-auto h-screen custom-scrollbar">
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </main>
  </div>
);

function App() {
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        // We use fetchUser or similar to check if cookies are valid
        // For now, let's assume if the request fails, user is not authenticated
        await authService.getProfile();
        setIsAuthenticated(true);
      } catch (err) {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  if (isAuthenticated === null) {
    return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
    </div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/auth" element={!isAuthenticated ? <Auth /> : <Navigate to="/" />} />
        
        <Route path="/" element={
          isAuthenticated ? (
            <Layout><Dashboard /></Layout>
          ) : (
            <Navigate to="/auth" />
          )
        } />

        <Route path="/book" element={
          isAuthenticated ? (
            <Layout><BookAppointment /></Layout>
          ) : (
            <Navigate to="/auth" />
          )
        } />

        <Route path="/appointments" element={
          isAuthenticated ? (
            <Layout><MyAppointments /></Layout>
          ) : (
            <Navigate to="/auth" />
          )
        } />
      </Routes>
    </Router>
  );
}

export default App;
