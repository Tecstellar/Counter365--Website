import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Percent,
  User,
  ShoppingBag,
  CreditCard,
  IndianRupee,
  Clock,
  Printer,
  Sparkles,
  ArrowRight,
  Split,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useShop } from '../../context/ShopContext';
import { useAuth } from '../../context/AuthContext';
import { menuService } from '../../services/menuService';
import { billingService } from '../../services/billingService';
import { exportService } from '../../services/exportService';
import { MenuItem, MenuCategory, PaymentMethod, Bill } from '../../types/models';
import { formatRupee, calculateGST } from '../../lib/money';
import confetti from 'canvas-confetti';

interface SalesMenuScreenProps {
  onBillCompleted?: (bill: Bill) => void;
  onOpenItemEditor?: () => void;
}

export const SalesMenuScreen: React.FC<SalesMenuScreenProps> = ({
  onBillCompleted,
  onOpenItemEditor,
}) => {
  const { shop, refreshSubscription } = useShop();
  const { profile, currentRole } = useAuth();
  const {
    cart,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    addCustomItem,
    discount,
    setDiscount,
    customer,
    setCustomer,
    editingBill,
    cancelEditingBill,
    flash,
  } = useCart();

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Checkout modal / quick pay
  const [paymentMode, setPaymentMode] = useState<PaymentMethod>('Cash');
  const [partialAmount, setPartialAmount] = useState<string>('');
  const [cashSplitAmount, setCashSplitAmount] = useState<string>('');
  const [gpaySplitAmount, setGpaySplitAmount] = useState<string>('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Discount Modal State
  const [isDiscountOpen, setIsDiscountOpen] = useState(false);
  const [discountVal, setDiscountVal] = useState<string>('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');

  // Customer Input State
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [isCustOpen, setIsCustOpen] = useState(false);

  // Custom Item Modal State
  const [isCustomItemOpen, setIsCustomItemOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');

  // Mobile Cart Drawer State
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Bill Success Modal
  const [savedBill, setSavedBill] = useState<Bill | null>(null);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadMenu = async (showLoading = true) => {
    if (!shop?.id) return;
    if (showLoading) setIsLoading(true);
    setIsRefreshing(true);
    try {
      const [cats, itms] = await Promise.all([
        menuService.getCategories(shop.id, shop.shopType),
        menuService.getMenuItems(shop.id, shop.shopType),
      ]);
      setCategories(cats);
      setItems(itms);
    } catch (err) {
      console.warn('Failed to load menu items:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!shop?.id) return;
    loadMenu(true);

    // Supabase Realtime synchronization across multi-device (Mobile Android / iOS / Web)
    const unsubscribe = menuService.subscribeToMenuChanges(shop.id, () => {
      loadMenu(false);
    });

    return () => {
      unsubscribe();
    };
  }, [shop?.id, shop?.shopType]);

  // Financial Calculations Matching Android
  const originalSubtotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);

  let discountAmount = 0;
  if (discount && discount.value > 0) {
    discountAmount = discount.type === 'percentage'
      ? (originalSubtotal * discount.value) / 100
      : discount.value;
    discountAmount = Math.max(0, Math.min(discountAmount, originalSubtotal));
  }

  const finalSubtotal = originalSubtotal - discountAmount;
  const gstRate = shop?.gstEnabled ? (shop.gstRate || 5) : 0;
  const gstAmount = shop?.gstEnabled ? calculateGST(finalSubtotal, gstRate) : 0;
  const totalAmount = finalSubtotal + gstAmount;

  // Filter items
  const filteredItems = items.filter(it => {
    if (it.isAvailable === false) return false;
    const matchesCat =
      selectedCategory === 'all' ||
      it.categoryId === selectedCategory ||
      (it as any).category === selectedCategory;
    const matchesQuery =
      !searchQuery.trim() ||
      it.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
    return matchesCat && matchesQuery;
  });

  const handleApplyDiscount = () => {
    const val = Number(discountVal);
    if (isNaN(val) || val <= 0) {
      setDiscount(null);
    } else {
      setDiscount({
        type: discountType,
        value: val,
        appliedBy: profile?.fullName || 'Cashier',
      });
    }
    setIsDiscountOpen(false);
  };

  const handleApplyCustomer = () => {
    setCustomer({
      name: custName.trim() || undefined,
      phone: custPhone.trim() || undefined,
    });
    setIsCustOpen(false);
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const p = Number(customPrice);
    if (!customName.trim() || isNaN(p) || p <= 0) return;
    addCustomItem(customName.trim(), p);
    setCustomName('');
    setCustomPrice('');
    setIsCustomItemOpen(false);
  };

  const handleCheckout = async (printDirect: boolean = true) => {
    if (!shop?.id || cart.length === 0) return;

    try {
      setIsCheckingOut(true);

      const splitCash = paymentMode === 'Cash + GPay' ? Number(cashSplitAmount) || 0 : undefined;
      const splitGpay = paymentMode === 'Cash + GPay' ? Number(gpaySplitAmount) || Math.max(0, totalAmount - (splitCash || 0)) : undefined;

      const res = await billingService.createBill({
        shopId: shop.id,
        cart,
        paymentMode,
        gstEnabled: shop.gstEnabled,
        gstRate: shop.gstRate,
        paidAmount: paymentMode === 'Partial Pay' ? Number(partialAmount) || 0 : undefined,
        cashAmount: splitCash,
        gpayAmount: splitGpay,
        customerName: customer?.name || custName.trim() || undefined,
        customerPhone: customer?.phone || custPhone.trim() || undefined,
        creator: {
          name: profile?.fullName || 'Owner',
          role: currentRole,
          id: profile?.id,
        },
        discount: discount ? {
          type: discount.type,
          value: discount.value,
          appliedBy: discount.appliedBy,
        } : undefined,
      });

      setIsCheckingOut(false);
      clearCart();
      setCustName('');
      setCustPhone('');
      setIsMobileCartOpen(false);
      await refreshSubscription();

      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
      flash(`Bill ${res.bill.billNumber} Saved Successfully!`);

      if (printDirect) {
        exportService.printReceipt(res.bill, shop);
      }

      setSavedBill(res.bill);
      if (onBillCompleted) onBillCompleted(res.bill);
    } catch (err: any) {
      setIsCheckingOut(false);
      flash(err?.message || 'Failed to complete checkout');
    }
  };

  const totalCartCount = cart.reduce((s, c) => s + c.quantity, 0);

  const renderCartContent = (isMobileModal = false) => (
    <div className="flex flex-col justify-between h-full bg-white overflow-hidden">
      {/* Cart Top Bar */}
      <div className="p-3.5 border-b border-[#EBE7E1] bg-white flex items-center justify-between shrink-0">
        <div>
          <h3 className="text-sm font-extrabold text-[#111111] flex items-center gap-1.5">
            <span>Current Order</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FF5F00] text-white">
              {totalCartCount}
            </span>
          </h3>
          {customer?.name ? (
            <p className="text-[11px] text-[#FF5F00] font-semibold truncate">
              Customer: {customer.name} {customer.phone ? `(${customer.phone})` : ''}
            </p>
          ) : (
            <p className="text-[11px] text-[#76716B]">Walk-in Customer</p>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsCustOpen(true)}
            title="Add Customer Details"
            className="p-1.5 rounded-lg border border-[#EBE7E1] text-[#76716B] hover:text-[#111111] transition"
          >
            <User className="w-3.5 h-3.5" />
          </button>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              title="Clear Cart"
              className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          {isMobileModal && (
            <button
              onClick={() => setIsMobileCartOpen(false)}
              className="px-2.5 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#EBE7E1] text-xs font-bold text-[#111111] hover:bg-[#F3F0EB] transition ml-1"
            >
              ✕ Close
            </button>
          )}
        </div>
      </div>

      {/* Cart Line Items */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#76716B]">
            <ShoppingBag className="w-10 h-10 text-[#DDD8CE] mb-2" />
            <p className="text-xs font-bold text-[#111111]">Order Cart is Empty</p>
            <p className="text-[11px]">Click any dish to add to this bill</p>
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between p-2 rounded-xl bg-[#FAF8F5] border border-[#EBE7E1]"
            >
              <div className="flex-1 mr-2 overflow-hidden">
                <h5 className="text-xs font-bold text-[#111111] truncate">
                  {item.name}
                  {item.isHalf && (
                    <span className="text-[10px] text-[#EA580C] font-semibold ml-1">(Half)</span>
                  )}
                </h5>
                <span className="text-[11px] text-[#76716B] font-semibold">
                  {formatRupee(item.unitPrice)} each
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Quantity Stepper */}
                <div className="flex items-center rounded-lg border border-[#EBE7E1] bg-white">
                  <button
                    onClick={() => updateQuantity(item.key, -1)}
                    className="p-1 text-[#76716B] hover:text-[#111111]"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center text-xs font-bold text-[#111111]">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.key, 1)}
                    className="p-1 text-[#76716B] hover:text-[#111111]"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <span className="text-xs font-extrabold text-[#111111] min-w-[50px] text-right">
                  {formatRupee(item.lineTotal)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Financial Summary & Payment Options */}
      <div className="p-3.5 border-t border-[#EBE7E1] bg-white space-y-3 shrink-0">
        {/* Subtotal, Discount, Tax Rows */}
        <div className="space-y-1 text-xs">
          <div className="flex justify-between text-[#76716B]">
            <span>Subtotal</span>
            <span className="font-semibold text-[#111111]">{formatRupee(originalSubtotal)}</span>
          </div>

          {discountAmount > 0 && (
            <div className="flex justify-between text-green-600 font-semibold">
              <span>Discount ({discount?.type === 'percentage' ? `${discount?.value}%` : 'Flat'})</span>
              <span>-{formatRupee(discountAmount)}</span>
            </div>
          )}

          {shop?.gstEnabled && (
            <div className="flex justify-between text-[#76716B]">
              <span>GST ({gstRate}%)</span>
              <span className="font-semibold text-[#111111]">{formatRupee(gstAmount)}</span>
            </div>
          )}

          <div className="pt-2 border-t border-[#EBE7E1] flex justify-between items-center">
            <span className="text-sm font-bold text-[#111111]">Grand Total</span>
            <span className="text-lg font-black text-[#FF5F00]">{formatRupee(totalAmount)}</span>
          </div>
        </div>

        {/* Quick Payment Mode Selector */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-[#76716B] uppercase tracking-wider">
              Payment Method
            </span>
            <button
              onClick={() => setIsDiscountOpen(true)}
              className="text-[11px] font-bold text-[#FF5F00] hover:underline flex items-center gap-0.5"
            >
              <Percent className="w-3 h-3" />
              <span>{discount ? 'Edit Discount' : 'Add Discount'}</span>
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {(['Cash', 'GPay', 'Pending', 'Partial Pay'] as PaymentMethod[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setPaymentMode(mode)}
                className={`py-2 rounded-xl text-xs font-bold border transition ${
                  paymentMode === mode
                    ? 'border-[#FF5F00] bg-[#FFF0E6] text-[#FF5F00]'
                    : 'border-[#EBE7E1] text-[#76716B] hover:text-[#111111]'
                }`}
              >
                {mode === 'Partial Pay' ? 'Partial' : mode}
              </button>
            ))}
          </div>

          {paymentMode === 'Partial Pay' && (
            <div className="mt-2 p-2 bg-[#FFF7ED] rounded-xl border border-[#FED7AA]">
              <label className="block text-[10px] font-bold text-[#EA580C] mb-1">
                Paid Amount Now (₹)
              </label>
              <input
                type="number"
                value={partialAmount}
                onChange={(e) => setPartialAmount(e.target.value)}
                placeholder={`e.g. ${Math.round(totalAmount / 2)}`}
                className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-[#FED7AA] bg-white outline-hidden"
              />
            </div>
          )}
        </div>

        {/* Checkout CTA */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleCheckout(false)}
            disabled={isCheckingOut || cart.length === 0}
            className="flex-1 py-3 rounded-xl border border-[#EBE7E1] bg-[#FAF8F5] hover:bg-[#F3F0EB] text-[#111111] font-bold text-xs transition disabled:opacity-50"
          >
            Save Only
          </button>
          <button
            onClick={() => handleCheckout(true)}
            disabled={isCheckingOut || cart.length === 0}
            className="flex-2 py-3 rounded-xl bg-[#FF5F00] hover:bg-[#EA580C] text-white font-extrabold text-xs shadow-md transition disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {isCheckingOut ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Printer className="w-4 h-4" />
                <span>Save & Print (₹{totalAmount})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex overflow-hidden bg-[#FAF8F5]">
      {/* LEFT: Menu Categories & Food Items Grid (65% width) */}
      <div className="flex-1 flex flex-col border-r border-[#EBE7E1] overflow-hidden">
        {/* Search & Actions Bar */}
        <div className="p-3 bg-white border-b border-[#EBE7E1] flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#76716B]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes & items (e.g. Tea, Dosa)..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#EBE7E1] text-xs font-semibold outline-hidden focus:border-[#FF5F00] bg-[#FAF8F5]"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadMenu(true)}
              title="Sync & Refresh Menu"
              disabled={isRefreshing}
              className="p-2 rounded-xl text-xs font-bold border border-[#EBE7E1] bg-white hover:bg-[#FAF8F5] text-[#76716B] hover:text-[#111111] transition flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#FF5F00] ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline text-[11px]">Sync</span>
            </button>

            <button
              onClick={() => setIsCustomItemOpen(true)}
              className="px-3 py-2 rounded-xl text-xs font-bold border border-[#EBE7E1] bg-white hover:bg-[#FAF8F5] text-[#111111] transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-[#FF5F00]" />
              <span>Custom Item</span>
            </button>

            {onOpenItemEditor && (
              <button
                onClick={onOpenItemEditor}
                className="hidden sm:inline-flex px-3 py-2 rounded-xl text-xs font-bold bg-[#FFF0E6] text-[#FF5F00] hover:bg-[#FFE7D6] transition"
              >
                Manage Menu
              </button>
            )}

            {/* Mobile View Cart Button */}
            <button
              onClick={() => setIsMobileCartOpen(true)}
              className="lg:hidden relative p-2 rounded-xl text-xs font-bold border border-[#EBE7E1] bg-white hover:bg-[#FAF8F5] text-[#111111] transition flex items-center"
              title="View Current Order Cart"
            >
              <ShoppingBag className="w-4 h-4 text-[#FF5F00]" />
              {totalCartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 rounded-full bg-[#FF5F00] text-white text-[9px] font-black flex items-center justify-center shadow-xs">
                  {totalCartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="px-3 py-2 bg-white border-b border-[#EBE7E1] flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition ${
              selectedCategory === 'all'
                ? 'bg-[#FF5F00] text-white shadow-xs'
                : 'bg-[#F3F0EB] text-[#76716B] hover:text-[#111111]'
            }`}
          >
            All Items ({items.length})
          </button>
          {categories.map((cat) => {
            const count = items.filter(i => (i.categoryId === cat.id || (i as any).category === cat.name) && i.isAvailable !== false).length;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition ${
                  selectedCategory === cat.id
                    ? 'bg-[#FF5F00] text-white shadow-xs'
                    : 'bg-[#F3F0EB] text-[#76716B] hover:text-[#111111]'
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>

        {/* Items Grid */}
        <div className="flex-1 p-4 overflow-y-auto">
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2 text-xs text-[#76716B]">
              <div className="w-8 h-8 border-3 border-[#FF5F00] border-t-transparent rounded-full animate-spin" />
              <span>Loading menu items...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-center">
              <ShoppingBag className="w-10 h-10 text-[#DDD8CE]" />
              <div>
                <p className="text-sm font-bold text-[#111111]">No menu items found</p>
                <p className="text-xs text-[#76716B]">Add dishes or custom items to start billing</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredItems.map((item) => {
                const fullInCart = cart.find(c => c.key === `${item.id}|full`);
                const halfInCart = cart.find(c => c.key === `${item.id}|half`);

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl border border-[#EBE7E1] p-3 shadow-xs hover:border-[#FED7AA] hover:shadow-card transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <h4 className="text-sm font-bold text-[#111111] leading-snug line-clamp-2">
                          {item.name}
                        </h4>
                      </div>
                      <span className="text-xs font-extrabold text-[#FF5F00] block mb-3">
                        {formatRupee(item.price)}
                        {item.hasHalf && item.halfPrice && (
                          <span className="text-[11px] font-semibold text-[#76716B] ml-1">
                            (Half: {formatRupee(item.halfPrice)})
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Add Buttons */}
                    <div className="space-y-1.5">
                      <button
                        onClick={() => addItem(item, false)}
                        className={`w-full py-1.5 px-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition ${
                          fullInCart
                            ? 'bg-[#FF5F00] text-white shadow-xs'
                            : 'bg-[#FAF8F5] hover:bg-[#FFF0E6] text-[#111111] border border-[#EBE7E1]'
                        }`}
                      >
                        <span>{item.hasHalf ? 'Full Portion' : 'Add Item'}</span>
                        <span className="font-extrabold">
                          {fullInCart ? `× ${fullInCart.quantity}` : '+'}
                        </span>
                      </button>

                      {item.hasHalf && item.halfPrice && (
                        <button
                          onClick={() => addItem(item, true)}
                          className={`w-full py-1 px-2.5 rounded-xl text-[11px] font-bold flex items-center justify-between transition ${
                            halfInCart
                              ? 'bg-[#EA580C] text-white shadow-xs'
                              : 'bg-white hover:bg-[#FFF0E6] text-[#EA580C] border border-[#FED7AA]'
                          }`}
                        >
                          <span>Half Portion</span>
                          <span className="font-extrabold">
                            {halfInCart ? `× ${halfInCart.quantity}` : '+'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Desktop Live POS Cart & Instant Checkout (hidden on mobile, fixed on desktop) */}
      <div className="hidden lg:flex w-88 xl:w-96 bg-white flex-col justify-between shrink-0 border-l border-[#EBE7E1] shadow-lg z-10">
        {renderCartContent(false)}
      </div>

      {/* MOBILE: Floating Sticky Cart Bar (Shown when cart has items on screens < lg) */}
      {cart.length > 0 && !isMobileCartOpen && (
        <div className="lg:hidden fixed bottom-20 left-3 right-3 bg-[#111111] text-white p-3 rounded-2xl shadow-2xl flex items-center justify-between z-30 animate-in slide-in-from-bottom duration-200 border border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FF5F00] text-white flex items-center justify-center font-black text-xs shadow-xs">
              {totalCartCount}
            </div>
            <div>
              <div className="text-xs font-black tracking-tight">{formatRupee(totalAmount)}</div>
              <div className="text-[10px] text-gray-300 font-medium">
                {totalCartCount} {totalCartCount === 1 ? 'dish' : 'dishes'} in bill
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsMobileCartOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#FF5F00] hover:bg-[#EA580C] text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition"
          >
            <span>Review & Pay</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* MOBILE: Slide-Up Cart Bottom Sheet Modal */}
      {isMobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end">
          <div className="bg-white w-full max-h-[88vh] rounded-t-3xl overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-250">
            {renderCartContent(true)}
          </div>
        </div>
      )}

      {/* MODAL: CUSTOM ITEM */}
      {isCustomItemOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-modal border border-[#EBE7E1]">
            <h3 className="text-sm font-bold text-[#111111] mb-3">Add Custom Line Item</h3>
            <form onSubmit={handleAddCustom} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#76716B] mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Special Sweet Box"
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-[#EBE7E1] outline-hidden focus:border-[#FF5F00]"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#76716B] mb-1">Price (₹)</label>
                <input
                  type="number"
                  required
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  placeholder="150"
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-[#EBE7E1] outline-hidden focus:border-[#FF5F00]"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCustomItemOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-[#EBE7E1] text-xs font-bold text-[#76716B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-[#FF5F00] text-white text-xs font-bold"
                >
                  Add to Cart
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DISCOUNT */}
      {isDiscountOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-modal border border-[#EBE7E1]">
            <h3 className="text-sm font-bold text-[#111111] mb-3">Apply Order Discount</h3>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setDiscountType('percentage')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold border ${
                  discountType === 'percentage'
                    ? 'border-[#FF5F00] bg-[#FFF0E6] text-[#FF5F00]'
                    : 'border-[#EBE7E1] text-[#76716B]'
                }`}
              >
                Percentage (%)
              </button>
              <button
                type="button"
                onClick={() => setDiscountType('fixed')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold border ${
                  discountType === 'fixed'
                    ? 'border-[#FF5F00] bg-[#FFF0E6] text-[#FF5F00]'
                    : 'border-[#EBE7E1] text-[#76716B]'
                }`}
              >
                Flat Rupee (₹)
              </button>
            </div>
            <div className="mb-4">
              <input
                type="number"
                value={discountVal}
                onChange={(e) => setDiscountVal(e.target.value)}
                placeholder={discountType === 'percentage' ? '10 (for 10%)' : '50 (for ₹50)'}
                className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-[#EBE7E1] outline-hidden focus:border-[#FF5F00]"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setDiscount(null); setIsDiscountOpen(false); }}
                className="flex-1 py-2 rounded-xl border border-[#EBE7E1] text-xs font-bold text-[#76716B]"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleApplyDiscount}
                className="flex-1 py-2 rounded-xl bg-[#FF5F00] text-white text-xs font-bold"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CUSTOMER INFO */}
      {isCustOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-modal border border-[#EBE7E1]">
            <h3 className="text-sm font-bold text-[#111111] mb-3">Customer Information</h3>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-[#76716B] mb-1">Customer Name</label>
                <input
                  type="text"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-[#EBE7E1] outline-hidden focus:border-[#FF5F00]"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#76716B] mb-1">Mobile Phone (Optional)</label>
                <input
                  type="tel"
                  maxLength={10}
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="9876543210"
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-[#EBE7E1] outline-hidden focus:border-[#FF5F00]"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsCustOpen(false)}
                className="flex-1 py-2 rounded-xl border border-[#EBE7E1] text-xs font-bold text-[#76716B]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyCustomer}
                className="flex-1 py-2 rounded-xl bg-[#FF5F00] text-white text-xs font-bold"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
