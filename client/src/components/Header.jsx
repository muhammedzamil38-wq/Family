import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Sun, Moon, LogIn, LayoutDashboard } from 'lucide-react';

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const location = useLocation();

  // Scroll handler for smooth anchoring back to the Home page sections
  const handleScrollToSection = (sectionId) => {
    if (location.pathname !== '/') {
      // If we are not on the home page, redirect home first with the hash
      window.location.href = `/#${sectionId}`;
      return;
    }
    
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const appName = import.meta.env.APP_NAME || 'Family Heritage';

  return (
    <header className="glass-header">
      <div className="header-container">
        <Link to="/" className="site-logo">
          {appName}
        </Link>

        <nav className="nav-links">
          <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
            Home
          </Link>
          <Link to="/gallery" className={`nav-link ${location.pathname.startsWith('/gallery') ? 'active' : ''}`}>
            Gallery
          </Link>
          <Link to="/family" className={`nav-link ${location.pathname === '/family' ? 'active' : ''}`}>
            Family Tree
          </Link>
          <a
            href="#about"
            onClick={(e) => {
              e.preventDefault();
              handleScrollToSection('about');
            }}
            className="nav-link"
          >
            About Us
          </a>
        </nav>

        <div className="header-actions">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="icon-btn theme-toggle"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          {/* Admin Dashboard / Login shortcut */}
          {user ? (
            <Link to="/admin" className="icon-btn admin-link active" title="Admin Dashboard">
              <LayoutDashboard size={20} />
            </Link>
          ) : (
            <Link to="/admin/login" className="icon-btn admin-link" title="Admin Login">
              <LogIn size={20} />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
