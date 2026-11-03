import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './screens/landing/LandingPage';
import { LoginScreen } from './screens/LoginScreen';
import { RegisterScreen } from './screens/RegisterScreen';
import { DashboardApp } from './screens/dashboard/DashboardApp';
import { PublicInvoiceScreen } from './screens/public/PublicInvoiceScreen';

export const App: React.FC = () => {
  return (
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
  );
};
