import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, ArrowLeft, RefreshCw, Loader2, AlertCircle, Clock } from 'lucide-react';

export default function OtpVerification({ email, onVerify, onResend, onBack }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [resendCooldown, setResendCooldown] = useState(30); // 30s cooldown for resend button

  const inputRefs = useRef([]);

  // Focus the first input box on load
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Expiry countdown timer (5 minutes)
  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleInputChange = (index, value) => {
    // Only accept single numeric characters
    const cleanVal = value.replace(/[^0-9]/g, '');
    
    if (cleanVal.length > 1) {
      // User pasted multiple characters
      handlePaste(cleanVal);
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = cleanVal;
    setDigits(newDigits);
    setError('');

    // Auto move to next input
    if (cleanVal && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // If all 6 digits are filled, automatically trigger verification
    if (cleanVal && index === 5 && newDigits.every(d => d !== '')) {
      handleCompleteSubmit(newDigits.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      // Move to previous box on backspace if current is empty
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (pastedText) => {
    const cleanNumbers = pastedText.replace(/[^0-9]/g, '').slice(0, 6);
    if (!cleanNumbers) return;

    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = cleanNumbers[i] || '';
    }
    setDigits(newDigits);
    setError('');

    const lastIndex = Math.min(cleanNumbers.length, 5);
    inputRefs.current[lastIndex]?.focus();

    if (cleanNumbers.length === 6) {
      handleCompleteSubmit(cleanNumbers);
    }
  };

  const handleCompleteSubmit = async (fullCode) => {
    const codeToVerify = fullCode || digits.join('');
    if (codeToVerify.length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    if (timeLeft <= 0) {
      setError('The code has expired. Please click "Resend Code" below.');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      const result = await onVerify(email, codeToVerify);
      if (!result.success) {
        setError(result.errors?.[0] || result.message || 'Verification failed.');
      }
    } catch (err) {
      setError('Network error during verification. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendClick = async () => {
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    setError('');
    setResendSuccess('');

    try {
      const res = await onResend(email);
      if (res.success) {
        setResendSuccess('New verification code sent to your email.');
        setTimeLeft(300); // Reset expiry to 5 min
        setResendCooldown(30); // 30 sec cooldown
        setDigits(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        setError(res.errors?.[0] || res.message || 'Failed to resend code.');
      }
    } catch (err) {
      setError('Failed to resend verification code.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="otp-container">
      <div className="login-header">
        <div className="login-icon-bg">
          <ShieldCheck size={28} className="login-icon" />
        </div>
        <h2>Two-Step Verification</h2>
        <p>A 6-digit passcode has been sent to your email.</p>
      </div>

      <div className="otp-info-banner">
        <span>Sent to:</span>
        <span className="otp-email-highlight">{email}</span>
      </div>

      {error && (
        <div className="login-errors-box">
          <AlertCircle size={18} className="error-icon" />
          <div className="errors-list">
            <p>{error}</p>
          </div>
        </div>
      )}

      {resendSuccess && (
        <div style={{
          background: 'rgba(34, 197, 94, 0.15)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          color: '#15803d',
          borderRadius: '8px',
          padding: '10px 14px',
          fontSize: '0.85rem'
        }}>
          {resendSuccess}
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); handleCompleteSubmit(); }}>
        <div className="otp-inputs-wrapper" onPaste={(e) => {
          e.preventDefault();
          handlePaste(e.clipboardData.getData('text'));
        }}>
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleInputChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="otp-box-input"
              disabled={isVerifying}
              autoComplete="off"
            />
          ))}
        </div>

        <div className="otp-meta-row">
          <span className="otp-timer">
            <Clock size={14} />
            {timeLeft > 0 ? (
              <span>Expires in {formatTime(timeLeft)}</span>
            ) : (
              <span style={{ color: 'var(--danger)' }}>Code Expired</span>
            )}
          </span>

          <button
            type="button"
            className="otp-resend-btn"
            onClick={handleResendClick}
            disabled={resendCooldown > 0 || isResending}
          >
            {isResending ? (
              <Loader2 size={12} className="animate-spin inline" />
            ) : resendCooldown > 0 ? (
              `Resend code (${resendCooldown}s)`
            ) : (
              'Resend code'
            )}
          </button>
        </div>

        <button
          type="submit"
          className="btn btn-primary login-submit-btn"
          disabled={isVerifying || digits.some(d => d === '')}
        >
          {isVerifying ? (
            <>
              <Loader2 size={16} className="spinner-icon animate-spin" /> Verifying Code...
            </>
          ) : (
            'Verify & Sign In'
          )}
        </button>

        <button
          type="button"
          className="otp-back-btn"
          onClick={onBack}
          disabled={isVerifying}
          style={{ width: '100%' }}
        >
          <ArrowLeft size={16} /> Back to Sign In
        </button>
      </form>
    </div>
  );
}
