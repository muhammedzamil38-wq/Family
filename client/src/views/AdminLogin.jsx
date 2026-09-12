import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, KeyRound, Mail, Loader2 } from 'lucide-react';
import OtpVerification from './OtpVerification';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState('credentials'); // 'credentials' | 'otp'

  const { user, requestOtp, verifyOtp, resendOtp, loading } = useAuth();
  const navigate = useNavigate();

  // If already logged in, redirect straight to admin panel
  useEffect(() => {
    if (!loading && user) {
      navigate('/admin');
    }
  }, [user, loading, navigate]);

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);
    
    if (!email || !password) {
      setErrors(['Please enter both your email address and password.']);
      return;
    }

    setIsSubmitting(true);
    const result = await requestOtp(email, password);
    setIsSubmitting(false);

    if (result.success && result.requiresOtp) {
      setStep('otp');
    } else if (result.success && !result.requiresOtp) {
      // Legacy fallback
      navigate('/admin');
    } else {
      setErrors(result.errors || [result.message || 'Authentication failed.']);
    }
  };

  const handleVerifyOtp = async (targetEmail, code) => {
    const result = await verifyOtp(targetEmail, code);
    if (result.success) {
      navigate('/admin');
    }
    return result;
  };

  const handleResendOtp = async (targetEmail) => {
    const result = await resendOtp(targetEmail);
    return result;
  };

  const handleBackToCredentials = () => {
    setStep('credentials');
    setErrors([]);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Verifying session state...</p>
      </div>
    );
  }

  return (
    <div className="login-view container">
      <div className="login-card-wrapper">
        <div className="glass-card login-card">
          {step === 'credentials' ? (
            <>
              <div className="login-header">
                <div className="login-icon-bg">
                  <KeyRound size={28} className="login-icon" />
                </div>
                <h2>Archive Administration</h2>
                <p>Enter your credentials to manage books, tree members, and narratives.</p>
              </div>

              {errors.length > 0 && (
                <div className="login-errors-box">
                  <ShieldAlert size={18} className="error-icon" />
                  <div className="errors-list">
                    {errors.map((err, i) => (
                      <p key={i}>{err}</p>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleCredentialsSubmit} className="login-form">
                <div className="form-group">
                  <label className="form-label" htmlFor="email-input">
                    Administrator Email <span className="required-star">*</span>
                  </label>
                  <div className="input-with-icon">
                    <Mail size={16} className="field-icon" />
                    <input
                      id="email-input"
                      type="email"
                      className="glass-input has-icon"
                      placeholder="admin@family.local"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="password-input">
                    Password <span className="required-star">*</span>
                  </label>
                  <div className="input-with-icon">
                    <KeyRound size={16} className="field-icon" />
                    <input
                      id="password-input"
                      type="password"
                      className="glass-input has-icon"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary login-submit-btn" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="spinner-icon animate-spin" /> Verifying Credentials...
                    </>
                  ) : (
                    'Continue with Two-Step Verification'
                  )}
                </button>
              </form>
            </>
          ) : (
            <OtpVerification
              email={email}
              onVerify={handleVerifyOtp}
              onResend={handleResendOtp}
              onBack={handleBackToCredentials}
            />
          )}
        </div>
      </div>
    </div>
  );
}
