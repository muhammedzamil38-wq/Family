import React, { useEffect } from 'react';
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
import { DEFAULT_FONT_SETTINGS, getFontOption } from './data/fontOptions';

function SiteTypography() {
  const API_BASE_URL = (import.meta.env.API_BASE_URL || 'http://localhost:5000').replace(/\/+$/, '');

  useEffect(() => {
    let isMounted = true;

    async function loadTypography() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/public/site-content`);
        if (!response.ok) return;
        const data = await response.json();
        if (!isMounted) return;

        const settings = { ...DEFAULT_FONT_SETTINGS, ...(data.settings || {}) };
        const heading = getFontOption(settings.headingFont) || getFontOption(DEFAULT_FONT_SETTINGS.headingFont);
        const body = getFontOption(settings.bodyFont) || getFontOption(DEFAULT_FONT_SETTINGS.bodyFont);
        document.documentElement.style.setProperty('--font-heading', `'${heading.family}', Georgia, serif`);
        document.documentElement.style.setProperty('--font-body', `'${body.family}', system-ui, sans-serif`);

        const googleFonts = [heading, body]
          .filter((font) => font?.source === 'google')
          .map((font) => font.family)
          .filter((family, index, families) => families.indexOf(family) === index);
        if (googleFonts.length > 0 && !document.getElementById('site-google-fonts')) {
          const link = document.createElement('link');
          link.id = 'site-google-fonts';
          link.rel = 'stylesheet';
          link.href = `https://fonts.googleapis.com/css2?${googleFonts.map((font) => `family=${encodeURIComponent(font)}:wght@400;500;600;700`).join('&')}&display=swap`;
          document.head.appendChild(link);
        }
      } catch (error) {
        console.error('Error loading site typography:', error);
      }
    }

    loadTypography();
    return () => { isMounted = false; };
  }, [API_BASE_URL]);

  return null;
}

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
        <SiteTypography />
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
