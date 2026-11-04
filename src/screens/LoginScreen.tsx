import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext';
import { useShop } from '../context/ShopContext';
import { qrPairingService, QrPairingSession } from '../services/qrPairingService';
import { DEMO_REVIEW_PHONE, DEMO_REVIEW_OTP } from '../services/twoFactorService';

export const LoginScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { sendOtp, verifyOtp, setSessionDirect, profile } = useAuth();
  const { shop, setShopDirect, refreshSubscription } = useShop();

  // Redirect if already logged in with active shop
  useEffect(() => {
    if (profile && shop && shop.id) {
      navigate('/dashboard', { replace: true });
    }
  }, [profile, shop, navigate]);

  // Tabs: 0 = QR pairing, 1 = Mobile OTP
  const [activeTab, setActiveTab] = useState<0 | 1>(searchParams.get('phone') ? 1 : 0);

  // Phone & OTP states
  const [phone, setPhone] = useState(searchParams.get('phone') || '');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isTermsAgreed, setIsTermsAgreed] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [msg, setMsg] = useState<string>('');
  const [isError, setIsError] = useState(false);
  const [isUnregisteredNumber, setIsUnregisteredNumber] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // QR Session states
  const [qrSession, setQrSession] = useState<QrPairingSession | null>(null);
  const [qrProgress, setQrProgress] = useState(1);
  const [isQrSwapping, setIsQrSwapping] = useState(false);
  const sessionStartTimeRef = useRef<number>(Date.now());
  const QR_LIFETIME_MS = 60000;

  // Initialize or refresh QR session
  const initQrSession = () => {
    setIsQrSwapping(true);
    const session = qrPairingService.createPairingSession();
    setQrSession(session);
    sessionStartTimeRef.current = Date.now();
    setQrProgress(1);
    setMsg('');
    setTimeout(() => setIsQrSwapping(false), 500);
  };

  useEffect(() => {
    if (activeTab === 0) {
      initQrSession();
    }
  }, [activeTab]);

  // QR lifetime progress bar (60s countdown)
  useEffect(() => {
    if (activeTab !== 0) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - sessionStartTimeRef.current;
      const remainingRatio = Math.max(0, 1 - elapsed / QR_LIFETIME_MS);
      setQrProgress(remainingRatio);

      if (remainingRatio <= 0) {
        initQrSession();
      }
    }, 150);

    return () => clearInterval(interval);
  }, [activeTab]);

  // Subscribe to QR pairing confirmation via Supabase Realtime
  useEffect(() => {
    if (!qrSession || activeTab !== 0) return;

    const cleanup = qrPairingService.subscribeToPairing(
      qrSession,
      async (approvalData) => {
        setIsLoading(true);
        setMsg('Mobile pairing confirmed! Logging you in…');
        setIsError(false);
        await setSessionDirect(approvalData.profile, approvalData.shop, approvalData.member);
        setShopDirect(approvalData.shop);
        await refreshSubscription();
        setIsLoading(false);
        navigate('/dashboard', { replace: true });
      },
      (err) => {
        setMsg(err || 'Pairing error. Please refresh.');
        setIsError(true);
      }
    );

    return () => {
      cleanup();
    };
  }, [qrSession, activeTab, navigate, setSessionDirect, refreshSubscription]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Send OTP
  const handleSendOtp = async (targetPhone?: string) => {
    const rawNumber = (targetPhone || phone).replace(/\D/g, '');
    if (rawNumber.length !== 10) {
      setMsg('Enter a valid 10-digit mobile number.');
      setIsError(true);
      return;
    }

    setMsg('');
    setIsError(false);
    setIsLoading(true);

    const res = await sendOtp(rawNumber);
    setIsLoading(false);

    if (res.success) {
      setIsOtpSent(true);
      setResendCooldown(30);
      if (rawNumber === DEMO_REVIEW_PHONE) {
        setMsg(`Demo OTP code: ${DEMO_REVIEW_OTP}`);
      } else {
        setMsg(`Code sent to +91 ${rawNumber}.`);
      }
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    } else {
      setMsg(res.error || 'Failed to send OTP. Please retry.');
      setIsError(true);
    }
  };

  // Verify OTP
  const handleVerifyOtp = async () => {
    const code = otpDigits.join('');
    if (code.length < 6) {
      setMsg('Enter all 6 digits.');
      setIsError(true);
      return;
    }

    setMsg('Verifying code…');
    setIsError(false);
    setIsLoading(true);

    const res = await verifyOtp(phone, code);
    setIsLoading(false);

    if (res.success) {
      if (res.isExistingShop && res.shop) {
        setShopDirect(res.shop);
        setMsg('Verified! Opening your dashboard…');
        await refreshSubscription();
        setTimeout(() => navigate('/dashboard', { replace: true }), 300);
      } else {
        setIsUnregisteredNumber(true);
        setMsg('Number verified, but not registered with any shop yet.');
        setIsError(true);
      }
    } else {
      setMsg(res.error || 'Invalid OTP code. Please retry.');
      setIsError(true);
    }
  };

  // OTP digit typing handler
  const handleDigitChange = (index: number, val: string) => {
    const char = val.replace(/\D/g, '').slice(-1);
    const updated = [...otpDigits];
    updated[index] = char;
    setOtpDigits(updated);

    if (char && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'Enter') {
      if (isOtpSent) handleVerifyOtp();
      else handleSendOtp();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!paste) return;
    const digits = paste.split('');
    const updated = [...otpDigits];
    digits.forEach((d, i) => {
      if (i < 6) updated[i] = d;
    });
    setOtpDigits(updated);
    const nextIdx = Math.min(paste.length, 5);
    otpInputRefs.current[nextIdx]?.focus();
  };


  return (
    <div className="login-root">
      <style>{`
        .login-root {
          min-height: 100vh;
          box-sizing: border-box;
          padding-top: env(safe-area-inset-top, 0px);
          padding-bottom: env(safe-area-inset-bottom, 0px);
          --bg: #FAF7F2;
          --bg2: #EFE9DF;
          --ink: #1B120B;
          --muted: #76716B;
          --paper: #FFFFFF;
          --line: #E8E3DA;
          --brand: #FF5F00;
          --brand-hover: #EA580C;
          --brand-ink: #B84A08;
          --ok: #16A34A;
          --slot: #1B120B;
          --chip: #FFF0E6;
          --page-ink: #1B120B;
          --page-muted: #76716B;
          --sans: "Outfit", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
          --mono: "IBM Plex Mono", ui-monospace, Menlo, Consolas, monospace;
          font-family: var(--sans);
          color: var(--page-ink);
          background-color: #FFFDF9;
          background-image: 
            radial-gradient(1100px 540px at 50% -6%, rgba(255, 95, 0, 0.17) 0%, transparent 65%),
            radial-gradient(850px 480px at 100% 20%, rgba(255, 138, 61, 0.12) 0%, transparent 60%),
            radial-gradient(800px 500px at 0% 80%, rgba(255, 95, 0, 0.08) 0%, transparent 60%),
            linear-gradient(180deg, #FFF7F0 0%, #FFFFFF 52%, #FAF7F2 100%);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .login-root * {
          box-sizing: border-box;
        }

        /* Top Header */
        .login-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px clamp(16px, 4vw, 40px);
        }
        .login-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 800;
          font-size: 22px;
          letter-spacing: -0.02em;
          color: var(--page-ink);
          text-decoration: none;
          cursor: pointer;
        }
        .login-logo b {
          color: var(--brand);
        }
        .login-mark {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--ink);
          display: grid;
          place-items: center;
          border: 1.5px solid var(--page-ink);
          position: relative;
        }
        .login-mark::after {
          content: "";
          width: 12px;
          height: 12px;
          border: 2.5px solid #fff;
          border-right-color: transparent;
          border-radius: 50%;
        }
        .login-nav {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .login-home {
          font: 600 13px var(--sans);
          color: var(--page-muted);
          text-decoration: none;
          padding: 8px;
          cursor: pointer;
          transition: color 0.2s;
        }
        .login-home:hover {
          color: var(--page-ink);
        }

        /* Main Printer Container */
        .login-main {
          display: grid;
          grid-template-columns: 1fr;
          justify-items: center;
          padding: 0 16px 28px;
          flex: 1;
          align-content: center;
        }
        .printer {
          width: min(640px, 100%);
          position: relative;
          z-index: 2;
        }

        /* Printer Slot & LED */
        .slot {
          height: 36px;
          border-radius: 18px;
          background: var(--slot);
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.28), inset 0 -3px 0 rgba(255, 255, 255, 0.06);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 18px;
          color: #8a90a0;
          font: 500 11px var(--mono);
          position: relative;
        }
        .led {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #3dd68c;
          box-shadow: 0 0 10px #3dd68c;
          animation: blink 1s steps(2) 6;
        }
        @keyframes blink {
          50% { opacity: 0.25; }
        }
        .slot i {
          display: block;
          position: absolute;
          left: 14px;
          right: 14px;
          bottom: -3px;
          height: 6px;
          background: #0a0b0e;
          border-radius: 3px;
        }

        /* Receipt Sliding Feed */
        .feed {
          overflow: hidden;
          margin: 0 14px;
          padding: 0 0 20px;
          position: relative;
          top: -1px;
        }
        .receipt {
          position: relative;
          background: var(--paper);
          color: var(--ink);
          padding: 24px 34px 20px;
          transform: translateY(-101%);
          animation: print 1.9s cubic-bezier(0.35, 0.1, 0.2, 1) 0.25s forwards;
          filter: drop-shadow(0 14px 18px rgba(0, 0, 0, 0.18));
          border-radius: 4px 4px 0 0;
        }
        @keyframes print {
          to { transform: translateY(0); }
        }

        /* Serrated Tear Edge at Receipt Bottom */
        .receipt::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          bottom: -12px;
          height: 12px;
          background: linear-gradient(135deg, var(--paper) 25%, transparent 25%) -8px 0,
                      linear-gradient(225deg, var(--paper) 25%, transparent 25%) -8px 0;
          background-size: 16px 16px;
        }

        /* Receipt Header */
        .rhead {
          text-align: center;
        }
        .rhead .login-mark {
          margin: 0 auto 10px;
          width: 38px;
          height: 38px;
          border: 0;
          background: #15171c;
          border-radius: 50%;
        }
        .rhead .login-mark::after {
          width: 16px;
          height: 16px;
          border-width: 3px;
        }
        .receipt h1 {
          margin: 0;
          font-size: 27px;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: var(--ink);
        }
        .receipt .sub {
          margin: 6px 0 0;
          font: 400 12px var(--mono);
          color: #6b6a62;
        }
        .receipt .dash {
          border: 0;
          border-top: 2px dashed var(--line);
          margin: 14px 0;
        }

        /* Sliding Tabs */
        .receipt-tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          background: #f1eee6;
          border-radius: 12px;
          padding: 4px;
          position: relative;
        }
        .receipt-tabs button {
          position: relative;
          z-index: 1;
          border: 0;
          background: none;
          font: 600 14px var(--sans);
          padding: 10px;
          color: #6b6a62;
          cursor: pointer;
          border-radius: 9px;
          transition: color 0.2s;
        }
        .receipt-tabs button[aria-selected="true"] {
          color: var(--brand-ink);
        }
        .pill {
          position: absolute;
          top: 4px;
          bottom: 4px;
          left: 4px;
          width: calc(50% - 4px);
          background: #fff;
          border-radius: 9px;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
          transition: transform 0.3s cubic-bezier(0.4, 0.1, 0.2, 1);
        }
        .receipt-tabs[data-i="1"] .pill {
          transform: translateX(100%);
        }

        /* QR Pairing Panel */
        .pair {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 30px;
          align-items: center;
          margin-top: 16px;
        }
        .qrwrap {
          margin: 0 auto;
          width: 214px;
          padding: 12px;
          border: 2px dashed var(--line);
          border-radius: 18px;
          position: relative;
          background: #fff;
        }
        .qr {
          position: relative;
          width: 100%;
          aspect-ratio: 1;
          overflow: hidden;
          border-radius: 8px;
          background: #fff;
        }
        .qr svg {
          display: block;
          width: 100% !important;
          height: 100% !important;
        }
        .qr.swap svg {
          animation: pop 0.5s ease;
        }
        @keyframes pop {
          from { opacity: 0; transform: scale(0.96); }
        }
        .scan {
          position: absolute;
          left: -4px;
          right: -4px;
          top: 0;
          height: 3px;
          background: var(--brand);
          box-shadow: 0 0 14px 3px rgba(242, 106, 27, 0.6);
          animation: scan 2.6s ease-in-out infinite alternate;
          pointer-events: none;
        }
        @keyframes scan {
          to { top: calc(100% - 3px); }
        }
        .life {
          height: 4px;
          background: #ece8dd;
          border-radius: 3px;
          margin: 12px 4px 0;
          overflow: hidden;
        }
        .life span {
          display: block;
          height: 100%;
          width: 100%;
          background: var(--brand);
          transform-origin: left;
          transition: transform 0.15s linear;
        }
        .status {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          margin: 12px 0 0;
          font: 600 13px var(--sans);
          color: var(--ok);
        }
        .dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: var(--ok);
          animation: ping 1.6s infinite;
        }
        @keyframes ping {
          0% { box-shadow: 0 0 0 0 rgba(18, 145, 90, 0.5); }
          70%, 100% { box-shadow: 0 0 0 9px rgba(18, 145, 90, 0); }
        }

        /* Step instructions with dotted line leaders */
        .steps {
          margin: 0;
          padding: 0;
          list-style: none;
          font: 400 13px/2.2 var(--mono);
          color: #3b3b36;
        }
        .steps li {
          display: flex;
          gap: 6px;
          align-items: baseline;
        }
        .steps li::after {
          content: "";
          order: 2;
          flex: 1;
          border-bottom: 1px dotted #bdb8a8;
          transform: translateY(-3px);
        }
        .steps span {
          order: 1;
        }
        .steps b {
          order: 3;
          font-weight: 600;
          color: var(--brand-ink);
        }
        .refresh {
          display: flex;
          margin: 14px 0 0 -10px;
          gap: 8px;
          align-items: center;
          border: 0;
          background: none;
          font: 600 13px var(--sans);
          color: #3b3b36;
          cursor: pointer;
          padding: 6px 10px;
          border-radius: 8px;
          transition: background 0.15s;
        }
        .refresh:hover {
          background: rgba(0, 0, 0, 0.05);
        }
        .refresh svg {
          transition: transform 0.5s;
        }
        .refresh:active svg {
          transform: rotate(300deg);
        }

        /* Mobile OTP Panel */
        .receipt label {
          display: block;
          font: 500 12px var(--mono);
          color: #6b6a62;
          margin: 18px 0 8px;
        }
        .phone {
          display: flex;
          border: 2px solid var(--line);
          border-radius: 12px;
          overflow: hidden;
          background: #fff;
          transition: border-color 0.2s;
        }
        .phone:focus-within {
          border-color: var(--brand);
        }
        .phone span {
          padding: 13px 14px;
          font: 600 15px var(--sans);
          background: #f1eee6;
          border-right: 2px solid var(--line);
          display: flex;
          align-items: center;
          user-select: none;
        }
        .phone input {
          flex: 1;
          min-width: 0;
          border: 0;
          padding: 13px 14px;
          font: 500 17px var(--mono);
          letter-spacing: 0.06em;
          background: #fff;
          color: var(--ink);
          outline: none;
        }
        .cta {
          width: 100%;
          margin-top: 14px;
          border: 0;
          border-radius: 12px;
          background: var(--ink);
          color: #fff;
          font: 700 15px var(--sans);
          padding: 14px;
          cursor: pointer;
          transition: transform 0.15s, background 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .cta:hover {
          background: #2b2f39;
        }
        .cta:active {
          transform: scale(0.98);
        }
        .cta:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .otp {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin: 12px auto 4px;
          max-width: 320px;
        }
        .otp input {
          width: 38px;
          height: 44px;
          text-align: center;
          font: 700 18px var(--mono);
          border: 1.5px solid var(--line);
          border-radius: 9px;
          background: #fff;
          color: var(--ink);
          padding: 0;
          outline: none;
          transition: all 0.2s;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        }
        .otp input:focus {
          border-color: var(--brand);
          box-shadow: 0 0 0 3px rgba(255, 95, 0, 0.15);
        }
        .terms-row {
          margin-top: 12px;
          margin-bottom: 2px;
        }
        .terms-label {
          display: flex !important;
          align-items: center;
          gap: 9px;
          font: 500 12px var(--sans) !important;
          color: #6b6a62 !important;
          cursor: pointer;
          user-select: none;
          margin: 0 !important;
        }
        .terms-checkbox {
          width: 16px;
          height: 16px;
          accent-color: var(--brand);
          cursor: pointer;
          border-radius: 4px;
          flex-shrink: 0;
        }
        .terms-label span {
          line-height: 1.35;
        }
        .terms-label a {
          color: var(--brand-ink);
          font-weight: 600;
          text-decoration: underline;
        }
        .terms-label a:hover {
          color: var(--brand);
        }
        .msg {
          min-height: 20px;
          margin: 10px 0 0;
          font: 500 12px var(--mono);
          color: var(--brand-ink);
          text-align: center;
        }
        .msg.err {
          color: #c0392b;
        }
        .resend-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 6px;
          font: 500 11px var(--mono);
        }
        .resend-btn {
          border: 0;
          background: none;
          color: var(--brand-ink);
          font: 600 12px var(--sans);
          cursor: pointer;
          text-decoration: underline;
          padding: 0;
        }
        .resend-btn:disabled {
          opacity: 0.5;
          text-decoration: none;
          cursor: not-allowed;
        }

        /* Footer */
        .foot {
          text-align: center;
          font-size: 13px;
          color: #6b6a62;
          margin: 0;
        }
        .foot a {
          color: var(--brand-ink);
          font-weight: 700;
          text-decoration: none;
        }
        .foot a:hover {
          text-decoration: underline;
        }

        /* Responsive Breakpoints */
        @media (max-width: 600px) {
          .pair {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .refresh {
            margin: 8px auto 0;
          }
        }
        @media (max-width: 420px) {
          .receipt {
            padding: 24px 20px 22px;
          }
          .qrwrap {
            width: 208px;
          }
        }
      `}</style>

      {/* Top Header */}
      <header className="login-top">
        <div className="login-logo" onClick={() => navigate('/')} title="Counter 365 Home" style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <img
            src="/counter365_mark.png"
            alt="Counter 365"
            style={{ width: '32px', height: '32px', objectFit: 'contain' }}
          />
          <span style={{ fontWeight: 800, fontSize: '20px', letterSpacing: '-0.02em', color: 'var(--page-ink)' }}>
            Counter<b style={{ color: 'var(--brand)' }}>365</b>
          </span>
        </div>
        <nav className="login-nav">
          <a className="login-home" onClick={() => navigate('/')}>
            ← Home
          </a>
        </nav>
      </header>

      {/* Main Thermal POS Printer Layout */}
      <main className="login-main">
        <section className="printer" aria-label="Sign in">
          {/* Printer Output Slot */}
          <div className="slot" aria-hidden="true">
            <span>COUNTER-365 · PRINTING</span>
            <span className="led"></span>
            <i></i>
          </div>

          {/* Feed Mechanism */}
          <div className="feed">
            <div className="receipt">
              {/* Receipt Header */}
              <div className="rhead">
                <img
                  src="/counter365_mark.png"
                  alt="Counter 365"
                  className="w-10 h-10 object-contain mx-auto mb-2 shadow-2xs"
                />
                <h1>Sign in to Counter</h1>
                <p className="sub">Open your shop dashboard</p>
              </div>

              <hr className="dash" />

              {/* Segmented Tabs */}
              <div className="receipt-tabs" role="tablist" data-i={activeTab}>
                <span className="pill"></span>
                <button
                  role="tab"
                  id="t0"
                  aria-selected={activeTab === 0}
                  aria-controls="p0"
                  onClick={() => {
                    setActiveTab(0);
                    setMsg('');
                    setIsError(false);
                  }}
                >
                  QR pairing
                </button>
                <button
                  role="tab"
                  id="t1"
                  aria-selected={activeTab === 1}
                  aria-controls="p1"
                  onClick={() => {
                    setActiveTab(1);
                    setMsg('');
                    setIsError(false);
                  }}
                >
                  Mobile OTP
                </button>
              </div>

              {/* PANEL 0: QR PAIRING */}
              {activeTab === 0 && (
                <div className="panel" id="p0" role="tabpanel" aria-labelledby="t0">
                  <div className="pair">
                    <div className="pl">
                      <div className="qrwrap">
                        <div className={`qr ${isQrSwapping ? 'swap' : ''}`} id="qr">
                          {qrSession?.qrPayload ? (
                            <QRCodeSVG
                              value={qrSession.qrPayload}
                              size={190}
                              level="H"
                              includeMargin={false}
                              imageSettings={{
                                src: '/counter365_icon_dark.png',
                                height: 38,
                                width: 38,
                                excavate: true,
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-[#6b6a62]">
                              Generating…
                            </div>
                          )}
                          <div className="scan"></div>
                        </div>

                        {/* Session Lifetime Bar */}
                        <div className="life">
                          <span style={{ transform: `scaleX(${qrProgress})` }}></span>
                        </div>
                      </div>

                      <p className="status">
                        <span className="dot"></span>
                        <span>{isLoading ? 'Confirming authentication…' : 'Waiting for mobile pairing…'}</span>
                      </p>
                      {qrSession?.code && (
                        <div style={{ marginTop: '8px', textAlign: 'center', fontSize: '13px', color: '#1B120B' }}>
                          Terminal Code: <strong style={{ letterSpacing: '2px', color: '#FF5F00', fontSize: '15px' }}>{qrSession.code}</strong>
                        </div>
                      )}
                    </div>

                    <div className="pr">
                      <ul className="steps">
                        <li><span>Open Counter365 on Android</span><b>1</b></li>
                        <li><span>Settings › Link Web Device</span><b>2</b></li>
                        <li><span>Scan this code to confirm</span><b>3</b></li>
                      </ul>

                      <button
                        className="refresh"
                        type="button"
                        onClick={initQrSession}
                      >
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
                          <path d="M21 3v5h-5" />
                        </svg>
                        <span>Refresh QR code</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* PANEL 1: MOBILE OTP */}
              {activeTab === 1 && (
                <div className="panel" id="p1" role="tabpanel" aria-labelledby="t1">
                  <label htmlFor="ph">Mobile number registered with your shop</label>
                  <div className="phone">
                    <span>+91</span>
                    <input
                      id="ph"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value.replace(/\D/g, ''));
                        if (isOtpSent) setIsOtpSent(false);
                      }}
                      placeholder="98765 43210"
                      autoComplete="tel-national"
                      disabled={isLoading}
                    />
                  </div>

                  {/* Terms & Privacy Policy Checkbox (Required before OTP send) */}
                  {!isOtpSent && (
                    <div className="terms-row">
                      <label className="terms-label">
                        <input
                          type="checkbox"
                          checked={isTermsAgreed}
                          onChange={(e) => setIsTermsAgreed(e.target.checked)}
                          className="terms-checkbox"
                        />
                        <span>
                          I agree to the{' '}
                          <a href="/terms" target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                            Terms of Service
                          </a>{' '}
                          and{' '}
                          <a href="/privacy" target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                            Privacy Policy
                          </a>
                        </span>
                      </label>
                    </div>
                  )}

                  {isOtpSent && (
                    <div id="otpbox">
                      <div className="resend-row">
                        <label className="!m-0">Enter the 6-digit code</label>
                        <button
                          type="button"
                          className="resend-btn"
                          disabled={resendCooldown > 0 || isLoading}
                          onClick={() => handleSendOtp()}
                        >
                          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                        </button>
                      </div>

                      <div className="otp" id="otp">
                        {[0, 1, 2, 3, 4, 5].map((index) => (
                          <input
                            key={index}
                            ref={(el) => {
                              otpInputRefs.current[index] = el;
                            }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            aria-label={`Digit ${index + 1}`}
                            value={otpDigits[index]}
                            onChange={(e) => handleDigitChange(index, e.target.value)}
                            onKeyDown={(e) => handleDigitKeyDown(index, e)}
                            onPaste={handlePaste}
                            disabled={isLoading}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <p className={`msg ${isError ? 'err' : ''}`} role="status">
                    {msg}
                  </p>

                  {isUnregisteredNumber ? (
                    <button
                      className="cta"
                      type="button"
                      onClick={() => navigate(`/register?phone=${phone}`)}
                    >
                      Register Your Shop Now →
                    </button>
                  ) : (
                    <button
                      className="cta"
                      id="go"
                      type="button"
                      disabled={isLoading || (!isOtpSent && (phone.length !== 10 || !isTermsAgreed))}
                      onClick={() => {
                        if (!isOtpSent) handleSendOtp();
                        else handleVerifyOtp();
                      }}
                    >
                      {isLoading ? (
                        <span>Processing…</span>
                      ) : !isOtpSent ? (
                        <span>Send OTP</span>
                      ) : (
                        <span>Verify and sign in</span>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
