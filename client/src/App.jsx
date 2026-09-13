import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Layouts
import Header from './components/Header';
import Footer from './components/Footer';

// Views
import Home from './views/Home';
import Collection from './views/Collection';
import Family from './views/Family';
import AdminLogin from './views/AdminLogin';
import AdminPanel from './views/AdminPanel';
import Gallery from './views/Gallery';
import Contact from './views/Contact';

// Public Layout Wrapper Component
function PublicLayout({ children }) {
  return (
    <div className="public-layout-wrapper">
      <Header />
      <main className="main-content">
        {children}
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Archive Routes */}
            <Route 
              path="/" 
              element={
                <PublicLayout>
                  <Home />
                </PublicLayout>
              } 
            />
            
            {/* Redirect /collection to /gallery */}
            <Route path="/collection" element={<Navigate to="/gallery" replace />} />
            <Route path="/collection/*" element={<Navigate to="/gallery" replace />} />

            <Route 
              path="/gallery" 
              element={
                <PublicLayout>
                  <Gallery />
                </PublicLayout>
              } 
            />
            
            <Route 
              path="/family" 
              element={
                <PublicLayout>
                  <Family />
                </PublicLayout>
              } 
            />

            <Route
              path="/contact"
              element={
                <PublicLayout>
                  <Contact />
                </PublicLayout>
              }
            />

            {/* Admin Management System Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminPanel />} />

            {/* Fallback to Home */}
            <Route 
              path="*" 
              element={
                <PublicLayout>
                  <Home />
                </PublicLayout>
              } 
            />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
