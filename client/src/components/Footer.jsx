import React from 'react';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const appName = import.meta.env.APP_NAME || 'Family Heritage';

  return (
    <footer className="glass-footer">
      <div className="footer-container">
        <p className="copyright">
          &copy; {currentYear} <strong>{appName}</strong>. All rights reserved.
        </p>
        <div className="footer-links">
          <a href="#privacy" className="footer-link">Privacy Policy</a>
          <span className="divider">•</span>
          <a href="#contact" className="footer-link">Contact Admin</a>
        </div>
      </div>
    </footer>
  );
}
