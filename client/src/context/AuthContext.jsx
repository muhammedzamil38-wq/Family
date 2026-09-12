import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_BASE_URL =
    import.meta.env.API_BASE_URL || "http://localhost:5000";

  // Verify session on application startup
  const checkAuthStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Session verification check failed:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Step 1: Request OTP code with email and password
  const requestOtp = async (email, password) => {
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/request-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          requiresOtp: true,
          email: data.email,
          expiresInMinutes: data.expiresInMinutes || 5,
          message: data.message
        };
      }

      return {
        success: false,
        message: data.message || "Authentication failed",
        errors: data.errors || ["Invalid email or password."],
      };
    } catch (error) {
      console.error("Request OTP failed:", error);
      return {
        success: false,
        message: "Network error",
        errors: ["Unable to connect to the authentication server."],
      };
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify 6-digit OTP code to complete login
  const verifyOtp = async (email, code) => {
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, code }),
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        return {
          success: true,
          user: data.user,
          message: data.message
        };
      }

      return {
        success: false,
        message: data.message || "Verification failed",
        errors: data.errors || ["Invalid verification code."],
      };
    } catch (error) {
      console.error("Verify OTP failed:", error);
      return {
        success: false,
        message: "Network error",
        errors: ["Unable to connect to the authentication server."],
      };
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP code
  const resendOtp = async (email) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/resend-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          message: data.message,
          expiresInMinutes: data.expiresInMinutes || 5
        };
      }

      return {
        success: false,
        message: data.message || "Failed to resend code",
        errors: data.errors || ["Failed to resend verification code."],
      };
    } catch (error) {
      console.error("Resend OTP failed:", error);
      return {
        success: false,
        message: "Network error",
        errors: ["Unable to connect to the authentication server."],
      };
    }
  };

  const logoutUser = async () => {
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (response.ok) {
        setUser(null);
        return { success: true };
      }
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      setLoading(false);
    }

    return { success: false };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        requestOtp,
        loginUser: requestOtp, // Alias for backward compatibility
        verifyOtp,
        resendOtp,
        logoutUser,
        checkAuthStatus
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}