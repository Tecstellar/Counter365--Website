import React, { Component, ErrorInfo, ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './screens/landing/LandingPage';
import { LoginScreen } from './screens/LoginScreen';
import { RegisterScreen } from './screens/RegisterScreen';
import { DashboardApp } from './screens/dashboard/DashboardApp';
import { PublicInvoiceScreen } from './screens/public/PublicInvoiceScreen';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Counter365 App caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f5f3ef', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ background: '#ffffff', borderRadius: 24, padding: 32, maxWidth: 440, width: '100%', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fff3ea', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/counter365_icon.png" alt="Counter 365" style={{ width: 34, height: 34, objectFit: 'contain' }} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1c1917', margin: '0 0 8px' }}>
              Dashboard Reconnecting
            </h2>
            <p style={{ fontSize: 13, color: '#78716c', margin: '0 0 24px', lineHeight: 1.5 }}>
              Tap below to reload and resume your active counter register session.
            </p>
            <button
              onClick={() => {
                window.location.reload();
              }}
              style={{
                background: '#ff5f00',
                color: '#ffffff',
                border: 'none',
                borderRadius: 99,
                padding: '12px 28px',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(255, 95, 0, 0.35)',
              }}
            >
              Reload Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* 1. Public Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* 2. Authentication: QR Code & Mobile OTP Login */}
          <Route path="/login" element={<LoginScreen />} />

          {/* 3. Registration: Exact Android Onboarding & Shop Creation */}
          <Route path="/register" element={<RegisterScreen />} />

          {/* 4. Authenticated POS Application Dashboard */}
          <Route path="/dashboard/*" element={<DashboardApp />} />

          {/* 5. Public WhatsApp E-Receipt & PDF Invoice View (Matches Template Exactly) */}
          <Route path="/b/:billId" element={<PublicInvoiceScreen />} />
          <Route path="/invoice/:billId" element={<PublicInvoiceScreen />} />
          <Route path="/receipt/:billId" element={<PublicInvoiceScreen />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
};
