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
          <Link to={'https://www.freeprivacypolicy.com/live/de98cf1c-0913-49e9-bb5b-5b766a185ece'} target="_blank" rel="noreferrer" className="footer-link">
            Privacy Policy
          </Link>
          <span className="divider">•</span>
          <Link to="/contact" className="footer-link">Contact</Link>
        </div>
      </div>
    </footer>
  );
}
