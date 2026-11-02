import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  Clock,
  CheckCircle2,
  MapPin,
  FileText,
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { contactService } from '../../services/contactService';
import { CustomerRecord } from '../../types/models';
import { formatRupee } from '../../lib/money';
import { generateUUID } from '../../lib/uuid';

export const ContactsScreen: React.FC = () => {
  const { shop } = useShop();

  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');

  const loadData = async () => {
    if (!shop?.id) return;
    setIsLoading(true);
    const data = await contactService.getCustomers(shop.id);
    setCustomers(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [shop?.id]);

  const filtered = customers.filter(c => {
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q));
  });

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop?.id || !name.trim()) return;

    await contactService.saveCustomer({
      id: generateUUID(),
      shopId: shop.id,
      name: name.trim(),
      phone: phone.trim() ? phone.replace(/[^0-9]/g, '').slice(-10) : null,
      location: location.trim() || null,
      totalBills: 0,
      pendingBalance: 0,
      statusTag: 'Regular',
      isActive: true,
    });

    setName('');
    setPhone('');
    setLocation('');
    setIsModalOpen(false);
    await loadData();
  };

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-heading text-[#111111]">Customer Directory & Khata</h2>
          <p className="text-xs text-[#76716B]">Track regular customers, purchase counts, and outstanding balances</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#76716B]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customer name or phone..."
              className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border border-[#EBE7E1] bg-white outline-hidden focus:border-[#FF5F00]"
            />
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-[#FF5F00] hover:bg-[#EA580C] text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Customer Directory Table */}
      <div className="bg-white rounded-2xl border border-[#EBE7E1] shadow-card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#76716B]">
            <div className="w-8 h-8 border-3 border-[#FF5F00] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Loading customers...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#76716B]">
            No customers found. Click "Add Customer" to save frequent patrons.
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF8F5] border-b border-[#EBE7E1] text-[#76716B] font-bold">
                  <tr>
                    <th className="py-3 px-4">Customer Name</th>
                    <th className="py-3 px-4">Contact Phone</th>
                    <th className="py-3 px-4">Location / Address</th>
                    <th className="py-3 px-4 text-center">Total Bills</th>
                    <th className="py-3 px-4 text-right">Pending Balance</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FAF8F5]">
                  {filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-[#FAF8F5] transition">
                      <td className="py-3 px-4 font-bold text-[#111111]">{c.name}</td>
                      <td className="py-3 px-4 text-[#76716B]">
                        {c.phone ? `+91 ${c.phone}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-[#76716B]">{c.location || '—'}</td>
                      <td className="py-3 px-4 text-center font-bold text-[#111111]">{c.totalBills}</td>
                      <td className="py-3 px-4 text-right font-extrabold text-sm text-amber-600">
                        {c.pendingBalance > 0 ? formatRupee(c.pendingBalance) : '₹0'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          c.pendingBalance > 0 ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
                        }`}>
                          {c.pendingBalance > 0 ? 'HAS DUE' : 'REGULAR'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View (< md) */}
            <div className="md:hidden divide-y divide-[#EBE7E1]">
              {filtered.map((c) => (
                <div key={c.id} className="p-3.5 space-y-1.5 hover:bg-[#FAF8F5] transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-[#111111]">{c.name}</span>
                      {c.phone && <span className="text-[11px] text-[#76716B] block">+91 {c.phone}</span>}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      c.pendingBalance > 0 ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
                    }`}>
                      {c.pendingBalance > 0 ? 'HAS DUE' : 'REGULAR'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-[#FAF8F5]">
                    <span className="text-[11px] text-[#76716B]">{c.location || 'Local Customer'} · {c.totalBills} bills</span>
                    <span className="text-xs font-black text-[#111111]">
                      {c.pendingBalance > 0 ? (
                        <span className="text-amber-600 font-extrabold">{formatRupee(c.pendingBalance)} Due</span>
                      ) : (
                        'No Due'
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* MODAL: ADD CUSTOMER */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-modal border border-[#EBE7E1]">
            <h3 className="text-base font-bold text-[#111111] mb-4">Add New Customer</h3>

            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Suresh Kumar"
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-[#EBE7E1] outline-hidden focus:border-[#FF5F00]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">Mobile Phone Number</label>
                <input
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="9876543210"
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-[#EBE7E1] outline-hidden focus:border-[#FF5F00]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">Location / Street</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Shop #4, Anna Nagar"
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-[#EBE7E1] outline-hidden focus:border-[#FF5F00]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#EBE7E1] text-xs font-bold text-[#76716B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#FF5F00] text-white text-xs font-bold shadow-md"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
