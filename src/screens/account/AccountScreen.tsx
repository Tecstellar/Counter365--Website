import React, { useState, useEffect } from 'react';
import {
  Settings,
  Store,
  Shield,
  CreditCard,
  Users,
  Printer,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { useAuth } from '../../context/AuthContext';
import { shopService } from '../../services/shopService';
import { subscriptionService, PRO_PLANS } from '../../services/subscriptionService';
import { ShopMember, UserRole, SubscriptionPlanId } from '../../types/models';
import { formatRupee } from '../../lib/money';

export const AccountScreen: React.FC = () => {
  const { shop, updateShop, subscriptionStatus, refreshSubscription } = useShop();
  const { currentRole, profile } = useAuth();

  const [activeTab, setActiveTab] = useState<'shop' | 'staff' | 'subscription' | 'hardware'>('shop');

  // Shop details form
  const [name, setName] = useState(shop?.name || '');
  const [address, setAddress] = useState(shop?.address || '');
  const [city, setCity] = useState(shop?.city || '');
  const [pincode, setPincode] = useState(shop?.pincode || '');
  const [upiId, setUpiId] = useState(shop?.upiId || '');
  const [gstEnabled, setGstEnabled] = useState(shop?.gstEnabled || false);
  const [gstRate, setGstRate] = useState(shop?.gstRate || 5);
  const [gstNumber, setGstNumber] = useState(shop?.gstNumber || '');
  const [isSavingShop, setIsSavingShop] = useState(false);
  const [shopSuccessMsg, setShopSuccessMsg] = useState<string | null>(null);

  // Staff members
  const [members, setMembers] = useState<ShopMember[]>([]);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<UserRole>('Biller');

  const loadMembers = async () => {
    if (!shop?.id) return;
    const list = await shopService.getShopMembers(shop.id);
    setMembers(list);
  };

  useEffect(() => {
    if (activeTab === 'staff') {
      loadMembers();
    }
  }, [activeTab, shop?.id]);

  const handleSaveShopSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop) return;
    setIsSavingShop(true);
    await updateShop({
      name: name.trim(),
      address: address.trim(),
      city: city.trim(),
      pincode: pincode.trim(),
      upiId: upiId.trim() || null,
      gstEnabled,
      gstRate,
      gstNumber: gstEnabled ? gstNumber.trim() : null,
    });
    setIsSavingShop(false);
    setShopSuccessMsg('Shop settings updated successfully!');
    setTimeout(() => setShopSuccessMsg(null), 3000);
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop?.id || !newStaffName.trim() || !newStaffPhone.trim()) return;

    await shopService.addStaffMember(shop.id, {
      fullName: newStaffName.trim(),
      phone: newStaffPhone.trim(),
      role: newStaffRole,
    });

    setNewStaffName('');
    setNewStaffPhone('');
    setIsStaffModalOpen(false);
    await loadMembers();
  };

  const handleUpgradePlan = (planId: SubscriptionPlanId) => {
    if (!shop?.id) return;
    const url = subscriptionService.getPaymentCheckoutUrl(shop.id, planId, shop.phone);
    window.open(url, '_blank');
  };

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold font-heading text-[#111111]">Store & Counter Settings</h2>
        <p className="text-xs text-[#76716B]">Configure shop branding, UPI QR payments, staff permissions and Pro tier</p>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#EBE7E1] pb-2">
        {[
          { key: 'shop', label: 'Shop Details & Tax', icon: Store },
          { key: 'staff', label: 'Staff Roles & Access', icon: Users },
          { key: 'subscription', label: 'Pro Subscription', icon: Sparkles },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === t.key
                  ? 'bg-[#111111] text-white shadow-xs'
                  : 'bg-white border border-[#EBE7E1] text-[#76716B] hover:text-[#111111]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: SHOP DETAILS & TAX */}
      {activeTab === 'shop' && (
        <form onSubmit={handleSaveShopSettings} className="bg-white rounded-2xl border border-[#EBE7E1] p-6 shadow-card max-w-2xl space-y-4">
          {shopSuccessMsg && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{shopSuccessMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#111111] mb-1">Shop / Business Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-[#EBE7E1] outline-hidden focus:border-[#FF5F00]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1">City / Town</label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-[#EBE7E1] outline-hidden focus:border-[#FF5F00]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1">Pincode</label>
              <input
                type="text"
                maxLength={6}
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-[#EBE7E1] outline-hidden focus:border-[#FF5F00]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#111111] mb-1">Full Street Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-[#EBE7E1] outline-hidden focus:border-[#FF5F00]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#111111] mb-1">Merchant UPI ID (for Customer Bill QR)</label>
            <input
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="e.g. yourshop@okaxis or 9876543210@paytm"
              className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-[#EBE7E1] outline-hidden focus:border-[#FF5F00]"
            />
            <p className="text-[11px] text-[#76716B] mt-1">
              Printed on pending/partial receipts so customers can scan and pay directly via GPay, PhonePe or Paytm.
            </p>
          </div>

          {/* GST Configuration */}
          <div className="pt-3 border-t border-[#EBE7E1]">
            <label className="flex items-center justify-between cursor-pointer py-1">
              <span className="text-xs font-bold text-[#111111]">Enable GST Invoicing</span>
              <input
                type="checkbox"
                checked={gstEnabled}
                onChange={(e) => setGstEnabled(e.target.checked)}
                className="w-4 h-4 accent-[#FF5F00]"
              />
            </label>

            {gstEnabled && (
              <div className="mt-3 grid grid-cols-2 gap-3 p-3 rounded-xl bg-[#FAF8F5] border border-[#EBE7E1]">
                <div>
                  <label className="block text-[11px] font-bold text-[#111111] mb-1">Default GST Rate</label>
                  <select
                    value={gstRate}
                    onChange={(e) => setGstRate(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs font-bold bg-white rounded-lg border border-[#EBE7E1] outline-hidden"
                  >
                    <option value={5}>5%</option>
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
                    className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-white rounded-lg border border-[#EBE7E1] outline-hidden"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={isSavingShop}
              className="px-6 py-2.5 rounded-xl bg-[#FF5F00] hover:bg-[#EA580C] text-white font-bold text-xs shadow-md transition"
            >
              {isSavingShop ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: STAFF ROLES & PERMISSIONS */}
      {activeTab === 'staff' && (
        <div className="bg-white rounded-2xl border border-[#EBE7E1] p-6 shadow-card space-y-4 max-w-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#111111]">Authorized Staff Members</h3>
              <p className="text-xs text-[#76716B]">Staff members can log in using their own phone numbers with specific access</p>
            </div>
            {currentRole === 'Owner' && (
              <button
                onClick={() => setIsStaffModalOpen(true)}
                className="px-3 py-2 rounded-xl bg-[#111111] hover:bg-[#222222] text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 text-[#FF5F00]" />
                <span>Add Staff Member</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F5] border-b border-[#EBE7E1] text-[#76716B] font-bold">
                <tr>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FAF8F5]">
                {members.map((m) => (
                  <tr key={m.id}>
                    <td className="py-2.5 px-3 font-bold text-[#111111]">{m.fullName}</td>
                    <td className="py-2.5 px-3 text-[#76716B]">+91 {m.phone}</td>
                    <td className="py-2.5 px-3 font-semibold text-[#111111]">{m.role}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        m.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {m.isActive ? 'ACTIVE' : 'DEACTIVATED'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PRO SUBSCRIPTION */}
      {activeTab === 'subscription' && (
        <div className="space-y-6 max-w-4xl">
          {/* Status Card */}
          <div className="p-5 rounded-2xl bg-white border border-[#EBE7E1] shadow-card flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[#FF5F00] uppercase tracking-wider block mb-1">
                Active Subscription Tier
              </span>
              <h3 className="text-lg font-black text-[#111111]">
                {subscriptionStatus?.isPaidActive ? 'Counter 365 Pro Tier (Active)' : 'Free 100-Bills Trial'}
              </h3>
              <p className="text-xs text-[#76716B] mt-0.5">
                Total bills created so far: <span className="font-bold text-[#111111]">{subscriptionStatus?.totalBillsCreated || 0}</span> / 100 limit
              </p>
            </div>

            <div className="text-right">
              <span className={`px-3 py-1 rounded-full text-xs font-bold inline-block mb-1 ${
                subscriptionStatus?.isPaidActive ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {subscriptionStatus?.isPaidActive ? 'UNLIMITED BILLING' : `${subscriptionStatus?.billsRemaining} Free Left`}
              </span>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PRO_PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`p-5 rounded-2xl bg-white border flex flex-col justify-between transition shadow-xs hover:shadow-card ${
                  plan.popular ? 'border-[#FF5F00] ring-1 ring-[#FF5F00]' : 'border-[#EBE7E1]'
                }`}
              >
                <div>
                  {plan.popular && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FF5F00] text-white uppercase tracking-wider inline-block mb-2">
                      Most Popular
                    </span>
                  )}
                  <h4 className="text-sm font-bold text-[#111111]">{plan.name}</h4>
                  <p className="text-[11px] text-[#76716B] mb-4">{plan.durationLabel}</p>
                  <div className="text-2xl font-black text-[#111111] mb-4">
                    {formatRupee(plan.price)}
                  </div>
                </div>

                <button
                  onClick={() => handleUpgradePlan(plan.id)}
                  className={`w-full py-2.5 rounded-xl text-xs font-extrabold transition shadow-xs ${
                    plan.popular
                      ? 'bg-[#FF5F00] hover:bg-[#EA580C] text-white'
                      : 'bg-[#111111] hover:bg-[#222222] text-white'
                  }`}
                >
                  Activate Pro Now
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: ADD STAFF */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-modal border border-[#EBE7E1]">
            <h3 className="text-base font-bold text-[#111111] mb-4">Add Staff Counter Member</h3>
            <form onSubmit={handleAddStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">Staff Full Name</label>
                <input
                  type="text"
                  required
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  placeholder="e.g. Karthik"
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-[#EBE7E1] outline-hidden focus:border-[#FF5F00]"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">Mobile Phone</label>
                <input
                  type="tel"
                  maxLength={10}
                  required
                  value={newStaffPhone}
                  onChange={(e) => setNewStaffPhone(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="9876543210"
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-[#EBE7E1] outline-hidden focus:border-[#FF5F00]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">Access Role</label>
                <select
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-[#EBE7E1] outline-hidden bg-white"
                >
                  <option value="Biller">Biller (POS & Printing Only)</option>
                  <option value="Supervisor">Supervisor (POS, Menus, Discounts & Expenses)</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#EBE7E1] text-xs font-bold text-[#76716B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#111111] text-white text-xs font-bold"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
