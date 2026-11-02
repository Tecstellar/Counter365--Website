import React, { useState } from 'react';
import { Store, MapPin, Phone, User, CheckCircle2, AlertCircle } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { useAuth } from '../context/AuthContext';
import { ShopType } from '../types/models';

interface OnboardingScreenProps {
  onCompleted: () => void;
}

const SHOP_TYPES: ShopType[] = [
  'Tea Shop',
  'Cafe',
  'Fast Food',
  'Tiffin Shop',
  'Restaurant',
];

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onCompleted }) => {
  const { profile } = useAuth();
  const { registerNewShop } = useShop();

  const [shopName, setShopName] = useState('');
  const [shopType, setShopType] = useState<ShopType>('Tea Shop');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstNumber, setGstNumber] = useState('');
  const [gstRate, setGstRate] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!shopName.trim()) {
      setErrorMsg('Please enter your shop or business name.');
      return;
    }
    if (!city.trim()) {
      setErrorMsg('Please enter your city/town name.');
      return;
    }

    try {
      setIsLoading(true);
      await registerNewShop({
        name: shopName.trim(),
        shopType,
        phone: profile?.phone || '9999999999',
        address: address.trim(),
        city: city.trim(),
        pincode: pincode.trim(),
        gstEnabled,
        gstRate,
        gstNumber: gstEnabled ? gstNumber.trim() : undefined,
      });
      setIsLoading(false);
      onCompleted();
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err?.message || 'Failed to register shop. Please retry.');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-between p-4 sm:p-6">
      <div className="max-w-lg mx-auto w-full pt-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#FF5F00] text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md">
            <Store className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold font-heading text-[#111111]">Register Your Counter</h1>
          <p className="text-xs text-[#76716B] mt-1">Set up your shop details to begin cloud POS billing</p>
        </div>

        {errorMsg && (
          <div className="mb-5 flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-card border border-[#EBE7E1] p-6 space-y-5">
          {/* Shop Name */}
          <div>
            <label className="block text-xs font-bold text-[#111111] mb-1.5">Shop / Business Name *</label>
            <input
              type="text"
              required
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="e.g. Chai Point, Madras Tiffins"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#EBE7E1] text-sm font-semibold outline-hidden focus:border-[#FF5F00] focus:ring-1 focus:ring-[#FF5F00]"
            />
          </div>

          {/* Shop Type Selection */}
          <div>
            <label className="block text-xs font-bold text-[#111111] mb-1.5">Business Category</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SHOP_TYPES.map((type) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => setShopType(type)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition text-left ${
                    shopType === type
                      ? 'border-[#FF5F00] bg-[#FFF0E6] text-[#FF5F00]'
                      : 'border-[#EBE7E1] bg-white text-[#76716B] hover:border-[#DDD8CE]'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Address & City */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1.5">City / Town *</label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Chennai, Madurai"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#EBE7E1] text-sm font-semibold outline-hidden focus:border-[#FF5F00]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1.5">Pincode</label>
              <input
                type="text"
                maxLength={6}
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="600001"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#EBE7E1] text-sm font-semibold outline-hidden focus:border-[#FF5F00]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#111111] mb-1.5">Street Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 12, Main Bazaar Road"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#EBE7E1] text-sm font-semibold outline-hidden focus:border-[#FF5F00]"
            />
          </div>

          {/* GST Toggle */}
          <div className="pt-2 border-t border-[#EBE7E1]">
            <label className="flex items-center justify-between cursor-pointer py-1">
              <div>
                <span className="text-xs font-bold text-[#111111] block">Enable GST Tax Invoicing</span>
                <span className="text-[11px] text-[#76716B]">Add GST % and GSTIN to printed bill receipts</span>
              </div>
              <input
                type="checkbox"
                checked={gstEnabled}
                onChange={(e) => setGstEnabled(e.target.checked)}
                className="w-4 h-4 accent-[#FF5F00] rounded"
              />
            </label>

            {gstEnabled && (
              <div className="mt-3 grid grid-cols-2 gap-3 p-3 rounded-xl bg-[#FAF8F5] border border-[#EBE7E1]">
                <div>
                  <label className="block text-[11px] font-bold text-[#111111] mb-1">GST Rate (%)</label>
                  <select
                    value={gstRate}
                    onChange={(e) => setGstRate(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-bold bg-white rounded-lg border border-[#EBE7E1] outline-hidden"
                  >
                    <option value={5}>5% (Standard F&B)</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#111111] mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                    placeholder="33AAAAA0000A1Z5"
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-white rounded-lg border border-[#EBE7E1] outline-hidden"
                  />
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-[#FF5F00] hover:bg-[#EA580C] text-white font-bold text-sm shadow-md transition active:scale-[0.99] flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>Complete Setup & Open Counter</span>
            )}
          </button>
        </form>
      </div>

      <footer className="text-center text-xs text-[#76716B] py-4">
        All data is securely persisted in Counter 365 cloud database.
      </footer>
    </div>
  );
};
