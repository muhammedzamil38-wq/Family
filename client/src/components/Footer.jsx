import React from 'react';
import { Link } from 'react-router-dom';

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
          <a href="/assets/privacy-policy.txt" target="_blank" rel="noreferrer" className="footer-link">
            Privacy Policy
          </a>
          <span className="divider">•</span>
          <Link to="/contact" className="footer-link">Contact</Link>
        </div>
      </div>
    </footer>
  );
}
