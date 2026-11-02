import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Store,
  MapPin,
  Phone,
  User,
  Coffee,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Upload,
  Crosshair,
  Sparkles,
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { useAuth } from '../context/AuthContext';
import { ShopType } from '../types/models';
import { twoFactorService, DEMO_REVIEW_PHONE, DEMO_REVIEW_OTP } from '../services/twoFactorService';
import confetti from 'canvas-confetti';

const INDIAN_STATES = [
  'Tamil Nadu',
  'Karnataka',
  'Kerala',
  'Andhra Pradesh',
  'Telangana',
  'Maharashtra',
  'Puducherry',
  'Gujarat',
  'Delhi',
  'Uttar Pradesh',
  'West Bengal',
  'Rajasthan',
];

const POPULAR_CITIES: Record<string, string[]> = {
  'Tamil Nadu': [
    'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem',
    'Tiruppur', 'Erode', 'Vellore', 'Thoothukudi', 'Dindigul',
  ],
  'Karnataka': [
    'Bengaluru', 'Mysuru', 'Hubballi', 'Mangaluru', 'Belagavi',
  ],
  'Kerala': [
    'Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Kollam', 'Thrissur',
  ],
  'Andhra Pradesh': [
    'Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Tirupati',
  ],
  'Telangana': [
    'Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar',
  ],
  'Maharashtra': [
    'Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik',
  ],
  'Puducherry': [
    'Puducherry', 'Karaikal',
  ],
};

const SHOP_TYPES: Array<{
  name: ShopType;
  note: string;
  icon: string;
}> = [
  { name: 'Tea Shop', note: 'Tea, snacks, cold beverages', icon: '☕' },
  { name: 'Cafe', note: 'Coffee, pastries, bakes', icon: '🥐' },
  { name: 'Fast Food', note: 'Rolls, fried, quick bites', icon: '🍔' },
  { name: 'Tiffin Shop', note: 'Morning breakfast & evening tiffins', icon: '🍲' },
  { name: 'Restaurant', note: 'Starters, main course, dine-in', icon: '🍽️' },
];

export const RegisterScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialPhone = searchParams.get('phone') || '';

  const { registerNewShop, shop } = useShop();
  const { profile, verifyOtp } = useAuth();

  // If already registered and has active shop, can go to dashboard
  useEffect(() => {
    if (shop && shop.id && profile) {
      navigate('/dashboard', { replace: true });
    }
  }, [shop, profile, navigate]);

  // Steps: 1: phone & otp, 2: shop type, 3: shop details, 4: success
  const [step, setStep] = useState<number>(initialPhone ? 2 : 1);

  // Phone & OTP states
  const [phone, setPhone] = useState(initialPhone);
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(Boolean(initialPhone));

  // Shop details states
  const [shopKind, setShopKind] = useState<ShopType>('Tea Shop');
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [address, setAddress] = useState('');
  const [stateName, setStateName] = useState('Tamil Nadu');
  const [cityName, setCityName] = useState('Chennai');
  const [pincode, setPincode] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [geoTagged, setGeoTagged] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);

  // GST & Extras
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstRate, setGstRate] = useState(5);
  const [gstNumber, setGstNumber] = useState('');
  const [tableManagementEnabled, setTableManagementEnabled] = useState(false);
  const [tableCount, setTableCount] = useState(6);

  // Status & loading
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Send OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setSuccessNotice(null);

    const clean = phone.replace(/\D/g, '');
    if (clean.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsLoading(true);
    const res = await twoFactorService.sendOtp(clean);
    setIsLoading(false);

    if (res.success) {
      setIsOtpSent(true);
      if (clean === DEMO_REVIEW_PHONE) {
        setSuccessNotice(`Demo OTP active: Use ${DEMO_REVIEW_OTP}`);
      } else {
        setSuccessNotice('6-digit OTP code sent via SMS.');
      }
    } else {
      setErrorMsg(res.error || 'Failed to send OTP code.');
    }
  };

  // Verify OTP
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    if (otp.trim().length !== 6) {
      setErrorMsg('Please enter the 6-digit OTP code.');
      return;
    }

    setIsLoading(true);
    const loginRes = await verifyOtp(phone, otp);
    setIsLoading(false);

    if (loginRes.success) {
      if (loginRes.isExistingShop && loginRes.shop) {
        // Mobile number already has a registered shop! Prevent duplicate creation
        setErrorMsg(`Mobile number is already registered with "${loginRes.shop.name}". Redirecting to dashboard...`);
        setTimeout(() => navigate('/dashboard'), 1500);
      } else {
        setIsPhoneVerified(true);
        setStep(2);
      }
    } else {
      setErrorMsg(loginRes.error || 'Invalid OTP code.');
    }
  };

  // Browser Geolocation
  const handleTagLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLoading(false);
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setGeoTagged(true);
        setSuccessNotice(`Location tagged: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
      },
      (err) => {
        setIsLoading(false);
        setErrorMsg('Could not fetch location. Please check browser permissions.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Submit complete registration
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!shopName.trim()) {
      setErrorMsg('Please enter a shop or business name.');
      return;
    }
    if (!cityName.trim()) {
      setErrorMsg('Please enter your city/town.');
      return;
    }
    if (pincode.trim().length !== 6) {
      setErrorMsg('Please enter a valid 6-digit pincode.');
      return;
    }

    try {
      setIsLoading(true);
      const cleanPhone = phone.replace(/\D/g, '') || profile?.phone || '9999999999';

      await registerNewShop({
        name: shopName.trim(),
        ownerName: ownerName.trim() || undefined,
        shopType: shopKind,
        phone: cleanPhone,
        address: address.trim(),
        city: cityName.trim(),
        state: stateName.trim(),
        pincode: pincode.trim(),
        latitude,
        longitude,
        hasLogo: Boolean(logoUrl),
        logoUrl,
        gstEnabled,
        gstRate,
        gstNumber: gstEnabled ? gstNumber.trim() : undefined,
        tableManagementEnabled,
        tableCount,
        ownerUserId: profile?.id,
      });

      setIsLoading(false);
      setStep(4);
      confetti({ particleCount: 75, spread: 70, origin: { y: 0.6 } });
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err?.message || 'Failed to complete registration. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-between p-4 sm:p-6">
      {/* Top Header */}
      <header className="max-w-2xl mx-auto w-full flex items-center justify-between pb-6 border-b border-[#EBE7E1]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center hover:opacity-90 transition"
            title="Go to Counter 365 Home"
          >
            <img src="/counter365_logo.png" alt="Counter 365" className="h-9 w-auto object-contain" />
          </button>
        </div>

        <button
          onClick={() => navigate('/login')}
          className="text-xs font-bold text-[#FF5F00] hover:underline"
        >
          Already registered? Login
        </button>
      </header>

      {/* Main Multi-Step Form */}
      <main className="max-w-xl mx-auto w-full my-8">
        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-8 px-2">
          {['Mobile Verification', 'Shop Kind', 'Shop Details', 'Completed'].map((label, idx) => {
            const stepNum = idx + 1;
            const isDone = step > stepNum;
            const isCurrent = step === stepNum;
            return (
              <div key={idx} className="flex-1 flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition ${
                    isDone
                      ? 'bg-[#16A34A] text-white'
                      : isCurrent
                      ? 'bg-[#FF5F00] text-white shadow-md'
                      : 'bg-[#E5E0D8] text-[#76716B]'
                  }`}
                >
                  {isDone ? '✓' : stepNum}
                </div>
                <span className="text-[11px] font-bold text-[#76716B] mt-1 text-center hidden sm:block">
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {errorMsg && (
          <div className="mb-6 flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successNotice && (
          <div className="mb-6 flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* STEP 1: Phone + OTP Verification */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-card border border-[#EBE7E1] p-6 sm:p-8">
            <h2 className="text-xl font-bold font-heading text-[#111111] mb-2">Verify Mobile Number</h2>
            <p className="text-xs text-[#76716B] mb-6">
              Enter your mobile number to create your shop account and verify ownership.
            </p>

            {!isOtpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1.5">Mobile Number *</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#76716B]">
                      +91
                    </span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="98765 43210"
                      className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-[#EBE7E1] text-sm font-semibold outline-hidden focus:border-[#FF5F00] focus:ring-1 focus:ring-[#FF5F00]"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || phone.length !== 10}
                  className="w-full py-3 rounded-xl bg-[#FF5F00] hover:bg-[#EA580C] text-white font-extrabold text-sm shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? 'Sending OTP...' : 'Send Verification OTP'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#111111]">Enter 6-Digit OTP *</label>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="text-xs font-semibold text-[#FF5F00] hover:underline"
                    >
                      Resend OTP
                    </button>
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#EBE7E1] text-center tracking-widest text-lg font-black outline-hidden focus:border-[#FF5F00] focus:ring-1 focus:ring-[#FF5F00]"
                    required
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsOtpSent(false)}
                    className="px-4 py-3 rounded-xl border border-[#EBE7E1] text-xs font-bold text-[#76716B] hover:bg-[#F3F0EB]"
                  >
                    Change Number
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || otp.length !== 6}
                    className="flex-1 py-3 rounded-xl bg-[#FF5F00] hover:bg-[#EA580C] text-white font-extrabold text-sm shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? 'Verifying...' : 'Verify & Continue'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* STEP 2: Shop Kind / Category */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-card border border-[#EBE7E1] p-6 sm:p-8">
            <h2 className="text-xl font-bold font-heading text-[#111111] mb-2">What kind of shop?</h2>
            <p className="text-xs text-[#76716B] mb-6">
              We load a starter menu and reports tailored for your business. Everything is editable later.
            </p>

            <div className="space-y-3 mb-8">
              {SHOP_TYPES.map((item, idx) => {
                const isSelected = shopKind === item.name;
                return (
                  <div
                    key={idx}
                    onClick={() => setShopKind(item.name)}
                    className={`p-4 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                      isSelected
                        ? 'border-[#FF5F00] bg-[#FFF7ED] shadow-sm'
                        : 'border-[#EBE7E1] hover:bg-[#FAF8F5]'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-white border border-[#EBE7E1] flex items-center justify-center text-xl shadow-xs">
                        {item.icon}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[#111111]">{item.name}</div>
                        <div className="text-xs text-[#76716B]">{item.note}</div>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? 'border-[#FF5F00] bg-[#FF5F00]' : 'border-[#CBD5E1]'
                      }`}
                    >
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-2.5 rounded-xl border border-[#EBE7E1] text-xs font-bold text-[#76716B] hover:bg-[#F3F0EB] flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-6 py-2.5 rounded-xl bg-[#FF5F00] hover:bg-[#EA580C] text-white font-extrabold text-xs shadow-md transition flex items-center gap-2"
              >
                Next: Shop Details <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Shop Details */}
        {step === 3 && (
          <form onSubmit={handleFinalSubmit} className="bg-white rounded-2xl shadow-card border border-[#EBE7E1] p-6 sm:p-8 space-y-5">
            <h2 className="text-xl font-bold font-heading text-[#111111]">Shop & Business Details</h2>
            <p className="text-xs text-[#76716B]">
              Configure your bill header, location, and billing settings.
            </p>

            {/* Shop Name */}
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1.5">Shop / Business Name *</label>
              <input
                type="text"
                required
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="e.g. Elite Tea Stall, Chai Point"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#EBE7E1] text-sm font-semibold outline-hidden focus:border-[#FF5F00] focus:ring-1 focus:ring-[#FF5F00]"
              />
            </div>

            {/* Owner Name */}
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1.5">Owner Full Name</label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#EBE7E1] text-sm font-semibold outline-hidden focus:border-[#FF5F00] focus:ring-1 focus:ring-[#FF5F00]"
              />
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1.5">Shop Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address or landmark"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#EBE7E1] text-sm font-semibold outline-hidden focus:border-[#FF5F00] focus:ring-1 focus:ring-[#FF5F00]"
              />
            </div>

            {/* State & City */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1.5">State *</label>
                <select
                  value={stateName}
                  onChange={(e) => {
                    setStateName(e.target.value);
                    const popular = POPULAR_CITIES[e.target.value];
                    if (popular && popular.length > 0) {
                      setCityName(popular[0]);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EBE7E1] text-sm font-semibold bg-white outline-hidden focus:border-[#FF5F00] focus:ring-1 focus:ring-[#FF5F00]"
                >
                  {INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1.5">City / Town *</label>
                <input
                  type="text"
                  required
                  value={cityName}
                  onChange={(e) => setCityName(e.target.value)}
                  placeholder="e.g. Chennai, Coimbatore"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EBE7E1] text-sm font-semibold outline-hidden focus:border-[#FF5F00] focus:ring-1 focus:ring-[#FF5F00]"
                />
              </div>
            </div>

            {/* Popular City Chips */}
            {POPULAR_CITIES[stateName] && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {POPULAR_CITIES[stateName].slice(0, 6).map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => setCityName(city)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition ${
                      cityName === city
                        ? 'bg-[#FF5F00] text-white border-[#FF5F00]'
                        : 'bg-[#F3F0EB] text-[#76716B] border-[#EBE7E1] hover:bg-[#EBE7E1]'
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            )}

            {/* Pincode & GPS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1.5">Pincode (6 digits) *</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                  placeholder="600001"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EBE7E1] text-sm font-semibold outline-hidden focus:border-[#FF5F00] focus:ring-1 focus:ring-[#FF5F00]"
                />
              </div>

              <div className="flex flex-col justify-end">
                <button
                  type="button"
                  onClick={handleTagLocation}
                  className={`w-full py-2.5 px-3.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                    geoTagged
                      ? 'border-[#16A34A] bg-[#DCFCE7] text-[#16A34A]'
                      : 'border-[#FED7AA] bg-[#FFF7ED] text-[#FF5F00] hover:bg-[#FFEDD5]'
                  }`}
                >
                  <Crosshair className="w-4 h-4" />
                  {geoTagged ? 'GPS Tagged ✓' : 'Tag GPS Location'}
                </button>
              </div>
            </div>

            {/* GST Settings */}
            <div className="p-4 rounded-xl border border-[#EBE7E1] bg-[#FAF8F5] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#111111] block">GST Registered Business</span>
                  <span className="text-[11px] text-[#76716B]">Add GSTIN and tax percentage to bills</span>
                </div>
                <input
                  type="checkbox"
                  checked={gstEnabled}
                  onChange={(e) => setGstEnabled(e.target.checked)}
                  className="w-4 h-4 accent-[#FF5F00] cursor-pointer"
                />
              </div>

              {gstEnabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-[#76716B] mb-1">GSTIN Number</label>
                    <input
                      type="text"
                      maxLength={15}
                      value={gstNumber}
                      onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                      placeholder="33AAAAA0000A1Z5"
                      className="w-full px-3 py-2 rounded-lg border border-[#EBE7E1] text-xs font-bold bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#76716B] mb-1">GST Rate</label>
                    <select
                      value={gstRate}
                      onChange={(e) => setGstRate(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-[#EBE7E1] text-xs font-bold bg-white"
                    >
                      <option value={5}>5% (Standard F&B)</option>
                      <option value={12}>12%</option>
                      <option value={18}>18%</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-2.5 rounded-xl border border-[#EBE7E1] text-xs font-bold text-[#76716B] hover:bg-[#F3F0EB] flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-7 py-3 rounded-xl bg-[#FF5F00] hover:bg-[#EA580C] text-white font-black text-sm shadow-md transition disabled:opacity-50 flex items-center gap-2"
              >
                {isLoading ? 'Creating Shop...' : 'Complete & Open Register'}
                <Sparkles className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 4: Success */}
        {step === 4 && (
          <div className="bg-white rounded-2xl shadow-card border border-[#EBE7E1] p-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h2 className="text-2xl font-black font-heading text-[#111111]">
              Shop Registered Successfully!
            </h2>
            <p className="text-xs text-[#76716B] max-w-sm mx-auto">
              <strong>{shopName}</strong> ({shopKind}) is now fully active on Counter 365 Cloud. Your free lifetime subscription is active and starter items have been loaded.
            </p>

            <button
              onClick={() => navigate('/dashboard', { replace: true })}
              className="w-full max-w-xs mx-auto py-3.5 px-6 rounded-xl bg-[#FF5F00] hover:bg-[#EA580C] text-white font-extrabold text-sm shadow-md transition flex items-center justify-center gap-2"
            >
              Open POS Billing Dashboard →
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-[#76716B] py-4">
        © 2026 Counter 365 · Powered by Tecstellar
      </footer>
    </div>
  );
};
