import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useShop } from '../../context/ShopContext';
import { billingService } from '../../services/billingService';
import { menuService } from '../../services/menuService';
import { expenseService } from '../../services/expenseService';
import { contactService } from '../../services/contactService';
import { shopService, DEFAULT_ROLE_PERMS, MODULE_PERMISSIONS } from '../../services/shopService';
import { Bill, Shop, MenuItem, MenuCategory, ExpenseRecord, CustomerRecord, VendorRecord, PaymentMethod, ShopMember, UserRole, PermissionKey, SubscriptionPlanId } from '../../types/models';
import { subscriptionService, PRO_PLANS } from '../../services/subscriptionService';
import { generateUUID } from '../../lib/uuid';
import { webPrinterService } from '../../services/webPrinterService';
import { webWhatsappService } from '../../services/webWhatsappService';
import { staffService } from '../../services/staffService';
import { UsersStaffSection } from '../../components/settings/UsersStaffSection';
import {
  Store,
  Users,
  Printer,
  Sparkles,
  Camera,
  Crown,
  Calendar,
  BarChart3,
  TrendingUp,
  CalendarDays,
  Star,
  Banknote,
  Smartphone,
  Clock,
  FileText,
  FileSpreadsheet,
  Download,
  Eye,
  Share2,
  Truck,
  Phone,
  MessageCircle,
  Plus,
  Search,
  Wallet,
  Coffee,
  Check,
  ChevronDown,
  ChevronUp,
  X,
  CreditCard,
  Shield,
  Layers,
  ArrowRight,
  RefreshCw,
  MoreVertical,
  UserCheck,
  UserX,
} from 'lucide-react';
import './Dashboard.css';

type DashboardTab = 'home' | 'pos' | 'bills' | 'khata' | 'menu' | 'exp' | 'cust' | 'rep' | 'set';

interface CartItemState {
  key: string;
  itemId: string;
  n: string; // name
  p: number; // price
  q: number; // quantity
  c: string; // category
  portion: 'full' | 'half';
}

export const DashboardApp: React.FC = () => {
  const { profile, member, currentRole, can, logout, isLoading: isAuthLoading } = useAuth();
  const { shop, subscriptionStatus, updateShop, uploadLogo, isLoading: isShopLoading } = useShop();

  // Navigation State
  const [tab, setTab] = useState<DashboardTab>('home');
  const [isTamil, setIsTamil] = useState<boolean>(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('@counterpro/theme') as 'light' | 'dark') || 'light';
  });

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('@counterpro/theme', next);
      return next;
    });
  };

  const [toastMsg, setToastMsg] = useState<string>('');
  const toastTimerRef = useRef<any>(null);

  // Data States
  const [bills, setBills] = useState<Bill[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categoriesList, setCategoriesList] = useState<MenuCategory[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [vendors, setVendors] = useState<VendorRecord[]>([]);

  // POS State
  const [posCat, setPosCat] = useState<string>('All');
  const [posSearchQuery, setPosSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<CartItemState[]>([]);
  const [payMode, setPayMode] = useState<PaymentMethod>('Cash');
  const [checkoutBillDate, setCheckoutBillDate] = useState<'today' | 'yesterday'>('today');
  const [splitCashAmount, setSplitCashAmount] = useState<string>('');
  const [splitGPayAmount, setSplitGPayAmount] = useState<string>('');
  const [partialPaidAmount, setPartialPaidAmount] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [custSearchInput, setCustSearchInput] = useState<string>('');
  const [custPhoneInput, setCustPhoneInput] = useState<string>('');
  const [isSearchingCustomer, setIsSearchingCustomer] = useState<boolean>(false);
  const [savedBillSuccess, setSavedBillSuccess] = useState<Bill | null>(null);
  const successTimerRef = useRef<any>(null);
  const [showUnidentifiedModal, setShowUnidentifiedModal] = useState<boolean>(false);
  const [unidentifiedName, setUnidentifiedName] = useState<string>('');
  const [unidentifiedPrice, setUnidentifiedPrice] = useState<string>('');

  // Bills Filter, Actions & Edit State
  const [billsFilter, setBillsFilter] = useState<'All' | 'Paid' | 'Due' | 'Edited' | 'Deleted'>('All');
  const [openBillMenuId, setOpenBillMenuId] = useState<string | null>(null);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [editBillCustName, setEditBillCustName] = useState<string>('');
  const [editBillCustPhone, setEditBillCustPhone] = useState<string>('');
  const [editBillPayMode, setEditBillPayMode] = useState<PaymentMethod>('Cash');
  const [editBillPaidAmount, setEditBillPaidAmount] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Customers & Vendors State
  const [contactsSubTab, setContactsSubTab] = useState<'customers' | 'vendors'>('customers');
  const [newCustName, setNewCustName] = useState<string>('');
  const [newCustPhone, setNewCustPhone] = useState<string>('');
  const [newVendorName, setNewVendorName] = useState<string>('');
  const [newVendorPhone, setNewVendorPhone] = useState<string>('');
  const [newVendorCategory, setNewVendorCategory] = useState<string>('Milk & Dairy');
  const [newVendorSupplyInfo, setNewVendorSupplyInfo] = useState<string>('');

  // Menu Screen State
  const [menuCatFilter, setMenuCatFilter] = useState<string>('All');
  const [menuSearchQuery, setMenuSearchQuery] = useState<string>('');
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [menuFormName, setMenuFormName] = useState<string>('');
  const [menuFormPrice, setMenuFormPrice] = useState<string>('');
  const [menuFormHalfPrice, setMenuFormHalfPrice] = useState<string>('');
  const [menuFormCatId, setMenuFormCatId] = useState<string>('');
  const [menuFormIsFavorite, setMenuFormIsFavorite] = useState<boolean>(false);
  const [menuFormIsAvailable, setMenuFormIsAvailable] = useState<boolean>(true);

  // Category Modal State
  const [showAddCategoryModal, setShowAddCategoryModal] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>('');

  // Expense Screen State
  const [newExpDesc, setNewExpDesc] = useState<string>('');
  const [newExpAmount, setNewExpAmount] = useState<string>('');
  const [newExpCat, setNewExpCat] = useState<string>('Ingredients');

  // Settings State
  const [prefPrint, setPrefPrint] = useState<boolean>(true);
  const [prefUpi, setPrefUpi] = useState<boolean>(true);
  const [prefLowStock, setPrefLowStock] = useState<boolean>(false);
  const [prefSound, setPrefSound] = useState<boolean>(true);
  const [shopFormName, setShopFormName] = useState<string>('');
  const [shopFormType, setShopFormType] = useState<string>('');
  const [shopFormCity, setShopFormCity] = useState<string>('');

  // Settings & Account Section States
  const [settingsSlider, setSettingsSlider] = useState<'profile' | 'staff'>('profile');
  const [isEditingShop, setIsEditingShop] = useState<boolean>(false);
  const [editShopName, setEditShopName] = useState<string>('');
  const [editShopPhone, setEditShopPhone] = useState<string>('');
  const [editShopCity, setEditShopCity] = useState<string>('');
  const [editOwnerName, setEditOwnerName] = useState<string>('');
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  // Users & Staff State
  const [staffList, setStaffList] = useState<ShopMember[]>([]);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState<boolean>(false);
  const [editingStaffMember, setEditingStaffMember] = useState<ShopMember | null>(null);
  const [newStaffName, setNewStaffName] = useState<string>('');
  const [newStaffPhone, setNewStaffPhone] = useState<string>('');
  const [newStaffRole, setNewStaffRole] = useState<UserRole>('Supervisor');
  const [newStaffOverrides, setNewStaffOverrides] = useState<Record<PermissionKey, boolean>>({
    bill: true,
    total: true,
    exp: true,
    pend: true,
    report: true,
    menu: true,
    menu_delete: true,
    users: false,
    subscription: false,
  });

  // Hardware & Billing Toggles
  const [isScanningPrinters, setIsScanningPrinters] = useState<boolean>(false);
  const [printerScanDone, setPrinterScanDone] = useState<boolean>(false);
  const [isGstEditorOpen, setIsGstEditorOpen] = useState<boolean>(false);
  const [gstRateInput, setGstRateInput] = useState<string>('5');
  const [isTableEditorOpen, setIsTableEditorOpen] = useState<boolean>(false);
  const [tableCountInput, setTableCountInput] = useState<string>('6');

  // Dining & Table POS Billing State
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [isTableModalOpen, setIsTableModalOpen] = useState<boolean>(false);

  // Day Closing State
  const [isDayClosed, setIsDayClosed] = useState<boolean>(false);
  const [showDayClosingModal, setShowDayClosingModal] = useState<boolean>(false);

  // Reports Screen Advanced State
  const [reportsMainTab, setReportsMainTab] = useState<'monthly' | 'summary'>('monthly');
  const [reportsMonthlySubTab, setReportsMonthlySubTab] = useState<'summary' | 'daywise'>('summary');
  const [reportDate, setReportDate] = useState<Date>(new Date(2026, 9, 30)); // October 2026 default
  const [showReportPreviewModal, setShowReportPreviewModal] = useState<boolean>(false);
  const [expandedYear, setExpandedYear] = useState<number | null>(2026);
  const [selectedSummaryMonth, setSelectedSummaryMonth] = useState<string>('2026-10');
  const [expandedSummaryDate, setExpandedSummaryDate] = useState<string | null>('2026-10-30');

  // Hourly Clock Hover State
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);

  // Pro Upgrade Modal State
  const [showUpgradeProModal, setShowUpgradeProModal] = useState<boolean>(false);

  // Partial Due Collection & Customer Dues State
  const [collectingCustomerDue, setCollectingCustomerDue] = useState<{
    customerName: string;
    customerPhone?: string;
    totalDue: number;
    bills: Bill[];
    targetBill?: Bill;
  } | null>(null);
  const [collectPayingNow, setCollectPayingNow] = useState<string>('');
  const [collectPayMethod, setCollectPayMethod] = useState<PaymentMethod>('Cash');
  const [isCollectingDue, setIsCollectingDue] = useState<boolean>(false);
  const [expandedCustomerKey, setExpandedCustomerKey] = useState<string | null>(null);

  // Customer Edit & Active/Inactive State
  const [customerActionMenuId, setCustomerActionMenuId] = useState<string | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<CustomerRecord | null>(null);
  const [editCustName, setEditCustName] = useState<string>('');
  const [editCustPhone, setEditCustPhone] = useState<string>('');
  const [editCustNotes, setEditCustNotes] = useState<string>('');
  const [editCustIsActive, setEditCustIsActive] = useState<boolean>(true);

  // Tea Shop / Café Standard Expense Presets
  const TEA_SHOP_EXPENSE_PRESETS = [
    { desc: 'Milk Packets / Dairy', cat: 'Ingredients' },
    { desc: 'Tea Powder / Dust', cat: 'Ingredients' },
    { desc: 'Coffee Powder / Beans', cat: 'Ingredients' },
    { desc: 'Sugar / Jaggery', cat: 'Ingredients' },
    { desc: 'Gas Cylinder (LPG Refill)', cat: 'Utilities' },
    { desc: 'Paper Cups (Tea / Coffee)', cat: 'Supplies' },
    { desc: 'Parcel Glass, Lids & Straws', cat: 'Supplies' },
    { desc: 'Snacks / Biscuits / Bun Wholesale', cat: 'Ingredients' },
    { desc: 'Cardamom (Elaichi) & Tea Spices', cat: 'Ingredients' },
    { desc: 'Lemons & Fruits for Juices', cat: 'Ingredients' },
    { desc: 'Staff Daily Wages / Bata', cat: 'Salary' },
    { desc: 'Cleaning Supplies & Detergents', cat: 'Maintenance' },
    { desc: 'Ice Blocks & Mineral Water Cans', cat: 'Utilities' },
    { desc: 'Electricity / Shop Utilities', cat: 'Utilities' },
    { desc: 'Machine / Stove / Equipment Repair', cat: 'Maintenance' },
    { desc: 'Custom Reason', cat: 'Other' },
  ];
  const [selectedExpensePreset, setSelectedExpensePreset] = useState<string>('Milk Packets / Dairy');
  const [isCustomExpenseReason, setIsCustomExpenseReason] = useState<boolean>(false);
  const [customExpenseReason, setCustomExpenseReason] = useState<string>('');

  // Show Toast
  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMsg('');
    }, 2500);
  };

  // WhatsApp Day Closing Report Action
  const handleSendToWhatsApp = () => {
    const todayFormatted = new Date().toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const text = `🧾 *DAY CLOSING REGISTER - ${shop?.name || 'Counter 365'}*
📅 *Date:* ${todayFormatted}
📍 *Location:* ${shop?.city || 'Counter 365'}

📊 *TODAY'S REVENUE SETTLED & REGISTER:*
• Total Sales: ${fm(totals.sales)}
• Bills Generated: ${totals.n} bills
• Cash in Drawer: ${fm(totals.cash)}
• GPay / UPI: ${fm(totals.upi)}
• Pending Khata: ${fm(totals.due)}
• Total Expenses: ${fm(totals.exp)}
--------------------------------
💰 *NET PROFIT: ${fm(totals.net)}*

Generated via Counter365 Cloud POS`;

    const rawPhone = (shop?.phone || profile?.phone || '').replace(/\D/g, '');
    const targetPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;

    const url = targetPhone
      ? `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(url, '_blank');
    showToast('Opening WhatsApp day closing text...');
  };

  // Print Day Closing Action
  const handlePrintDayClosing = () => {
    window.print();
    showToast('Sending Day Closing to printer...');
  };

  // Initial Data Load
  useEffect(() => {
    if (!shop?.id) return;

    let isMounted = true;
    async function loadAll() {
      try {
        const [bList, mList, eList, cList, catList, vList, staff] = await Promise.all([
          billingService.getBills(shop!.id),
          menuService.getMenuItems(shop!.id, (shop!.shopType as any) || 'Tea Shop'),
          expenseService.getExpenses(shop!.id),
          contactService.getCustomers(shop!.id),
          menuService.getCategories(shop!.id, (shop!.shopType as any) || 'Tea Shop'),
          contactService.getVendors(shop!.id),
          staffService.getShopMembers(shop!.id),
        ]);

        if (isMounted) {
          setBills(bList);
          setMenuItems(mList);
          setCategoriesList(catList);
          setExpenses(eList);
          setCustomers(cList);
          setVendors(vList || []);
          setStaffList(staff || []);
          setShopFormName(shop!.name || '');
          setShopFormType(shop!.shopType || 'Tea shop · Cafe');
          setShopFormCity(shop!.city || 'Anna Nagar, Chennai');
          setEditShopName(shop!.name || '');
          setEditShopPhone(shop!.phone || '');
          setEditShopCity(shop!.city || '');
          setEditOwnerName(shop!.ownerName || profile?.fullName || '');
          setGstRateInput(String(shop!.gstRate || 5));
          setTableCountInput(String(shop!.tableCount || 6));
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      }
    }

    loadAll();

    // Real-time synchronization for menu items & categories with mobile app
    const unsubscribeMenu = menuService.subscribeToMenuChanges(shop.id, async () => {
      try {
        const [freshItems, freshCats] = await Promise.all([
          menuService.getMenuItems(shop.id, (shop.shopType as any) || 'Tea Shop'),
          menuService.getCategories(shop.id, (shop.shopType as any) || 'Tea Shop'),
        ]);
        if (isMounted) {
          setMenuItems(freshItems);
          setCategoriesList(freshCats);
        }
      } catch (err) {
        console.warn('Realtime menu update error:', err);
      }
    });

    // Real-time synchronization for staff accounts & permissions with mobile app
    const unsubscribeStaff = staffService.subscribeToShopMembers(shop.id, async () => {
      try {
        const freshStaff = await staffService.getShopMembers(shop.id);
        if (isMounted) {
          setStaffList(freshStaff || []);
        }
      } catch (err) {
        console.warn('Realtime staff update error:', err);
      }
    });

    return () => {
      isMounted = false;
      unsubscribeMenu();
      unsubscribeStaff();
    };
  }, [shop?.id]);

  // Tab access control based on active staff role & permissions
  const canAccessTab = (t: DashboardTab): boolean => {
    if (currentRole === 'Owner') return true;
    switch (t) {
      case 'home':
        return true;
      case 'pos':
        return can('bill');
      case 'bills':
        return can('total') || can('bill');
      case 'khata':
        return can('pend');
      case 'menu':
        return can('menu');
      case 'exp':
        return can('exp');
      case 'cust':
        return true;
      case 'rep':
        return can('report');
      case 'set':
        return can('users');
      default:
        return true;
    }
  };

  // If active tab permissions are revoked, kick back to allowed tab (home)
  useEffect(() => {
    if (!canAccessTab(tab)) {
      setTab('home');
      showToast('You do not have access to that module');
    }
  }, [tab, currentRole, member?.overrides]);

  // Close open bill popups on outside click
  useEffect(() => {
    const handleOutsideClick = () => {
      setOpenBillMenuId(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Keyboard navigation shortcuts 1 to 9 (strictly filtered by permitted tabs)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        ['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName) ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey
      ) {
        return;
      }
      const navKeys: DashboardTab[] = ['home', 'pos', 'bills', 'khata', 'menu', 'exp', 'cust', 'rep', 'set'];
      const allowedKeys = navKeys.filter((t) => canAccessTab(t));
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= allowedKeys.length) {
        setTab(allowedKeys[num - 1]);
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentRole, member?.overrides]);

  // Format rupee
  const fm = (n: number) => '₹' + Math.round(n || 0).toLocaleString('en-IN');
  const esc = (s: string) => String(s || '');

  // Format bill number preserving mobile prefix (e.g. TTS-November-001 or #0001)
  const bn = (numStr: string | number) => {
    if (!numStr) return '#001';
    const s = String(numStr).trim();
    return s;
  };

  // Helper for today's date in Indian Standard Time (Asia/Kolkata, YYYY-MM-DD)
  const getTodayISTDateStr = () => {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  };

  const isTodayIST = (dateStr?: string | null, targetToday = getTodayISTDateStr()) => {
    if (!dateStr) return false;
    try {
      const d = new Date(dateStr);
      const formatted = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(d);
      return formatted === targetToday;
    } catch {
      return String(dateStr).startsWith(targetToday);
    }
  };

  // Financial Totals Calculation (Strictly for TODAY'S trading, excludes deleted bills)
  const totals = useMemo(() => {
    let cash = 0;
    let upi = 0;
    let due = 0;
    const todayDateStr = getTodayISTDateStr();

    // Filter strictly to non-deleted bills created TODAY in IST
    const todayBills = bills.filter(
      (b) => b.status !== 'deleted' && isTodayIST(b.createdAt, todayDateStr)
    );
    const count = todayBills.length;

    todayBills.forEach((b) => {
      const amt = Number(b.totalAmount) || 0;
      const pending = Number(b.pendingAmount) || 0;
      const paid = Number(b.paidAmount) || 0;

      if (b.paymentMode === 'Pending' || pending > 0) {
        due += pending;
        if (paid > 0) {
          cash += paid; // Partial payment received
        }
      } else if (b.paymentMode === 'GPay') {
        upi += amt;
      } else if (b.paymentMode === 'Cash + GPay') {
        cash += Number(b.cashAmount) || 0;
        upi += Number(b.gpayAmount) || Math.max(0, amt - (Number(b.cashAmount) || 0));
      } else {
        cash += amt;
      }
    });

    // Filter strictly to expenses recorded TODAY in IST
    const todayExpenses = expenses.filter(
      (e) => (e.expenseDate && e.expenseDate === todayDateStr) || isTodayIST(e.createdAt, todayDateStr)
    );
    const expTotal = todayExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const sales = cash + upi;
    const net = sales - expTotal;

    return {
      cash,
      upi,
      sales,
      n: count,
      due,
      exp: expTotal,
      net,
    };
  }, [bills, expenses]);

  // Hourly Breakdown (14 buckets: 8 AM to 9 PM strictly for TODAY)
  const hourlyData = useMemo(() => {
    const buckets = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const todayDateStr = getTodayISTDateStr();

    bills.forEach((b) => {
      if (b.status !== 'deleted' && isTodayIST(b.createdAt, todayDateStr)) {
        const d = new Date(b.createdAt);
        const hour = d.getHours();
        const bucketIdx = hour - 8;
        if (bucketIdx >= 0 && bucketIdx < 14) {
          buckets[bucketIdx] += Number(b.totalAmount) || 0;
        }
      }
    });

    return buckets;
  }, [bills]);

  const hl = (i: number) => {
    const h = 8 + i;
    return h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;
  };

  const goal = 20000;
  const goalPct = Math.min(100, (totals.sales / goal) * 100);
  const goalSub = totals.sales >= goal ? 'Daily goal reached' : `of ${fm(goal)} goal · ${Math.round(goalPct)}%`;

  // Category ID -> Category Name mapping
  const categoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    categoriesList.forEach((c) => {
      if (c.id) map[c.id] = c.name;
      if (c.name) map[c.name] = c.name;
    });
    return map;
  }, [categoriesList]);

  const getCategoryName = (categoryIdOrName?: string): string => {
    if (!categoryIdOrName) return 'General';
    if (categoryMap[categoryIdOrName]) return categoryMap[categoryIdOrName];
    // If it looks like a raw UUID, match against categoriesList
    if (categoryIdOrName.includes('-') && categoryIdOrName.length > 25) {
      const match = categoriesList.find((c) => c.id === categoryIdOrName);
      if (match) return match.name;
      return 'General';
    }
    return categoryIdOrName;
  };

  // Top 12 categories + All (Human Readable Names, not raw IDs)
  const top12Categories = useMemo(() => {
    const counts: Record<string, number> = {};
    menuItems.forEach((m) => {
      const catName = getCategoryName(m.categoryId);
      counts[catName] = (counts[catName] || 0) + 1;
    });
    categoriesList.forEach((c) => {
      if (c.name && !counts[c.name]) {
        counts[c.name] = 0;
      }
    });
    const sorted = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    return ['All', ...sorted.slice(0, 12)];
  }, [menuItems, categoriesList, categoryMap]);

  // Loading Screen
  if (isAuthLoading || isShopLoading) {
    return (
      <div className="min-h-screen bg-[#edeef3] flex flex-col items-center justify-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-white border border-[#e4e6ee] flex items-center justify-center p-2.5 shadow-md">
          <img src="/counter365_mark.png" alt="Counter 365" className="w-full h-full object-contain" />
        </div>
        <div className="w-6 h-6 border-2 border-[#ff5f00] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold text-[#8b8fa0]">Connecting to Counter 365 Cloud...</span>
      </div>
    );
  }

  if (!profile) return <Navigate to="/login" replace />;
  if (!shop || !shop.id) return <Navigate to="/register" replace />;

  // Cart operations with GST & Round-Off
  const cartSubtotal = cart.reduce((s, x) => s + x.p * x.q, 0);
  const cartGstAmount = shop?.gstEnabled ? Math.round(((cartSubtotal * (shop.gstRate || 5)) / 100) * 100) / 100 : 0;
  const rawCartTotal = cartSubtotal + cartGstAmount;
  const cartTotal = shop?.roundOffEnabled ? Math.round(rawCartTotal) : rawCartTotal;
  const cartCount = cart.reduce((s, x) => s + x.q, 0);

  const formatDisplayQty = (q: number) => {
    if (q === 0.5) return '½';
    if (q % 1 === 0.5) return `${Math.floor(q)}½`;
    return String(q);
  };

  const addFullItem = (item: MenuItem) => {
    const catName = getCategoryName(item.categoryId);
    const key = `${item.id}-full`;
    setCart((prev) => {
      const idx = prev.findIndex((x) => x.key === key);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx].q += 1;
        return copy;
      }
      return [
        ...prev,
        {
          key,
          itemId: item.id,
          n: item.name,
          p: Number(item.price),
          q: 1,
          c: catName,
          portion: 'full',
        },
      ];
    });
  };

  const addHalfItem = (item: MenuItem) => {
    const catName = getCategoryName(item.categoryId);
    const key = `${item.id}-half`;
    const halfPrice =
      item.halfPrice != null && Number(item.halfPrice) > 0
        ? Number(item.halfPrice)
        : Math.round(item.price / 2);

    setCart((prev) => {
      const idx = prev.findIndex((x) => x.key === key);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx].q += 1;
        return copy;
      }
      return [
        ...prev,
        {
          key,
          itemId: item.id,
          n: `${item.name} (½)`,
          p: halfPrice,
          q: 1,
          c: catName,
          portion: 'half',
        },
      ];
    });
    showToast(`Added ½ ${item.name} (${fm(halfPrice)})`);
  };

  const minusItemFromCard = (itemId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCart((prev) => {
      const halfIdx = prev.findIndex((x) => x.itemId === itemId && x.portion === 'half');
      const fullIdx = prev.findIndex((x) => x.itemId === itemId && x.portion === 'full');
      const targetIdx = halfIdx >= 0 ? halfIdx : fullIdx;
      if (targetIdx < 0) return prev;

      const copy = [...prev];
      if (copy[targetIdx].q <= 1) {
        copy.splice(targetIdx, 1);
      } else {
        copy[targetIdx].q -= 1;
      }
      return copy;
    });
  };

  const handleAddUnidentified = () => {
    const amt = parseFloat(unidentifiedPrice);
    if (isNaN(amt) || amt <= 0) {
      showToast('Enter a valid price.');
      return;
    }
    const name = unidentifiedName.trim() || 'Unidentified item';
    const customId = `unid_${Date.now()}`;
    const key = `${customId}-full`;
    setCart((prev) => [
      ...prev,
      {
        key,
        itemId: customId,
        n: name,
        p: amt,
        q: 1,
        c: 'Unidentified',
        portion: 'full',
      },
    ]);
    setShowUnidentifiedModal(false);
    setUnidentifiedName('');
    setUnidentifiedPrice('');
    showToast(`Added ${name} · ${fm(amt)}`);
  };

  const incCart = (index: number) => {
    setCart((prev) => {
      const copy = [...prev];
      copy[index].q += 1;
      return copy;
    });
  };

  const decCart = (index: number) => {
    setCart((prev) => {
      const copy = [...prev];
      if (copy[index].q <= 1) {
        copy.splice(index, 1);
        return copy;
      }
      copy[index].q -= 1;
      return copy;
    });
  };

  // Core Bill Execution
  const executeBillSave = async (options: {
    shareViaWhatsApp: boolean;
    customerName: string;
    customerPhone?: string;
  }) => {
    if (!cart.length) {
      showToast('Add an item to the order first.');
      return;
    }

    try {
      const cartItemsForService = cart.map((c) => ({
        key: c.key || `${c.itemId}|${c.portion || 'full'}`,
        itemId: c.itemId,
        name: c.n,
        unitPrice: c.p,
        quantity: c.q,
        isHalf: c.portion === 'half',
        lineTotal: c.p * c.q,
      }));

      // Date: today or yesterday
      let customCreatedAt: string | undefined = undefined;
      if (checkoutBillDate === 'yesterday') {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        customCreatedAt = d.toISOString();
      }

      // Amounts by payment mode
      let cashAmt: number | undefined = undefined;
      let gpayAmt: number | undefined = undefined;
      let paidAmt: number | undefined = undefined;

      if (payMode === 'Cash + GPay') {
        cashAmt = Number(splitCashAmount) || Math.floor(cartTotal / 2);
        gpayAmt = Number(splitGPayAmount) || Math.max(0, cartTotal - cashAmt);
      } else if (payMode === 'Partial Pay') {
        paidAmt = Math.max(0, Math.min(cartTotal, Number(partialPaidAmount) || 0));
      }

      const res = await billingService.createBill({
        shopId: shop.id,
        invoicePrefix: shop.invoicePrefix,
        cart: cartItemsForService,
        paymentMode: payMode,
        gstEnabled: !!shop.gstEnabled,
        gstRate: shop.gstRate,
        roundOffEnabled: !!shop.roundOffEnabled,
        tableNumber: selectedTable || null,
        customerName: options.customerName,
        customerPhone: options.customerPhone || '',
        customerId: selectedCustomer?.id,
        cashAmount: cashAmt,
        gpayAmount: gpayAmt,
        paidAmount: paidAmt,
        createdAt: customCreatedAt,
        creator: {
          id: profile.id,
          name: profile.fullName || 'Owner',
          role: currentRole,
        },
      });

      if (res && res.bill) {
        const savedBill = res.bill;
        setBills((prev) => [savedBill, ...prev]);

        // If customer is new and provided, save to customers
        if (!selectedCustomer && options.customerName && options.customerName !== 'Walk-in guest') {
          const newCustId = generateUUID();
          const due = savedBill.pendingAmount || 0;
          const newCust: CustomerRecord = {
            id: newCustId,
            shopId: shop.id,
            name: options.customerName,
            phone: options.customerPhone || null,
            pendingBalance: due,
            totalBills: 1,
            isActive: true,
          };
          try {
            await contactService.saveCustomer(newCust);
            setCustomers((prev) => [newCust, ...prev]);
          } catch {}
        }

        // WhatsApp Share via webWhatsappService
        if (options.shareViaWhatsApp) {
          webWhatsappService.shareCustomerBill(
            savedBill,
            shop?.name || 'Counter 365',
            shop?.upiId,
            shop?.phone,
            options.customerPhone
          );
        }

        // Instantly trigger Thermal Printer print
        try {
          webPrinterService.printReceipt(
            savedBill,
            shop || ({ name: 'Counter 365', phone: '', address: '' } as Shop),
            shop?.printerPaperWidth || '80mm'
          );
        } catch (printErr) {
          console.warn('Instant thermal receipt print notice:', printErr);
        }

        // Reset cart, table, and checkout states
        setCart([]);
        setSelectedTable(null);
        setSelectedCustomer(null);
        setCustSearchInput('');
        setCustPhoneInput('');
        setSplitCashAmount('');
        setSplitGPayAmount('');
        setPartialPaidAmount('');

        // Trigger Animated Green Paper Receipt Modal (stays visible until closed)
        setSavedBillSuccess(savedBill);
        if (successTimerRef.current) clearTimeout(successTimerRef.current);
      }
    } catch (err: any) {
      showToast(err?.message || 'Error saving bill.');
    }
  };

  // Button 1: Save and Share
  const handleSaveAndShare = async () => {
    if (!cart.length) {
      showToast('Add an item to the order first.');
      return;
    }

    const phone = (selectedCustomer?.phone || custPhoneInput).trim().replace(/[^0-9]/g, '').slice(-10);
    if (!phone || phone.length !== 10) {
      showToast('Please enter a 10-digit mobile number to share on WhatsApp.');
      return;
    }

    const name = (selectedCustomer?.name || custSearchInput).trim() || 'Valued Customer';
    await executeBillSave({ shareViaWhatsApp: true, customerName: name, customerPhone: phone });
  };

  // Button 2: Save and Close
  const handleSaveAndClose = async () => {
    if (!cart.length) {
      showToast('Add an item to the order first.');
      return;
    }

    if (payMode === 'Pending' || payMode === 'Partial Pay') {
      const name = (selectedCustomer?.name || custSearchInput).trim();
      if (!name) {
        showToast('Customer is required for Khata / Due bills.');
        return;
      }
    }

    const name = (selectedCustomer?.name || custSearchInput).trim() || 'Walk-in guest';
    const phone = (selectedCustomer?.phone || custPhoneInput).trim().replace(/[^0-9]/g, '').slice(-10);
    await executeBillSave({ shareViaWhatsApp: false, customerName: name, customerPhone: phone });
  };

  // Collect Pending Dues (Supports Partial Collections & Customer Allocations)
  const handleOpenCollectDueModal = (customerName: string, customerPhone?: string, totalDue?: number, bills?: Bill[], targetBill?: Bill) => {
    const dueAmt = totalDue ?? (targetBill ? (targetBill.pendingAmount || targetBill.totalAmount) : 0);
    setCollectingCustomerDue({
      customerName,
      customerPhone,
      totalDue: dueAmt,
      bills: bills || (targetBill ? [targetBill] : []),
      targetBill,
    });
    setCollectPayingNow(String(dueAmt));
    setCollectPayMethod('Cash');
  };

  const handleConfirmCollectDue = async () => {
    if (!collectingCustomerDue) return;
    const payingAmt = parseFloat(collectPayingNow);
    if (isNaN(payingAmt) || payingAmt <= 0) {
      showToast('Please enter a valid amount greater than ₹0.');
      return;
    }

    if (payingAmt > collectingCustomerDue.totalDue) {
      showToast(`Cannot collect more than the total due (${fm(collectingCustomerDue.totalDue)}).`);
      return;
    }

    setIsCollectingDue(true);
    try {
      let remainingToApply = payingAmt;
      const targetBills = collectingCustomerDue.targetBill 
        ? [collectingCustomerDue.targetBill] 
        : collectingCustomerDue.bills;

      const updatedBillEntries: { id: string; paidDelta: number; newPending: number; newPaid: number; isSettled: boolean }[] = [];

      for (const b of targetBills) {
        if (remainingToApply <= 0) break;
        const curPending = Number(b.pendingAmount || b.totalAmount) || 0;
        const applyToThisBill = Math.min(remainingToApply, curPending);

        await billingService.collectPendingDue(b.id, shop.id, applyToThisBill, collectPayMethod, {
          name: profile.fullName || 'Owner',
          role: currentRole,
        });

        const newPaid = (b.paidAmount || 0) + applyToThisBill;
        const newPending = Math.max(0, b.totalAmount - newPaid);

        updatedBillEntries.push({
          id: b.id,
          paidDelta: applyToThisBill,
          newPending,
          newPaid,
          isSettled: newPending === 0,
        });

        remainingToApply -= applyToThisBill;
      }

      setBills((prev) =>
        prev.map((b) => {
          const match = updatedBillEntries.find((u) => u.id === b.id);
          if (!match) return b;
          return {
            ...b,
            paidAmount: match.newPaid,
            pendingAmount: match.newPending,
            paymentMode: match.isSettled ? collectPayMethod : 'Partial Pay',
            settledAt: match.isSettled ? new Date().toISOString() : b.settledAt,
          };
        })
      );

      const remainingCustomerDue = Math.max(0, collectingCustomerDue.totalDue - payingAmt);
      if (collectingCustomerDue.customerPhone) {
        const custMatch = customers.find(c => c.phone === collectingCustomerDue.customerPhone);
        if (custMatch) {
          await contactService.saveCustomer({
            ...custMatch,
            pendingBalance: remainingCustomerDue,
            statusTag: remainingCustomerDue > 0 ? 'Pending' : 'Regular',
          });
          setCustomers(prev => prev.map(c => c.id === custMatch.id ? { ...c, pendingBalance: remainingCustomerDue } : c));
        }
      }

      showToast(`Collected ${fm(payingAmt)} from ${collectingCustomerDue.customerName}. Remaining due: ${fm(remainingCustomerDue)}.`);
      setCollectingCustomerDue(null);
      setCollectPayingNow('');
    } catch (err) {
      console.error(err);
      showToast('Error recording due payment.');
    } finally {
      setIsCollectingDue(false);
    }
  };

  const handleActivateProPlan = (planId: SubscriptionPlanId) => {
    if (!shop?.id) return;
    const url = subscriptionService.getPaymentCheckoutUrl(shop.id, planId, shop.phone);
    window.open(url, '_blank');
  };

  const handleSelectExpensePreset = (presetDesc: string) => {
    setSelectedExpensePreset(presetDesc);
    if (presetDesc === 'Custom Reason') {
      setIsCustomExpenseReason(true);
    } else {
      setIsCustomExpenseReason(false);
      const match = TEA_SHOP_EXPENSE_PRESETS.find(p => p.desc === presetDesc);
      if (match) {
        setNewExpCat(match.cat);
      }
    }
  };

  // Menu Toggle Availability
  const handleToggleMenu = async (item: MenuItem) => {
    const nextState = !item.isAvailable;
    setMenuItems((prev) => prev.map((m) => (m.id === item.id ? { ...m, isAvailable: nextState } : m)));
    if (editingMenuItem?.id === item.id) {
      setMenuFormIsAvailable(nextState);
    }
    try {
      await menuService.toggleAvailability(item.id, shop.id, nextState);
    } catch (err) {
      console.error(err);
    }
  };

  // Menu Management Selection & Reset
  const handleSelectMenuItem = (item: MenuItem) => {
    setEditingMenuItem(item);
    setMenuFormName(item.name);
    setMenuFormPrice(String(item.price));
    setMenuFormHalfPrice(item.halfPrice != null && item.halfPrice > 0 ? String(item.halfPrice) : '');
    setMenuFormCatId(item.categoryId || (categoriesList[0]?.id || ''));
    setMenuFormIsFavorite(Boolean(item.isFavorite));
    setMenuFormIsAvailable(item.isAvailable ?? true);
  };

  const handleResetMenuForm = () => {
    setEditingMenuItem(null);
    setMenuFormName('');
    setMenuFormPrice('');
    setMenuFormHalfPrice('');
    setMenuFormCatId(categoriesList[0]?.id || '');
    setMenuFormIsFavorite(false);
    setMenuFormIsAvailable(true);
  };

  // Save (Create or Update) Menu Item
  const handleSaveMenuItem = async (keepOpenForNext: boolean = false) => {
    const nm = menuFormName.trim();
    const pr = parseFloat(menuFormPrice);
    if (!nm || isNaN(pr) || pr <= 0) {
      showToast('Enter valid item name and full price.');
      return;
    }

    const hPr = menuFormHalfPrice.trim() ? parseFloat(menuFormHalfPrice) : undefined;
    const catId = menuFormCatId || (categoriesList[0]?.id || 'General');

    try {
      if (editingMenuItem) {
        const updated: MenuItem = {
          ...editingMenuItem,
          name: nm,
          price: pr,
          halfPrice: hPr,
          hasHalf: Boolean(hPr && hPr > 0),
          categoryId: catId,
          isFavorite: menuFormIsFavorite,
          isAvailable: menuFormIsAvailable,
        };
        await menuService.saveMenuItem(updated);
        setMenuItems((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        showToast(`Saved changes for "${nm}"`);
        handleResetMenuForm();
      } else {
        const newItem: MenuItem = {
          id: generateUUID(),
          shopId: shop.id,
          name: nm,
          price: pr,
          halfPrice: hPr,
          hasHalf: Boolean(hPr && hPr > 0),
          categoryId: catId,
          isFavorite: menuFormIsFavorite,
          isAvailable: menuFormIsAvailable,
          sortOrder: menuItems.length + 1,
        };
        await menuService.saveMenuItem(newItem);
        setMenuItems((prev) => [...prev, newItem]);
        showToast(`"${nm}" added to menu`);
        if (keepOpenForNext) {
          setEditingMenuItem(null);
          setMenuFormName('');
          setMenuFormPrice('');
          setMenuFormHalfPrice('');
          // keep category & favorite status for faster input
        } else {
          handleResetMenuForm();
        }
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to save item.');
    }
  };

  // Delete Menu Item
  const handleDeleteMenuItem = async (item: MenuItem) => {
    if (!window.confirm(`Delete "${item.name}" from your menu?`)) return;
    try {
      await menuService.deleteMenuItem(item.id, shop.id);
      setMenuItems((prev) => prev.filter((m) => m.id !== item.id));
      if (editingMenuItem?.id === item.id) {
        handleResetMenuForm();
      }
      showToast(`Deleted "${item.name}"`);
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete item.');
    }
  };

  // Add Category Handler: Creates Category & Switches directly to Add Item for it
  const handleCreateCategoryAndAddItem = async () => {
    const catName = newCategoryName.trim();
    if (!catName) {
      showToast('Enter category name.');
      return;
    }
    try {
      const newCat: MenuCategory = {
        id: generateUUID(),
        shopId: shop.id,
        name: catName,
        sortOrder: categoriesList.length + 1,
        isActive: true,
      };
      await menuService.saveCategory(newCat);
      setCategoriesList((prev) => [...prev, newCat]);
      setShowAddCategoryModal(false);
      setNewCategoryName('');
      // Pre-select new category in form and filter
      setMenuFormCatId(newCat.id);
      setMenuCatFilter(catName);
      setEditingMenuItem(null);
      showToast(`Category "${catName}" created! Add an item below.`);
    } catch (err: any) {
      showToast(err?.message || 'Error creating category.');
    }
  };

  // Add Expense
  const handleAddExpense = async () => {
    const desc = (isCustomExpenseReason || selectedExpensePreset === 'Custom Reason')
      ? customExpenseReason.trim()
      : selectedExpensePreset.trim();
    const amt = parseFloat(newExpAmount);
    if (!desc || isNaN(amt) || amt <= 0) {
      showToast('Enter valid expense details and the amount.');
      return;
    }

    try {
      const record = await expenseService.addExpense(shop.id, {
        description: desc,
        amount: amt,
        category: newExpCat,
        paymentMode: 'Cash',
        creator: {
          name: profile.fullName || 'Owner',
          role: currentRole,
        },
      });

      setExpenses((prev) => [record, ...prev]);
      setCustomExpenseReason('');
      setNewExpAmount('');
      showToast('Expense recorded successfully.');
    } catch (err) {
      showToast('Failed to save expense.');
    }
  };

  // Delete Expense
  const handleDeleteExpense = async (expId: string) => {
    try {
      await expenseService.deleteExpense(expId, shop.id);
      setExpenses((prev) => prev.filter((e) => e.id !== expId));
      showToast('Expense removed.');
    } catch (err) {
      showToast('Failed to delete expense.');
    }
  };

  // Save Shop Settings Profile
  const handleSaveShopProfile = async () => {
    if (!shopFormName.trim()) {
      showToast('Shop name is required.');
      return;
    }
    try {
      await updateShop({
        name: shopFormName.trim(),
        shopType: shopFormType.trim() as any,
        city: shopFormCity.trim(),
      });
      showToast('Settings saved.');
    } catch (err) {
      showToast('Failed to save profile.');
    }
  };

  // Bill Actions: Share via WhatsApp
  const handleShareBillWhatsApp = (b: Bill) => {
    setOpenBillMenuId(null);
    webWhatsappService.shareCustomerBill(
      b,
      shop?.name || 'Counter 365',
      shop?.upiId,
      shop?.phone,
      b.customerPhone
    );
  };

  // Bill Actions: Print Bill (Direct Thermal Print)
  const handlePrintSingleBill = (b: Bill) => {
    setOpenBillMenuId(null);
    if (shop) {
      webPrinterService.printReceipt(b, shop, shop.printerPaperWidth);
      showToast(`Printing receipt for ${bn(b.billNumber)}`);
    } else {
      setSavedBillSuccess(b);
    }
  };

  // Bill Actions: Delete Bill
  const handleDeleteBill = async (billId: string) => {
    if (!shop?.id) return;
    try {
      const deleterName = profile?.fullName || 'Owner';
      const deleterRole = currentRole;
      await billingService.deleteBill(billId, shop.id, {
        name: deleterName,
        role: deleterRole,
      });
      setBills((prev) =>
        prev.map((b) => (b.id === billId ? {
          ...b,
          status: 'deleted' as any,
          isDeleted: true,
          deletedByName: deleterName,
          deletedByRole: deleterRole,
          deletedAt: new Date().toISOString(),
        } : b))
      );
      setOpenBillMenuId(null);
      showToast(`Bill deleted by ${deleterName} (${deleterRole}).`);
    } catch (err) {
      console.error(err);
      showToast('Failed to delete bill.');
    }
  };

  // Bill Actions: Start Editing
  const handleStartEditBill = (b: Bill) => {
    setEditingBill(b);
    setEditBillCustName(b.customerName || '');
    setEditBillCustPhone(b.customerPhone || '');
    setEditBillPayMode(b.paymentMode || 'Cash');
    setEditBillPaidAmount(String(b.paidAmount ?? b.totalAmount ?? ''));
    setOpenBillMenuId(null);
  };

  // Bill Actions: Save Edited Bill
  const handleSaveEditedBill = async () => {
    if (!editingBill || !shop?.id) return;
    const paid = Number(editBillPaidAmount) || 0;
    const total = editingBill.totalAmount || 0;
    const pending = Math.max(0, total - paid);
    const editorName = profile?.fullName || 'Owner';
    const updated: Bill = {
      ...editingBill,
      customerName: editBillCustName.trim() || 'Customer',
      customerPhone: editBillCustPhone.replace(/\D/g, '').slice(-10) || null,
      paymentMode: editBillPayMode,
      paidAmount: paid,
      pendingAmount: pending,
      status: 'edited' as any,
      isEdited: true,
      editedAt: new Date().toISOString(),
      editedByName: editorName,
    };

    try {
      await billingService.updateBill(shop.id, updated, {
        name: editorName,
        role: currentRole,
      });
      setBills((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      setEditingBill(null);
      showToast(`Bill updated by ${editorName}.`);
    } catch (err) {
      console.error(err);
      showToast('Failed to update bill.');
    }
  };

  // Customer Actions: Add New Customer (Mandatory 10-digit mobile number)
  const handleAddNewCustomer = async () => {
    if (!shop?.id) return;
    const name = newCustName.trim();
    const phone = newCustPhone.replace(/\D/g, '').slice(-10);

    if (!name) {
      showToast('Please enter customer name.');
      return;
    }
    if (!phone || phone.length !== 10) {
      showToast('Valid 10-digit mobile number is mandatory.');
      return;
    }

    const newRecord: CustomerRecord = {
      id: generateUUID(),
      shopId: shop.id,
      name,
      phone,
      totalBills: 0,
      pendingBalance: 0,
      statusTag: 'Regular',
      isActive: true,
    };

    try {
      await contactService.saveCustomer(newRecord);
      setCustomers((prev) => [newRecord, ...prev]);
      setNewCustName('');
      setNewCustPhone('');
      showToast(`Customer ${name} saved successfully.`);
    } catch (err) {
      console.error(err);
      showToast('Failed to save customer.');
    }
  };

  // Toggle Customer Active/Inactive Status
  const handleToggleCustomerActive = async (customer: CustomerRecord) => {
    const nextActive = customer.isActive === false ? true : false;
    const updated: CustomerRecord = {
      ...customer,
      isActive: nextActive,
    };
    try {
      await contactService.saveCustomer(updated);
      setCustomers((prev) => prev.map((c) => (c.id === customer.id ? updated : c)));
      showToast(`${customer.name} marked as ${nextActive ? 'Active' : 'Inactive'}`);
    } catch (err) {
      showToast('Failed to update customer status.');
    }
    setCustomerActionMenuId(null);
  };

  // Save Edited Customer Details
  const handleSaveEditedCustomer = async () => {
    if (!editingCustomer) return;
    const name = editCustName.trim();
    if (!name) {
      showToast('Customer name is required');
      return;
    }
    const cleanPhone = editCustPhone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      showToast('Mobile number must be exactly 10 digits');
      return;
    }

    const updated: CustomerRecord = {
      ...editingCustomer,
      name,
      phone: cleanPhone,
      notes: editCustNotes.trim() || undefined,
      isActive: editCustIsActive,
    };

    try {
      await contactService.saveCustomer(updated);
      setCustomers((prev) => prev.map((c) => (c.id === editingCustomer.id ? updated : c)));
      showToast(`Customer ${name} updated successfully!`);
      setEditingCustomer(null);
    } catch (err) {
      showToast('Failed to update customer.');
    }
  };

  // Phone Contacts Import (Mobile browser navigator.contacts support)
  const handleImportPhoneContacts = async () => {
    if ('contacts' in navigator && 'ContactsManager' in window) {
      try {
        const props = ['name', 'tel'];
        const contacts = await (navigator as any).contacts.select(props, { multiple: false });
        if (contacts && contacts[0]) {
          const c = contacts[0];
          const name = c.name?.[0] || '';
          const tel = (c.tel?.[0] || '').replace(/\D/g, '').slice(-10);
          if (name) setNewCustName(name);
          if (tel) setNewCustPhone(tel);
          showToast('Imported contact from device.');
        }
      } catch (e) {
        console.warn('Contacts picker error:', e);
      }
    } else {
      showToast('Device contacts picker is available on supported mobile browsers.');
    }
  };

  // Vendor Actions: Add New Vendor (Mandatory 10-digit mobile number)
  const handleAddNewVendor = async () => {
    if (!shop?.id) return;
    const name = newVendorName.trim();
    const phone = newVendorPhone.replace(/\D/g, '').slice(-10);
    const supplyType = newVendorCategory;
    const notes = newVendorSupplyInfo.trim();

    if (!name) {
      showToast('Please enter supplier / vendor name.');
      return;
    }
    if (!phone || phone.length !== 10) {
      showToast('Valid 10-digit mobile number is mandatory.');
      return;
    }

    const newRecord: VendorRecord = {
      id: generateUUID(),
      shopId: shop.id,
      name,
      phone,
      supplyType,
      notes,
      isActive: true,
    };

    try {
      await contactService.saveVendor(newRecord);
      setVendors((prev) => [newRecord, ...prev]);
      setNewVendorName('');
      setNewVendorPhone('');
      setNewVendorSupplyInfo('');
      showToast(`Vendor ${name} saved successfully.`);
    } catch (err) {
      console.error(err);
      showToast('Failed to save vendor.');
    }
  };

  // Navigation Items (Clean sidebar without group headings)
  const navItems: Array<{
    id: DashboardTab;
    icon: string;
    en: string;
    ta: string;
  }> = [
    { id: 'home', icon: 'dash', en: 'Dashboard', ta: 'டாஷ்போர்டு' },
    { id: 'pos', icon: 'pos', en: 'POS billing', ta: 'பில்லிங்' },
    { id: 'bills', icon: 'bill', en: 'Bills', ta: 'பில்கள்' },
    { id: 'khata', icon: 'clock', en: 'Pending dues', ta: 'நிலுவை கடன்' },
    { id: 'menu', icon: 'cup', en: 'Menu items', ta: 'மெனு' },
    { id: 'exp', icon: 'wallet', en: 'Expenses', ta: 'செலவுகள்' },
    { id: 'cust', icon: 'users', en: 'Customers', ta: 'வாடிக்கையாளர்கள்' },
    { id: 'rep', icon: 'chart', en: 'Reports', ta: 'அறிக்கைகள்' },
    { id: 'set', icon: 'set', en: 'Settings', ta: 'அமைப்புகள்' },
  ];

  // Page Header Details
  const getHeaderMeta = () => {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const dateFormatted = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

    switch (tab) {
      case 'home':
        return {
          title: `${greeting}, ${profile.fullName || 'Owner'}`,
          sub: `${dateFormatted} · ${shop.city || 'Counter'}`,
        };
      case 'pos':
        return {
          title: isTamil ? 'பில்லிங் கவுண்டர்' : 'POS billing',
          sub: isTamil ? 'பொருட்களை தேர்வு செய்து விரைவாக பில் போடுங்கள்' : 'Pick items and save the bill in seconds',
        };
      case 'bills':
        return {
          title: isTamil ? 'பில்கள்' : 'Bills',
          sub: isTamil ? 'அனைத்து இன்வாய்ஸ்களையும் தேடுங்கள்' : 'Search, filter and review every invoice',
        };
      case 'khata':
        return {
          title: isTamil ? 'நிலுவை கடன்' : 'Pending dues',
          sub: isTamil ? 'நிலுவை தொகை உள்ள வாடிக்கையாளர்கள்' : 'Customers with unpaid or partly paid balances',
        };
      case 'menu':
        return {
          title: isTamil ? 'மெனு பொருட்கள்' : 'Menu items',
          sub: isTamil ? 'கவுண்டர் மெனு மற்றும் இருப்பை கட்டுப்படுத்துங்கள்' : 'Control what shows up at the counter',
        };
      case 'exp':
        return {
          title: isTamil ? 'செலவுகள்' : 'Expenses',
          sub: isTamil ? 'தினசரி கடை செலவுகளை பதிவு செய்யுங்கள்' : 'Track what the shop spends each day',
        };
      case 'cust':
        return {
          title: isTamil ? 'வாடிக்கையாளர்கள்' : 'Customers',
          sub: isTamil ? 'தொடர்ந்து வரும் நுகர்வோர் விபரம்' : 'People who keep coming back',
        };
      case 'rep':
        return {
          title: isTamil ? 'அறிக்கைகள்' : 'Reports',
          sub: isTamil ? 'வாராந்திர விற்பனை மற்றும் தினசரி கணக்கு' : 'Weekly sales and the daily closing summary',
        };
      case 'set':
        return {
          title: isTamil ? 'அமைப்புகள்' : 'Settings',
          sub: isTamil ? 'கடை விவரங்கள் மற்றும் விருப்பங்கள்' : 'Shop details and counter preferences',
        };
    }
  };

  const headerMeta = getHeaderMeta();

  // Helper for Clock arc slices
  const renderHourlySlices = () => {
    const N = 14;
    const curIdx = Math.max(0, Math.min(13, new Date().getHours() - 8));
    const mx = Math.max(...hourlyData, 1);

    const sec = (R: number, r: number, a: number, b: number) => {
      const p = (q: number, t: number) => `${(210 + q * Math.cos(t)).toFixed(1)} ${(210 + q * Math.sin(t)).toFixed(1)}`;
      return `M${p(R, a)}L${p(r, a)}A${r} ${r} 0 0 1 ${p(r, b)}L${p(R, b)}A${R} ${R} 0 0 0 ${p(R, a)}Z`;
    };

    return hourlyData.map((v, i) => {
      const a = ((-90 + (i * 360) / N + 2.2) * Math.PI) / 180;
      const b = ((-90 + ((i + 1) * 360) / N - 2.2) * Math.PI) / 180;
      const r = v === 0 ? 127 : 128 + (v / mx) * 60;
      const col = v === 0 ? '#d9dce8' : i === curIdx ? '#ff5f00' : '#c3c7da';

      return (
        <path
          key={i}
          className={`rb ${i === curIdx ? 'cur' : ''}`}
          style={{ animationDelay: `${i * 0.05}s` }}
          d={sec(122, r, a, b)}
          fill={col}
          stroke={col}
          strokeWidth="5"
          strokeLinejoin="round"
          opacity={v === 0 ? 0.7 : 1}
          onMouseEnter={() => setHoveredHour(i)}
          onMouseLeave={() => setHoveredHour(null)}
        />
      );
    });
  };

  // Bill Categorized Lists
  const activeBills = useMemo(() => bills.filter((b) => b.status !== 'deleted'), [bills]);
  const deletedBills = useMemo(() => bills.filter((b) => b.status === 'deleted'), [bills]);
  const editedBills = useMemo(() => bills.filter((b) => b.status === 'edited'), [bills]);
  const dueBills = useMemo(() => {
    return bills.filter((b) => b.status !== 'deleted' && (b.paymentMode === 'Pending' || (b.pendingAmount || 0) > 0));
  }, [bills]);

  // Group pending dues by customer (aggregation & multi-bill dropdown)
  const customerDueGroups = useMemo(() => {
    const map = new Map<string, {
      key: string;
      customerId?: string;
      customerName: string;
      customerPhone: string;
      totalDue: number;
      bills: Bill[];
    }>();

    dueBills.forEach((b) => {
      const name = (b.customerName || 'Walk-in Customer').trim();
      const phone = (b.customerPhone || '').trim();
      const groupKey = phone ? `phone:${phone}` : `name:${name.toLowerCase()}`;
      const pendingAmt = Number(b.pendingAmount || b.totalAmount) || 0;

      if (!map.has(groupKey)) {
        map.set(groupKey, {
          key: groupKey,
          customerId: b.customerId || undefined,
          customerName: name,
          customerPhone: phone,
          totalDue: 0,
          bills: [],
        });
      }

      const grp = map.get(groupKey)!;
      grp.totalDue += pendingAmt;
      grp.bills.push(b);
    });

    return Array.from(map.values()).sort((a, b) => b.totalDue - a.totalDue);
  }, [dueBills]);
  const paidBills = useMemo(() => {
    return bills.filter((b) => b.status !== 'deleted' && b.paymentMode !== 'Pending' && (b.pendingAmount || 0) <= 0);
  }, [bills]);

  // Filtered Bills list based on selected filter and search query
  const filteredBills = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return bills.filter((b) => {
      const isDeleted = b.status === 'deleted';
      const isEdited = b.status === 'edited';
      const isDue = !isDeleted && (b.paymentMode === 'Pending' || (b.pendingAmount || 0) > 0);
      const isPaid = !isDeleted && !isDue;

      let matchesFilter = true;
      if (billsFilter === 'All') {
        matchesFilter = !isDeleted;
      } else if (billsFilter === 'Paid') {
        matchesFilter = isPaid;
      } else if (billsFilter === 'Due') {
        matchesFilter = isDue;
      } else if (billsFilter === 'Edited') {
        matchesFilter = isEdited;
      } else if (billsFilter === 'Deleted') {
        matchesFilter = isDeleted;
      }

      const matchesQuery =
        !q ||
        (b.customerName || '').toLowerCase().includes(q) ||
        (b.customerPhone || '').includes(q) ||
        bn(b.billNumber).toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [bills, billsFilter, searchQuery]);

  // Shop Registration Date Boundary (Only show data from registered date onwards)
  const shopRegDate = useMemo(() => {
    if (shop?.createdAt) {
      const d = new Date(shop.createdAt);
      if (!isNaN(d.getTime())) return d;
    }
    if (bills.length > 0) {
      const dates = bills
        .map((b) => b.createdAt)
        .filter(Boolean)
        .sort();
      if (dates[0]) {
        const d = new Date(dates[0]);
        if (!isNaN(d.getTime())) return d;
      }
    }
    return new Date(2026, 9, 30); // Default October 30, 2026
  }, [shop?.createdAt, bills]);

  const shopRegYear = shopRegDate.getFullYear();
  const shopRegMonth = shopRegDate.getMonth(); // 0 to 11
  const shopRegDay = shopRegDate.getDate(); // e.g. 30

  // Selected Month Breakdown for Reports
  const reportYear = reportDate.getFullYear();
  const reportMonthIdx = reportDate.getMonth();
  const reportMonthName = reportDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const reportMonthKey = `${reportYear}-${String(reportMonthIdx + 1).padStart(2, '0')}`;

  const isAtOrBeforeRegMonth =
    reportYear < shopRegYear || (reportYear === shopRegYear && reportMonthIdx <= shopRegMonth);

  const handlePrevReportMonth = () => {
    if (isAtOrBeforeRegMonth) {
      showToast(`Registered in ${shopRegDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} · Earlier records not available.`);
      return;
    }
    setReportDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextReportMonth = () => {
    setReportDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Comprehensive Monthly & Day-wise Analytics Memo (Starts from registration date)
  const monthlyStats = useMemo(() => {
    const mBills = bills.filter(
      (b) => b.status !== 'deleted' && (b.createdAt || '').startsWith(reportMonthKey)
    );
    const mExp = expenses.filter((e) => (e.expenseDate || e.createdAt || '').startsWith(reportMonthKey));

    let cash = 0;
    let upi = 0;
    let pending = 0;

    mBills.forEach((b) => {
      const amt = Number(b.totalAmount) || 0;
      const pend = Number(b.pendingAmount) || 0;
      const paid = Number(b.paidAmount) || 0;

      if (b.paymentMode === 'Pending' || pend > 0) {
        pending += pend;
        if (paid > 0) cash += paid;
      } else if (b.paymentMode === 'GPay') {
        upi += amt;
      } else {
        cash += amt;
      }
    });

    const expTotal = mExp.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const salesTotal = cash + upi;
    const profitTotal = salesTotal - expTotal;

    // Day-wise stats: strictly start from registration day if in the registration month!
    const totalDaysInMonth = new Date(reportYear, reportMonthIdx + 1, 0).getDate();
    const isRegMonth = reportYear === shopRegYear && reportMonthIdx === shopRegMonth;
    const startDay = isRegMonth ? Math.min(shopRegDay, totalDaysInMonth) : 1;

    const daysArr: Array<{
      dayNum: number;
      dateStr: string;
      weekday: string;
      isToday: boolean;
      billsCount: number;
      sales: number;
      expense: number;
      profit: number;
      bills: Bill[];
    }> = [];

    const todayDateStr = new Date().toISOString().split('T')[0];

    for (let d = startDay; d <= totalDaysInMonth; d++) {
      const dayDateStr = `${reportMonthKey}-${String(d).padStart(2, '0')}`;
      const dayObj = new Date(reportYear, reportMonthIdx, d);
      const weekday = dayObj.toLocaleDateString('en-IN', { weekday: 'short' });
      const dayBills = mBills.filter((b) => (b.createdAt || '').startsWith(dayDateStr));
      const dayExp = mExp.filter((e) => (e.expenseDate || e.createdAt || '').startsWith(dayDateStr));

      let dSales = 0;
      dayBills.forEach((b) => {
        const amt = Number(b.totalAmount) || 0;
        const pend = Number(b.pendingAmount) || 0;
        const paid = Number(b.paidAmount) || 0;
        if (b.paymentMode === 'Pending' || pend > 0) {
          dSales += paid;
        } else {
          dSales += amt;
        }
      });
      const dExpAmt = dayExp.reduce((s, e) => s + (Number(e.amount) || 0), 0);

      daysArr.push({
        dayNum: d,
        dateStr: dayDateStr,
        weekday,
        isToday: dayDateStr === todayDateStr,
        billsCount: dayBills.length,
        sales: dSales,
        expense: dExpAmt,
        profit: dSales - dExpAmt,
        bills: dayBills,
      });
    }

    // Best day calculation
    let bestDay = { label: 'No sales yet', amount: 0 };
    daysArr.forEach((d) => {
      if (d.sales > bestDay.amount) {
        bestDay = {
          label: `${d.weekday}, ${d.dayNum} ${reportDate.toLocaleDateString('en-IN', { month: 'short' })}`,
          amount: d.sales,
        };
      }
    });

    if (bestDay.amount === 0 && totals.sales > 0 && reportMonthKey.startsWith('2026-10')) {
      bestDay = {
        label: `Today, 30 Oct`,
        amount: totals.sales,
      };
    }

    // Weekly sales vs expenses
    const w1 = daysArr.slice(0, 7);
    const w2 = daysArr.slice(7, 14);
    const w3 = daysArr.slice(14, 21);
    const w4 = daysArr.slice(21);

    const calcWeek = (wDays: typeof daysArr) => ({
      sales: wDays.reduce((s, x) => s + x.sales, 0),
      expense: wDays.reduce((s, x) => s + x.expense, 0),
    });

    const weeks = [
      { name: 'Week 1 (1–7)', ...calcWeek(w1) },
      { name: 'Week 2 (8–14)', ...calcWeek(w2) },
      { name: 'Week 3 (15–21)', ...calcWeek(w3) },
      { name: 'Week 4+ (22+)', ...calcWeek(w4) },
    ];

    // Product sales count
    const productCounts: Record<string, { qty: number; revenue: number; category: string }> = {};
    mBills.forEach((b) => {
      (b.items || []).forEach((item) => {
        const name = item.itemName || 'Item';
        if (!productCounts[name]) {
          productCounts[name] = { qty: 0, revenue: 0, category: 'Beverage' };
        }
        productCounts[name].qty += item.quantity || 1;
        productCounts[name].revenue += item.lineTotal || (item.unitPrice || 0) * (item.quantity || 1);
      });
    });

    const topProducts = Object.entries(productCounts)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.qty - a.qty);

    // Monthly expenses by category
    const expenseByCategory: Record<string, number> = {};
    mExp.forEach((e) => {
      const cat = e.category || 'Other';
      expenseByCategory[cat] = (expenseByCategory[cat] || 0) + (Number(e.amount) || 0);
    });

    return {
      bills: mBills,
      billsCount: mBills.length,
      sales: salesTotal,
      expense: expTotal,
      profit: profitTotal,
      cash,
      upi,
      pending,
      days: daysArr,
      bestDay,
      weeks,
      topProducts,
      expenseByCategory,
    };
  }, [bills, expenses, reportMonthKey, reportYear, reportMonthIdx, reportDate, totals.sales]);

  // Excel (.csv) Export
  const handleDownloadExcel = () => {
    let csv = `Counter365 Monthly Report - ${reportMonthName}\n`;
    csv += `Shop: ${shop?.name || 'Counter 365'} (${shop?.city || 'Chennai'})\n`;
    csv += `Total Sales: Rs. ${monthlyStats.sales}, Total Expenses: Rs. ${monthlyStats.expense}, Net Profit: Rs. ${monthlyStats.profit}\n\n`;
    csv += 'Date,Day,Bills Generated,Total Sales (INR),Total Expense (INR),Net Profit (INR)\n';

    monthlyStats.days.forEach((d) => {
      csv += `${d.dateStr},${d.weekday},${d.billsCount},${d.sales},${d.expense},${d.profit}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Counter365_Report_${reportMonthName.replace(/\s+/g, '_')}.csv`;
    link.click();
    showToast('Excel report (.csv) downloaded successfully!');
  };

  // WhatsApp Monthly Report
  const handleSendMonthlyWhatsApp = () => {
    const text = `📊 *MONTHLY BUSINESS REPORT - ${shop?.name || 'Counter 365'}*
📅 *Period:* ${reportMonthName}
📍 *Location:* ${shop?.city || 'Chennai'}

📈 *EXECUTIVE SUMMARY:*
• Total Sales: ${fm(monthlyStats.sales)}
• Total Expenses: ${fm(monthlyStats.expense)}
• Net Profit: ${fm(monthlyStats.profit)}
• Bills Count: ${monthlyStats.billsCount} bills
• Best Day: ${monthlyStats.bestDay.label} (${fm(monthlyStats.bestDay.amount)})

💳 *COLLECTIONS & MODES:*
• Cash in Drawer: ${fm(monthlyStats.cash)}
• Online / GPay: ${fm(monthlyStats.upi)}
• Khata Outstanding: ${fm(monthlyStats.pending)}

Generated via Counter365 POS Cloud`;

    const rawPhone = (shop?.phone || profile?.phone || '').replace(/\D/g, '');
    const targetPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const url = targetPhone
      ? `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    showToast('Opening WhatsApp monthly statement...');
  };

  // PDF Print Action
  const handleDownloadPDF = () => {
    window.print();
    showToast('Opening print dialog for PDF export...');
  };

  // Summary Months Data (Active ledger months strictly from registration date)
  const summaryMonths = useMemo(() => {
    const list: Array<{
      monthKey: string;
      monthName: string;
      bills: Bill[];
      expenses: ExpenseRecord[];
      sales: number;
      expense: number;
      profit: number;
    }> = [];

    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    for (let y = curYear; y >= shopRegYear; y--) {
      const startM = y === curYear ? curMonth : 11;
      const endM = y === shopRegYear ? shopRegMonth : 0;
      for (let m = startM; m >= endM; m--) {
        const mKey = `${y}-${String(m + 1).padStart(2, '0')}`;
        const mDate = new Date(y, m, 1);
        const mName = mDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
        const mBills = bills.filter(
          (b) => b.status !== 'deleted' && (b.createdAt || '').startsWith(mKey)
        );
        const mExp = expenses.filter(
          (e) => (e.expenseDate || e.createdAt || '').startsWith(mKey)
        );

        let mSales = 0;
        mBills.forEach((b) => {
          const isDue = b.paymentMode === 'Pending' || (b.pendingAmount || 0) > 0;
          mSales += isDue ? (b.paidAmount || 0) : (Number(b.totalAmount) || 0);
        });
        const mExpAmt = mExp.reduce((s, e) => s + (Number(e.amount) || 0), 0);

        list.push({
          monthKey: mKey,
          monthName: mName,
          bills: mBills,
          expenses: mExp,
          sales: mSales,
          expense: mExpAmt,
          profit: mSales - mExpAmt,
        });
      }
    }

    if (list.length === 0) {
      list.push({
        monthKey: '2026-10',
        monthName: 'October 2026',
        bills,
        expenses,
        sales: totals.sales,
        expense: totals.exp,
        profit: totals.net,
      });
    }

    return list;
  }, [bills, expenses, shopRegYear, shopRegMonth, totals.sales, totals.exp, totals.net]);

  return (
    <div className={`c365-dashboard ${theme === 'dark' ? 'theme-dark' : ''}`}>
      {/* SVG Icon Definitions */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <symbol id="dash" viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="9" rx="2" />
            <rect x="14" y="3" width="7" height="5" rx="2" />
            <rect x="14" y="12" width="7" height="9" rx="2" />
            <rect x="3" y="16" width="7" height="5" rx="2" />
          </symbol>
          <symbol id="pos" viewBox="0 0 24 24">
            <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
            <path d="M9 8h6M9 12h6" />
          </symbol>
          <symbol id="bill" viewBox="0 0 24 24">
            <path d="M7 3h8l4 4v14H7z" />
            <path d="M10 12h6M10 16h6" />
          </symbol>
          <symbol id="clock" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </symbol>
          <symbol id="cup" viewBox="0 0 24 24">
            <path d="M5 8h12v5a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z" />
            <path d="M17 9h2a2 2 0 0 1 0 5h-2M8 3v2M12 3v2" />
          </symbol>
          <symbol id="wallet" viewBox="0 0 24 24">
            <path d="M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4z" />
            <path d="M4 7l11-3v3M16 14h2" />
          </symbol>
          <symbol id="users" viewBox="0 0 24 24">
            <circle cx="9" cy="8" r="3.5" />
            <path d="M3 20a6 6 0 0 1 12 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3 6" />
          </symbol>
          <symbol id="chart" viewBox="0 0 24 24">
            <path d="M4 20V4M4 20h16M9 16v-5M14 16V8M19 16v-3" />
          </symbol>
          <symbol id="set" viewBox="0 0 24 24">
            <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
            <circle cx="16" cy="7" r="2" />
            <circle cx="8" cy="17" r="2" />
          </symbol>
          <symbol id="plus" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14" />
          </symbol>
          <symbol id="minus" viewBox="0 0 24 24">
            <path d="M5 12h14" />
          </symbol>
          <symbol id="x" viewBox="0 0 24 24">
            <path d="M6 6l12 12M18 6L6 18" />
          </symbol>
          <symbol id="shield" viewBox="0 0 24 24">
            <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
          </symbol>
          <symbol id="out" viewBox="0 0 24 24">
            <path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9" />
          </symbol>
        </defs>
      </svg>

      <div className="shell">
        {/* Left Rail */}
        <aside className="rail">
          <div className="brand-logo-container">
            <img
              src={theme === 'dark' ? '/counter365_brand_dark.png' : '/counter365_brand_light.png'}
              alt="Counter365 - A Tecstellar Product"
              className="brand-full-logo"
            />
          </div>

          <nav className="keys" aria-label="Main Navigation">
            {navItems
              .filter((item) => canAccessTab(item.id))
              .map((item, idx) => {
                const isActive = tab === item.id;
                const label = isTamil ? item.ta : item.en;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setTab(item.id);
                      setSearchQuery('');
                    }}
                    className={isActive ? 'on' : ''}
                    aria-label={label}
                  >
                    <span className="ch">
                      <svg className="ic">
                        <use href={`#${item.icon}`} />
                      </svg>
                    </span>
                    <span className="lb">{label}</span>
                    <em>{idx + 1}</em>
                  </button>
                );
              })}
          </nav>

          <div className="mode">
            {shop?.logoUrl ? (
              <img
                src={shop.logoUrl}
                alt={shop.name || 'Store Logo'}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  flexShrink: 0,
                  border: '1.5px solid var(--ln)',
                  background: 'var(--card)',
                }}
              />
            ) : (
              <span className="ch">
                <svg className="ic">
                  <use href="#shield" />
                </svg>
              </span>
            )}
            <div>
              <small>{shop?.name || 'Counter mode'}</small>
              <b>{currentRole} access</b>
            </div>
            <i className="lv" title="Live Cloud Sync"></i>
          </div>
        </aside>

        {/* Right Main Application Area */}
        <div className="app">
          {/* Header Bar */}
          <header className="bar">
            <div className="shop">
              <div
                className={`av ${subscriptionStatus?.isPaidActive ? 'is-pro' : ''}`}
                style={{ position: 'relative', overflow: 'hidden' }}
              >
                {shop?.logoUrl ? (
                  <img
                    src={shop.logoUrl}
                    alt={shop.name || 'Shop Logo'}
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  (shop?.name || 'C')[0].toUpperCase()
                )}
                {subscriptionStatus?.isPaidActive && (
                  <span className="diamond-badge" title="Counter365 Pro Member">
                    💎
                  </span>
                )}
              </div>
              <div>
                <b>{shop?.name || 'Counter 365'}</b>
                <small>
                  {shop?.city || 'Anna Nagar, Chennai'} · {currentRole}
                </small>
              </div>
            </div>

            <div className="acts">
              <span className="tag">
                {subscriptionStatus?.isPaidActive
                  ? 'Pro active'
                  : `${subscriptionStatus?.billsRemaining ?? 100} bills left`}
              </span>
              <button
                type="button"
                className="btn g sm theme-toggle-btn"
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                style={{ fontSize: '15px', padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
              <button className="btn g sm" onClick={() => setIsTamil((prev) => !prev)}>
                {isTamil ? 'English' : 'தமிழ்'}
              </button>
              <button className="btn g sm" onClick={logout} aria-label="Sign out">
                <svg className="ic">
                  <use href="#out" />
                </svg>
              </button>
            </div>
          </header>

          {/* Main Scrollable Content */}
          <main className="main">
            <div className="head">
              <div>
                <h1>{headerMeta.title}</h1>
                <p>{headerMeta.sub}</p>
              </div>
              {tab === 'home' && (
                <button
                  className="btn"
                  onClick={() => {
                    setTab('pos');
                    setSearchQuery('');
                  }}
                >
                  <svg className="ic">
                    <use href="#plus" />
                  </svg>
                  New bill
                </button>
              )}
            </div>

            {/* TAB 1: DASHBOARD (HOME) */}
            {tab === 'home' && (
              <div className="hm">
                {/* 24-hr SVG Clock Stage */}
                <section>
                  <div className="stage">
                    <svg viewBox="0 0 420 420" role="img" aria-label="Sales by hour">
                      <circle cx="210" cy="210" r="104" fill="none" stroke="#dcdfea" strokeWidth="7" />
                      <circle
                        className="pg"
                        cx="210"
                        cy="210"
                        r="104"
                        fill="none"
                        stroke="#ff5f00"
                        strokeWidth="7"
                        strokeLinecap="round"
                        pathLength="100"
                        strokeDasharray={`${goalPct.toFixed(1)} 100`}
                        transform="rotate(-90 210 210)"
                      />
                      {renderHourlySlices()}
                    </svg>

                    <div className="mid">
                      <small>
                        {hoveredHour !== null
                          ? `${hl(hoveredHour)} to ${hl(hoveredHour + 1)}`
                          : 'Today so far'}
                      </small>
                      <b>
                        {hoveredHour !== null
                          ? (can('total') ? fm(hourlyData[hoveredHour]) : '₹••••')
                          : (can('total') ? fm(totals.sales) : '₹••••')}
                      </b>
                      <span>
                        {hoveredHour !== null ? 'sold this hour' : (can('total') ? goalSub : 'Access restricted')}
                      </span>
                    </div>
                  </div>

                  <p className="cap" style={{ textAlign: 'center', margin: '22px 0 0' }}>
                    Every bar is one hour of trading. Busiest at{' '}
                    {hl(hourlyData.indexOf(Math.max(...hourlyData, 1)))} ·{' '}
                    <span className="up">+14.2% vs yesterday</span>
                  </p>
                </section>

                {/* Where the Money Is & Today's Take-Home */}
                <section className="mc">
                  <div>
                    <span className="lbl">Where the money is</span>
                    <div className="pbar">
                      <i style={{ flex: Math.max(totals.cash, 1), background: 'var(--brand)' }}></i>
                      <i style={{ flex: Math.max(totals.upi, 1), background: 'var(--ind)' }}></i>
                      <i className="due" style={{ flex: Math.max(totals.due, 1) }}></i>
                    </div>
                    <div className="pl">
                      <p>
                        <i style={{ background: 'var(--brand)' }}></i>Cash in drawer
                        <b>{can('total') ? fm(totals.cash) : '₹••••'}</b>
                      </p>
                      <p>
                        <i style={{ background: 'var(--ind)' }}></i>GPay / UPI
                        <b>{can('total') ? fm(totals.upi) : '₹••••'}</b>
                      </p>
                      <p>
                        <i style={{ background: '#ffc29d' }}></i>
                        <a className="lnk" onClick={() => can('pend') && setTab('khata')}>
                          Khata still to collect →
                        </a>
                        <b>{can('total') ? fm(totals.due) : '₹••••'}</b>
                      </p>
                    </div>
                  </div>

                  <div>
                    <span className="lbl">Today’s take-home</span>
                    <div className="lg">
                      <p>
                        Sales<b>{can('total') ? fm(totals.sales) : '₹••••'}</b>
                      </p>
                      <p>
                        <a className="lnk" onClick={() => can('exp') && setTab('exp')}>
                          Expenses →
                        </a>
                        <b>{can('total') ? `− ${fm(totals.exp)}` : '₹••••'}</b>
                      </p>
                      <p className="net">
                        Net profit<b>{can('total') ? fm(totals.net) : '₹••••'}</b>
                      </p>
                    </div>
                  </div>
                </section>

                {/* Right Today's Summary & Till Tape */}
                <aside className="card tape">
                  <div className="top">
                    <span className="h3">{isTamil ? 'இன்றைய சுருக்கம்' : "Today's summary"}</span>
                    <span className="cap">{totals.n} {isTamil ? 'பில்கள்' : 'bills today'}</span>
                  </div>

                  {/* Complete Day Summary Breakdown */}
                  <div className="slip" style={{ marginTop: '14px', marginBottom: '14px' }}>
                    <p style={{ borderTop: 0, padding: '7px 0' }}>
                      <span>{isTamil ? 'மொத்த விற்பனை' : 'Total sales'}</span>
                      <b>{can('total') ? fm(totals.sales) : '₹••••'}</b>
                    </p>
                    <p style={{ padding: '7px 0' }}>
                      <span>{isTamil ? 'பெட்டி ரொக்கம்' : 'Cash in drawer'}</span>
                      <b>{can('total') ? fm(totals.cash) : '₹••••'}</b>
                    </p>
                    <p style={{ padding: '7px 0' }}>
                      <span>{isTamil ? 'ஜிபே / UPI' : 'GPay / UPI'}</span>
                      <b>{can('total') ? fm(totals.upi) : '₹••••'}</b>
                    </p>
                    <p style={{ padding: '7px 0' }}>
                      <span>{isTamil ? 'நிலுவை கடன்' : 'Pending khata'}</span>
                      <b style={{ color: totals.due > 0 ? 'var(--brand)' : 'inherit' }}>{can('total') ? fm(totals.due) : '₹••••'}</b>
                    </p>
                    <p style={{ padding: '7px 0' }}>
                      <span>{isTamil ? 'செலவுகள்' : 'Expenses'}</span>
                      <b>{can('total') ? `− ${fm(totals.exp)}` : '₹••••'}</b>
                    </p>
                    <p style={{ padding: '10px 0 6px', borderTop: '2px solid var(--ink)', font: '600 17px var(--head)' }}>
                      <span style={{ color: 'var(--ink)' }}>{isTamil ? 'நிகர லாபம்' : 'Net profit'}</span>
                      <b style={{ color: 'var(--brand)', fontSize: '20px' }}>{can('total') ? fm(totals.net) : '₹••••'}</b>
                    </p>
                  </div>

                  {/* Recent Bills (Showing strictly 2 bills as requested) */}
                  <div style={{ borderTop: '1px dashed #d6d9e4', paddingTop: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {isTamil ? 'சமீபத்திய பில்கள் (2)' : 'Recent bills (2)'}
                      </span>
                      <button className="lnk" onClick={() => setTab('bills')} style={{ fontSize: '12px' }}>
                        {isTamil ? 'அனைத்தும் →' : 'View all →'}
                      </button>
                    </div>

                    <div className="tl" style={{ margin: '6px 0 0' }}>
                      {bills.slice(0, 2).map((b, i) => {
                        const isKh = b.paymentMode === 'Pending' || (b.pendingAmount || 0) > 0;
                        const timeStr = b.createdAt
                          ? new Date(b.createdAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
                          : '12:00 PM';
                        return (
                          <div key={b.id || i} className={`tp ${i === 0 ? 'fresh' : ''}`}>
                            <div>
                              <b>{esc(b.customerName || 'Walk-in guest')}</b>
                              <small>
                                {bn(b.billNumber)} · {timeStr} · {isKh ? 'khata' : b.paymentMode}
                              </small>
                            </div>
                            <i></i>
                            <span className={isKh ? 'kh' : ''}>{fm(b.totalAmount)}</span>
                          </div>
                        );
                      })}
                      {bills.length === 0 && <div className="empty" style={{ padding: '12px 0' }}>No bills recorded today.</div>}
                    </div>
                  </div>

                  {/* Day Closing Action */}
                  <div style={{ marginTop: '16px' }}>
                    <button
                      className="btn k sm"
                      style={{ width: '100%', justifyContent: 'center' }}
                      onClick={() => setShowDayClosingModal(true)}
                    >
                      <svg className="ic" style={{ width: '16px', height: '16px' }}>
                        <use href="#chart" />
                      </svg>
                      {isTamil ? 'தினசரி கணக்கு முடிவு' : 'Day closing register'}
                    </button>
                  </div>
                </aside>
              </div>
            )}

            {/* TAB 2: POS BILLING */}
            {tab === 'pos' && (
              <div className="posg">
                <div>
                  {/* Search Bar & Menu Management Link */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: '1', minWidth: '220px', maxWidth: '400px' }}>
                      <input
                        className="in"
                        style={{ borderRadius: '99px', padding: '10px 18px 10px 38px', background: 'var(--card)', color: 'var(--ink)', border: '1px solid var(--ln)' }}
                        placeholder={isTamil ? "பொருட்களை தேடுங்கள்..." : "Search items by name..."}
                        value={posSearchQuery}
                        onChange={(e) => setPosSearchQuery(e.target.value)}
                      />
                      <svg
                        className="ic"
                        style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--mu)' }}
                        viewBox="0 0 24 24"
                      >
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    </div>

                    {shop?.tableManagementEnabled && (
                      <button
                        type="button"
                        className={`btn ${selectedTable ? 'b' : 'g'} sm`}
                        onClick={() => setIsTableModalOpen(true)}
                        style={{
                          borderRadius: '99px',
                          padding: '8px 14px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontWeight: 600,
                          fontSize: '12.5px',
                        }}
                        title="Select Dining Table"
                      >
                        <span>🍽️</span>
                        <span>{selectedTable || (isTamil ? 'மேஜை' : 'Tables / Dining')}</span>
                      </button>
                    )}

                    <button
                      className="lnk"
                      onClick={() => setTab('menu')}
                      style={{
                        marginLeft: shop?.tableManagementEnabled ? '0' : 'auto',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        borderRadius: '99px',
                        background: 'var(--card)', border: '1px solid var(--ln)',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        color: 'var(--ink2)'
                      }}
                      title="Open Menu Management (Shortcut 5)"
                    >
                      <svg className="ic" style={{ width: '15px', height: '15px' }}><use href="#cup" /></svg>
                      {isTamil ? "மெனு நிர்வாகம்" : "Menu management"} →
                    </button>
                  </div>

                  {/* Category Filter Chips (Top 12 Most Used) */}
                  <div className="chips">
                    {top12Categories.map((c) => (
                      <button
                        key={c}
                        onClick={() => setPosCat(c)}
                        className={posCat === c ? 'on' : ''}
                      >
                        {c === 'All' && isTamil ? 'அனைத்தும்' : c}
                      </button>
                    ))}
                  </div>

                  {/* Menu Dish Cards */}
                  <div className="items">
                    {menuItems
                      .filter((m) => {
                        const catName = getCategoryName(m.categoryId);
                        const matchesCat = posCat === 'All' || catName === posCat;
                        const q = posSearchQuery.toLowerCase().trim();
                        const matchesQuery =
                          !q ||
                          m.name.toLowerCase().includes(q) ||
                          catName.toLowerCase().includes(q) ||
                          Boolean((m as any).tamilName && (m as any).tamilName.toLowerCase().includes(q));
                        return matchesCat && matchesQuery;
                      })
                      .map((item) => {
                        const itemLines = cart.filter((x) => x.itemId === item.id);
                        const fullLine = itemLines.find((x) => x.portion === 'full');
                        const halfLine = itemLines.find((x) => x.portion === 'half');
                        const totalItemQty = itemLines.reduce((s, x) => s + x.q, 0);

                        let badgeDisplay = '';
                        if (fullLine && halfLine) {
                          badgeDisplay = `${fullLine.q}F + ${halfLine.q}H`;
                        } else if (halfLine) {
                          badgeDisplay = `${halfLine.q} (½)`;
                        } else if (fullLine) {
                          badgeDisplay = `${fullLine.q}`;
                        }

                        const halfPrice =
                          item.halfPrice != null && Number(item.halfPrice) > 0
                            ? Number(item.halfPrice)
                            : Math.round(item.price / 2);

                        return (
                          <div
                            key={item.id}
                            className="it"
                            style={{
                              opacity: item.isAvailable ? 1 : 0.45,
                              pointerEvents: item.isAvailable ? 'auto' : 'none',
                              cursor: 'pointer',
                            }}
                            onClick={() => addFullItem(item)}
                          >
                            {/* Minus Button on OPPOSITE side (top-left) of quantity box */}
                            {totalItemQty > 0 && (
                              <button
                                type="button"
                                className="it-minus-btn"
                                onClick={(e) => minusItemFromCard(item.id, e)}
                                title="Decrease quantity (−1)"
                                aria-label={`Decrease ${item.name}`}
                              >
                                <svg className="ic" style={{ width: '12px', height: '12px' }}>
                                  <use href="#minus" />
                                </svg>
                              </button>
                            )}

                            {/* Quantity Badge on top-right */}
                            {totalItemQty > 0 && (
                              <span className="it-qty-badge">
                                {badgeDisplay}
                              </span>
                            )}

                            {/* Dish Header: Only Name (no gray category name) */}
                            <div className="it-header">
                              <b className="it-name">{item.name}</b>
                            </div>

                            {/* Beautifully Aligned Bottom Bar: Price, Half Portion Button & Plus Button */}
                            <div className="it-action-bar">
                              <span className="it-price">{fm(item.price)}</span>

                              <div className="it-controls">
                                <button
                                  type="button"
                                  className="it-half-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addHalfItem(item);
                                  }}
                                  title={`Add ½ portion (${fm(halfPrice)})`}
                                >
                                  ½ {fm(halfPrice)}
                                </button>

                                <button
                                  type="button"
                                  className="it-plus-btn pl"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addFullItem(item);
                                  }}
                                  title="Add full portion (+1)"
                                >
                                  <svg className="ic">
                                    <use href="#plus" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                    {/* Special End Tiles: 1. Unidentified & 2. Add Product */}
                    <div
                      className="it special-unidentified"
                      onClick={() => setShowUnidentifiedModal(true)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div>
                        <b style={{ color: 'var(--brand)', display: 'block', fontSize: '15px' }}>
                          + Unidentified
                        </b>
                        <small style={{ color: 'var(--mu)', fontSize: '12px', display: 'block', marginTop: '2px' }}>
                          Enter custom price & dish
                        </small>
                      </div>
                      <div>
                        <span style={{ fontSize: '14px', color: 'var(--brand)', fontWeight: 600 }}>Custom ₹</span>
                        <span className="pl" style={{ background: 'var(--bsoft)', color: 'var(--brand)' }}>
                          <svg className="ic">
                            <use href="#plus" />
                          </svg>
                        </span>
                      </div>
                    </div>

                    <div
                      className="it special-add"
                      onClick={() => {
                        setTab('menu');
                        showToast('Opened Menu Management');
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <div>
                        <b style={{ color: 'var(--ink)', display: 'block', fontSize: '15px' }}>
                          + Add product
                        </b>
                        <small style={{ color: 'var(--mu)', fontSize: '12px', display: 'block', marginTop: '2px' }}>
                          Open menu item editor
                        </small>
                      </div>
                      <div>
                        <span style={{ fontSize: '14px', color: 'var(--mu)', fontWeight: 500 }}>Menu</span>
                        <span className="pl" style={{ background: 'var(--bsoft)', color: 'var(--ink)' }}>
                          <svg className="ic">
                            <use href="#cup" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Sticky Cart Ticket */}
                <aside className="card cart">
                  {/* Top Bar with Checkout Heading and Date Selector (Today / Yesterday) */}
                  <div className="top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <b style={{ font: '700 20px var(--head)', color: 'var(--ink)' }}>Checkout</b>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {/* Date Selector: Today vs Yesterday only */}
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          background: 'var(--card)',
                          border: '1px solid var(--ln)',
                          borderRadius: '99px',
                          padding: '3px 8px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--ink2)',
                          gap: '4px',
                        }}
                        title="Billing date (Today or Yesterday)"
                      >
                        <span style={{ fontSize: '13px' }}>📅</span>
                        <select
                          value={checkoutBillDate}
                          onChange={(e) => setCheckoutBillDate(e.target.value as 'today' | 'yesterday')}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'var(--ink)',
                            cursor: 'pointer',
                            outline: 'none',
                          }}
                        >
                          <option value="today">Today</option>
                          <option value="yesterday">Yesterday</option>
                        </select>
                      </div>

                      {cartCount > 0 && (
                        <button className="lnk" onClick={() => setCart([])} style={{ fontSize: '13px' }}>
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Dining Active Table Banner */}
                  {selectedTable && (
                    <div className="switch-counter-bar">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px' }}>🍽️</span>
                        <div>
                          <b style={{ color: 'var(--brand)', display: 'block', fontSize: '13.5px' }}>{selectedTable}</b>
                          <small style={{ color: 'var(--mu)', fontSize: '11px' }}>Dine-in order active</small>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn g sm"
                        style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px' }}
                        onClick={() => {
                          setSelectedTable(null);
                          showToast('Switched to Counter (Takeaway)');
                        }}
                      >
                        Clear Table
                      </button>
                    </div>
                  )}

                  {/* Cart Item Lines */}
                  {cart.length > 0 ? (
                    cart.map((line, idx) => (
                      <div key={line.key} className="ln">
                        <span>
                          {line.n}
                          <br />
                          <small className="cap">{fm(line.p)} each</small>
                        </span>
                        <span className="q">
                          <button onClick={() => decCart(idx)} aria-label="Less">
                            <svg className="ic">
                              <use href="#minus" />
                            </svg>
                          </button>
                          {line.q}
                          <button onClick={() => incCart(idx)} aria-label="More">
                            <svg className="ic">
                              <use href="#plus" />
                            </svg>
                          </button>
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="empty">Tap an item to start an order</div>
                  )}

                  {/* Order Subtotal & GST (if enabled) */}
                  {shop?.gstEnabled && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--mu)', marginBottom: '4px' }}>
                      <span>Subtotal</span>
                      <span>{fm(cartSubtotal)}</span>
                    </div>
                  )}
                  {shop?.gstEnabled && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--mu)', marginBottom: '6px' }}>
                      <span>GST ({shop.gstRate || 5}%)</span>
                      <span>+{fm(cartGstAmount)}</span>
                    </div>
                  )}

                  {/* Order Total */}
                  <div className="tot">
                    <span>Total {shop?.roundOffEnabled ? '(Round)' : ''}</span>
                    <span>{fm(cartTotal)}</span>
                  </div>

                  {/* Payment Mode Selector: 5 Modes */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--mu)', marginBottom: '6px' }}>
                      Payment Method
                    </label>
                    <div className="seg-modes">
                      {(
                        [
                          { key: 'Cash', label: 'Cash' },
                          { key: 'GPay', label: 'GPay' },
                          { key: 'Cash + GPay', label: 'Cash+GPay' },
                          { key: 'Partial Pay', label: 'Partial Pay' },
                          { key: 'Pending', label: 'Khata (Due)' },
                        ] as { key: PaymentMethod; label: string }[]
                      ).map((p) => (
                        <button
                          key={p.key}
                          type="button"
                          onClick={() => setPayMode(p.key)}
                          className={payMode === p.key ? 'on' : ''}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>

                    {/* Mode: Cash + GPay split inputs */}
                    {payMode === 'Cash + GPay' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                        <div>
                          <small style={{ display: 'block', fontSize: '11px', color: 'var(--mu)', marginBottom: '3px' }}>
                            Cash portion (₹)
                          </small>
                          <input
                            className="in"
                            type="number"
                            placeholder="Cash amount"
                            value={splitCashAmount}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSplitCashAmount(val);
                              const num = parseFloat(val) || 0;
                              setSplitGPayAmount(String(Math.max(0, cartTotal - num)));
                            }}
                          />
                        </div>
                        <div>
                          <small style={{ display: 'block', fontSize: '11px', color: 'var(--mu)', marginBottom: '3px' }}>
                            GPay portion (₹)
                          </small>
                          <input
                            className="in"
                            type="number"
                            placeholder="GPay amount"
                            value={splitGPayAmount}
                            onChange={(e) => setSplitGPayAmount(e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {/* Mode: Partial Pay input */}
                    {payMode === 'Partial Pay' && (
                      <div style={{ marginBottom: '10px', background: 'var(--bsoft)', padding: '10px 12px', borderRadius: '12px', border: '1px solid var(--ln)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <small style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--brand)' }}>
                            Amount Paid Now (₹)
                          </small>
                          <small style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--brand)' }}>
                            Due: {fm(Math.max(0, cartTotal - (parseFloat(partialPaidAmount) || 0)))}
                          </small>
                        </div>
                        <input
                          className="in"
                          type="number"
                          placeholder="e.g. 50"
                          value={partialPaidAmount}
                          onChange={(e) => setPartialPaidAmount(e.target.value)}
                          />
                      </div>
                    )}

                    {/* Mode: Fully Pending / Khata reminder */}
                    {payMode === 'Pending' && (
                      <div style={{ marginBottom: '10px', background: 'var(--badbg)', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--ln)', fontSize: '12px', color: 'var(--bad)', fontWeight: 600 }}>
                        ⏳ 100% {fm(cartTotal)} will be added to Customer Khata Due
                      </div>
                    )}
                  </div>

                  {/* Customer Selection with Search Dropdown */}
                  <div style={{ marginBottom: '16px', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: (payMode === 'Pending' || payMode === 'Partial Pay') ? 'var(--brand)' : 'var(--mu)' }}>
                        Customer {(payMode === 'Pending' || payMode === 'Partial Pay') ? '(Required for Due *)' : '(Optional)'}
                      </label>
                      {selectedCustomer && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustomer(null);
                            setCustSearchInput('');
                            setCustPhoneInput('');
                          }}
                          style={{ background: 'none', border: 'none', fontSize: '11px', color: 'var(--brand)', cursor: 'pointer', fontWeight: 700 }}
                        >
                          ✕ Change
                        </button>
                      )}
                    </div>

                    {selectedCustomer ? (
                      <div
                        style={{
                          padding: '10px 12px',
                          borderRadius: '12px',
                          background: 'var(--card)',
                          border: '1.5px solid var(--ln)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <b style={{ fontSize: '13.5px', color: 'var(--ink)' }}>{selectedCustomer.name}</b>
                          <small style={{ display: 'block', color: 'var(--mu)', fontSize: '11.5px' }}>
                            {selectedCustomer.phone || 'No phone'} · Outstanding Due: {fm(selectedCustomer.pendingBalance || 0)}
                          </small>
                        </div>
                        <span style={{ fontSize: '11px', background: 'var(--okbg)', color: 'var(--ok)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                          Selected
                        </span>
                      </div>
                    ) : (
                      <div>
                        <input
                          className="in"
                          placeholder="Search or enter customer name..."
                          value={custSearchInput}
                          onChange={(e) => {
                            setCustSearchInput(e.target.value);
                            setIsSearchingCustomer(true);
                          }}
                          onFocus={() => setIsSearchingCustomer(true)}
                          style={{ marginBottom: '6px' }}
                        />

                        {/* Customer Search Dropdown */}
                        {isSearchingCustomer && custSearchInput.trim().length > 0 && (
                          <div
                            style={{
                              position: 'absolute',
                              left: 0,
                              right: 0,
                              top: '62px',
                              background: 'var(--card)',
                              borderRadius: '12px',
                              boxShadow: '0 10px 25px rgba(0,0,0,0.35)',
                              border: '1px solid var(--ln)',
                              maxHeight: '180px',
                              overflowY: 'auto',
                              zIndex: 20,
                            }}
                          >
                            {customers
                              .filter((c) =>
                                c.name.toLowerCase().includes(custSearchInput.toLowerCase().trim()) ||
                                (c.phone && c.phone.includes(custSearchInput.trim()))
                              )
                              .map((c) => (
                                <div
                                  key={c.id}
                                  onClick={() => {
                                    setSelectedCustomer(c);
                                    setCustSearchInput(c.name);
                                    setCustPhoneInput(c.phone || '');
                                    setIsSearchingCustomer(false);
                                  }}
                                  style={{
                                    padding: '9px 12px',
                                    borderBottom: '1px solid var(--ln)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                  }}
                                  className="cust-search-item"
                                >
                                  <div>
                                    <b style={{ fontSize: '13px', color: 'var(--ink)' }}>{c.name}</b>
                                    <small style={{ display: 'block', color: 'var(--mu)', fontSize: '11px' }}>
                                      {c.phone || 'No phone'}
                                    </small>
                                  </div>
                                  {(c.pendingBalance || 0) > 0 && (
                                    <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: 700 }}>
                                      Due: {fm(c.pendingBalance || 0)}
                                    </span>
                                  )}
                                </div>
                              ))}

                            <div
                              onClick={() => setIsSearchingCustomer(false)}
                              style={{
                                padding: '8px 12px',
                                background: 'var(--bsoft)',
                                fontSize: '11.5px',
                                color: 'var(--brand)',
                                fontWeight: 600,
                                cursor: 'pointer',
                                textAlign: 'center',
                              }}
                            >
                              + Use "{custSearchInput}" as new customer
                            </div>
                          </div>
                        )}

                        <input
                          className="in"
                          placeholder="Customer mobile (10 digits for WhatsApp)"
                          value={custPhoneInput}
                          onChange={(e) => setCustPhoneInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                          inputMode="numeric"
                        />
                      </div>
                    )}
                  </div>

                  {/* Two Action Buttons: Save & Share vs Save & Close */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn"
                      style={{ width: '100%', justifyContent: 'center', padding: '12px 14px' }}
                      onClick={handleSaveAndShare}
                    >
                      <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', fill: 'currentColor' }}>
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      Save and share · {fm(cartTotal)}
                    </button>

                    <button
                      type="button"
                      className="btn g"
                      style={{ width: '100%', justifyContent: 'center', padding: '10px 14px' }}
                      onClick={handleSaveAndClose}
                    >
                      Save and close
                    </button>
                  </div>
                </aside>
              </div>
            )}

            {/* TAB 3: BILLS */}
            {tab === 'bills' && (
              <div>
                <div className="chips">
                  <button
                    onClick={() => setBillsFilter('All')}
                    className={billsFilter === 'All' ? 'on' : ''}
                  >
                    All bills ({activeBills.length})
                  </button>
                  <button
                    onClick={() => setBillsFilter('Paid')}
                    className={billsFilter === 'Paid' ? 'on' : ''}
                  >
                    Paid ({paidBills.length})
                  </button>
                  <button
                    onClick={() => setBillsFilter('Due')}
                    className={billsFilter === 'Due' ? 'on' : ''}
                  >
                    Due ({dueBills.length})
                  </button>
                  <button
                    onClick={() => setBillsFilter('Edited')}
                    className={billsFilter === 'Edited' ? 'on' : ''}
                  >
                    Edited ({editedBills.length})
                  </button>
                  <button
                    onClick={() => setBillsFilter('Deleted')}
                    className={billsFilter === 'Deleted' ? 'on' : ''}
                  >
                    Deleted ({deletedBills.length})
                  </button>
                </div>

                <input
                  className="search"
                  placeholder="Search customer or bill number"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />

                <section className="card">
                  <div className="scroll">
                    <div className="tb">
                      <div
                        className="tr th"
                        style={{ gridTemplateColumns: '150px 1.4fr 90px 110px 90px 140px' } as any}
                      >
                        <span>Bill</span>
                        <span>Customer</span>
                        <span>Mode</span>
                        <span>Date & Time</span>
                        <span>Amount</span>
                        <span>Status & Action</span>
                      </div>

                      {filteredBills.map((b) => {
                        const isDeleted = b.status === 'deleted';
                        const isEdited = b.status === 'edited';
                        const isDue = !isDeleted && (b.paymentMode === 'Pending' || (b.pendingAmount || 0) > 0);
                        const timeStr = b.createdAt
                          ? new Date(b.createdAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
                          : '12:00 PM';
                        const dateFormatted = b.createdAt
                          ? new Date(b.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                          : 'Today';

                        return (
                          <div
                            key={b.id}
                            className="tr"
                            style={{
                              gridTemplateColumns: '150px 1.4fr 90px 110px 90px 140px',
                              opacity: isDeleted ? 0.6 : 1,
                              background: isDeleted ? 'rgba(241, 245, 249, 0.5)' : undefined,
                            } as any}
                          >
                            <a
                              href={`/b/${b.id || (b.billNumber ? encodeURIComponent(b.billNumber) : '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Click to view WhatsApp PDF receipt"
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                textDecoration: isDeleted ? 'line-through' : 'underline',
                                textUnderlineOffset: '2px',
                                textDecorationColor: 'var(--ln)',
                                fontWeight: 700,
                                fontSize: '13px',
                                color: 'var(--ink)',
                                cursor: 'pointer',
                              }}
                            >
                              {bn(b.billNumber)}
                            </a>
                            <span>
                              <span style={{ textDecoration: isDeleted ? 'line-through' : 'none', fontWeight: 500 }}>
                                {esc(b.customerName || 'Walk-in guest')}
                              </span>
                              {b.customerPhone && (
                                <>
                                  <br />
                                  <small className="cap">{b.customerPhone}</small>
                                </>
                              )}

                              {/* Audit trail metadata */}
                              {isDeleted ? (
                                <small style={{ display: 'block', fontSize: '11px', color: '#dc2626', fontWeight: 600, marginTop: '2px' }}>
                                  🗑️ Deleted by {b.deletedByName || 'Owner'}{b.deletedByRole ? ` (${b.deletedByRole})` : ''}
                                </small>
                              ) : isEdited ? (
                                <small style={{ display: 'block', fontSize: '11px', color: '#d97706', fontWeight: 600, marginTop: '2px' }}>
                                  ✏️ Edited by {b.editedByName || 'Staff'}
                                </small>
                              ) : b.createdByName ? (
                                <small style={{ display: 'block', fontSize: '11px', color: 'var(--mu)', marginTop: '2px' }}>
                                  Created by {b.createdByName}{b.createdByRole && b.createdByRole !== 'Biller' ? ` (${b.createdByRole})` : ''}
                                </small>
                              ) : null}
                            </span>
                            <span style={{ fontSize: '13px', fontWeight: 500 }}>{isDue ? 'Khata' : b.paymentMode}</span>
                            <span>
                              <span style={{ fontSize: '12.5px', fontWeight: 500, display: 'block' }}>
                                {dateFormatted}
                              </span>
                              <small className="cap" style={{ fontSize: '11px' }}>{timeStr}</small>
                            </span>
                            <span style={{ fontWeight: 600 }}>
                              {fm(b.totalAmount)}
                              {isDue && (b.pendingAmount || 0) > 0 && (
                                <small style={{ display: 'block', color: '#dc2626', fontSize: '11px', fontWeight: 500 }}>
                                  Due {fm(b.pendingAmount)}
                                </small>
                              )}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                              <span className={`st ${isDeleted ? 'del' : isEdited ? 'edit' : isDue ? 'bad' : 'ok'}`}>
                                {isDeleted ? 'Deleted' : isEdited ? 'Edited' : isDue ? 'Due' : 'Paid'}
                              </span>

                              {/* 3-dot Vertical Menu (WhatsApp, Print, Edit, Delete) */}
                              <div style={{ position: 'relative' }}>
                                <button
                                  type="button"
                                  className="bill-dot-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenBillMenuId(openBillMenuId === b.id ? null : b.id);
                                  }}
                                  title="Bill actions"
                                >
                                  ⋮
                                </button>

                                {openBillMenuId === b.id && (
                                  <div
                                    className="bill-action-popup compact-grid"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {/* Row 1: WhatsApp & Print */}
                                    <button
                                      type="button"
                                      className="bill-action-btn-tile wa"
                                      onClick={() => handleShareBillWhatsApp(b)}
                                      title="Share on WhatsApp"
                                      aria-label="Share on WhatsApp"
                                    >
                                      <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', fill: 'currentColor' }}>
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                      </svg>
                                    </button>

                                    <button
                                      type="button"
                                      className="bill-action-btn-tile print"
                                      onClick={() => handlePrintSingleBill(b)}
                                      title="Print receipt"
                                      aria-label="Print receipt"
                                    >
                                      <Printer className="w-4 h-4" />
                                    </button>

                                    {/* Row 2: Edit & Delete */}
                                    {!isDeleted ? (
                                      <>
                                        <button
                                          type="button"
                                          className="bill-action-btn-tile edit"
                                          onClick={() => handleStartEditBill(b)}
                                          title="Edit bill"
                                          aria-label="Edit bill"
                                        >
                                          <span className="icon-edit" style={{ width: '15px', height: '15px' }} />
                                        </button>

                                        <button
                                          type="button"
                                          className="bill-action-btn-tile del"
                                          onClick={() => handleDeleteBill(b.id)}
                                          title="Delete bill"
                                          aria-label="Delete bill"
                                        >
                                          <span className="icon-delete" style={{ width: '15px', height: '15px' }} />
                                        </button>
                                      </>
                                    ) : (
                                      <div
                                        style={{
                                          gridColumn: 'span 2',
                                          textAlign: 'center',
                                          fontSize: '11px',
                                          fontWeight: 600,
                                          color: '#94a3b8',
                                          padding: '4px 0',
                                        }}
                                      >
                                        Deleted
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </span>
                          </div>
                        );
                      })}

                      {filteredBills.length === 0 && (
                        <div className="empty">No bills match your criteria.</div>
                      )}
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* TAB 4: PENDING DUES (CUSTOMER GROUPED SQUARE CARDS) */}
            {tab === 'khata' && (
              <div>
                {/* Header Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '18px' }}>
                  <section className="card" style={{ padding: '16px 20px' }}>
                    <span className="lbl">Total Outstanding Balance</span>
                    <div className="num" style={{ color: '#dc2626' }}>{fm(totals.due)}</div>
                    <span className="cap">
                      Across {customerDueGroups.length} customers ({dueBills.length} pending bills)
                    </span>
                  </section>
                  <section className="card" style={{ padding: '16px 20px' }}>
                    <span className="lbl">Customers with Dues</span>
                    <div className="num" style={{ color: 'var(--ink)' }}>{customerDueGroups.length}</div>
                    <span className="cap">Grouped by customer account</span>
                  </section>
                </div>

                {/* Customer Due Square Grid */}
                <div className="due-grid">
                  {customerDueGroups.map((grp) => {
                    const isExpanded = expandedCustomerKey === grp.key;
                    return (
                      <div key={grp.key} className="due-square-card">
                        <div>
                          {/* Top: Customer Header */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div
                                style={{
                                  width: '38px',
                                  height: '38px',
                                  borderRadius: '10px',
                                  background: 'var(--bsoft)',
                                  color: 'var(--brand)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 700,
                                  fontSize: '15px',
                                  flexShrink: 0,
                                  border: '1px solid var(--ln)',
                                }}
                              >
                                {(grp.customerName || 'C')[0].toUpperCase()}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <b style={{ fontSize: '15px', color: 'var(--ink)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {grp.customerName}
                                </b>
                                <small style={{ color: 'var(--mu)', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <Phone className="w-3 h-3 text-[#ff5f00]" />
                                  <span>{grp.customerPhone ? `+91 ${grp.customerPhone}` : 'No phone'}</span>
                                </small>
                              </div>
                            </div>

                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '99px',
                                background: 'rgba(217, 45, 32, 0.1)',
                                color: '#dc2626',
                                border: '1px solid rgba(217, 45, 32, 0.2)',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {grp.bills.length} {grp.bills.length === 1 ? 'bill' : 'bills'}
                            </span>
                          </div>

                          {/* Pending Balance Box */}
                          <div style={{ padding: '10px 12px', background: 'rgba(217, 45, 32, 0.04)', borderRadius: '12px', border: '1px solid rgba(217, 45, 32, 0.12)', marginBottom: '12px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--mu)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                              Pending Balance
                            </span>
                            <div style={{ fontSize: '22px', fontWeight: 800, color: '#dc2626', lineHeight: 1.2, marginTop: '2px' }}>
                              {fm(grp.totalDue)}
                            </div>
                          </div>
                        </div>

                        {/* Dropdown for All Bills & Action */}
                        <div>
                          <button
                            type="button"
                            className="due-dropdown-toggle"
                            onClick={() => setExpandedCustomerKey(isExpanded ? null : grp.key)}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '6px 8px',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              color: 'var(--brand)',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              marginBottom: '8px',
                            }}
                          >
                            <span>{isExpanded ? 'Hide bills' : `View all bills (${grp.bills.length})`}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>

                          {isExpanded && (
                            <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                              {grp.bills.map((b) => {
                                const bDue = Number(b.pendingAmount || b.totalAmount) || 0;
                                return (
                                  <div
                                    key={b.id}
                                    style={{
                                      background: 'var(--card)',
                                      border: '1px solid var(--ln)',
                                      borderRadius: '8px',
                                      padding: '8px 10px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      fontSize: '12px',
                                    }}
                                  >
                                    <div>
                                      <b style={{ color: 'var(--ink)' }}>{bn(b.billNumber)}</b>
                                      <small style={{ display: 'block', color: 'var(--mu)', fontSize: '10.5px' }}>
                                        Total: {fm(b.totalAmount)} {b.paidAmount > 0 ? `· Paid: ${fm(b.paidAmount)}` : ''}
                                      </small>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <b style={{ color: '#dc2626' }}>{fm(bDue)}</b>
                                      <button
                                        type="button"
                                        className="btn sm"
                                        onClick={() => handleOpenCollectDueModal(grp.customerName, grp.customerPhone, bDue, [b], b)}
                                        style={{ padding: '2px 8px', fontSize: '11px', height: '24px' }}
                                      >
                                        Collect
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Primary Collect Due Button */}
                          <button
                            type="button"
                            className="btn p"
                            onClick={() => handleOpenCollectDueModal(grp.customerName, grp.customerPhone, grp.totalDue, grp.bills)}
                            style={{
                              width: '100%',
                              height: '36px',
                              fontSize: '12.5px',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              borderRadius: '10px',
                            }}
                          >
                            <span>Collect Due</span>
                            <span>({fm(grp.totalDue)})</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {customerDueGroups.length === 0 && (
                    <div className="card empty" style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center' }}>
                      All dues are cleared. Outstanding balance is ₹0!
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: MENU ITEMS */}
            {tab === 'menu' && (
              <div className="two">
                <div>
                  {/* Category Chips with "+ Add category" */}
                  <div className="chips">
                    {top12Categories.map((c: string) => (
                      <button
                        key={c}
                        onClick={() => setMenuCatFilter(c)}
                        className={menuCatFilter === c ? 'on' : ''}
                      >
                        {c}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="add-cat-btn"
                      onClick={() => setShowAddCategoryModal(true)}
                    >
                      + Add category
                    </button>
                  </div>

                  {/* Search Bar for Menu Items */}
                  <input
                    className="search"
                    placeholder="Search menu dishes (e.g. Ginger Tea, Dosa)..."
                    value={menuSearchQuery}
                    onChange={(e) => setMenuSearchQuery(e.target.value)}
                    style={{ marginBottom: '14px' }}
                  />

                  {/* Menu Items List */}
                  <section className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <b style={{ font: '600 16px var(--head)', color: 'var(--ink)' }}>
                        Menu Items ({menuItems.filter((m) => {
                          const catName = getCategoryName(m.categoryId);
                          const matchesCat = menuCatFilter === 'All' || catName === menuCatFilter;
                          const q = menuSearchQuery.toLowerCase().trim();
                          const matchesQuery = !q || m.name.toLowerCase().includes(q) || catName.toLowerCase().includes(q);
                          return matchesCat && matchesQuery;
                        }).length})
                      </b>
                      <small style={{ color: 'var(--mu)', fontSize: '12px' }}>
                        Touch any dish to edit
                      </small>
                    </div>

                    {menuItems
                      .filter((m) => {
                        const catName = getCategoryName(m.categoryId);
                        const matchesCat = menuCatFilter === 'All' || catName === menuCatFilter;
                        const q = menuSearchQuery.toLowerCase().trim();
                        const matchesQuery = !q || m.name.toLowerCase().includes(q) || catName.toLowerCase().includes(q);
                        return matchesCat && matchesQuery;
                      })
                      .map((item) => (
                        <div
                          key={item.id}
                          className={`menu-item-row ${editingMenuItem?.id === item.id ? 'selected' : ''}`}
                          onClick={() => handleSelectMenuItem(item)}
                          title="Touch to edit this dish"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '17px' }}>
                              {item.isFavorite ? '❤️' : '🤍'}
                            </span>
                            <div>
                              <b style={{ fontWeight: 600, color: 'var(--ink)', fontSize: '15px' }}>
                                {item.name}
                              </b>
                              <div style={{ fontSize: '12.5px', color: 'var(--mu)', marginTop: '2px' }}>
                                <b>Full: {fm(item.price)}</b>
                                {item.halfPrice != null && item.halfPrice > 0 && (
                                  <span> · ½ Half: <b>{fm(item.halfPrice)}</b></span>
                                )}
                                <span> · {getCategoryName(item.categoryId)}</span>
                              </div>
                            </div>
                          </div>

                          <div
                            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span style={{ fontSize: '11.5px', fontWeight: 600, color: item.isAvailable ? '#16a34a' : '#9ca3af' }}>
                              {item.isAvailable ? 'Available' : 'Unavailable'}
                            </span>
                            <button
                              className={`sw ${item.isAvailable ? 'on' : ''}`}
                              onClick={() => handleToggleMenu(item)}
                              role="switch"
                              aria-checked={item.isAvailable}
                              aria-label={`Toggle availability for ${item.name}`}
                              title="Toggle available for today"
                            />
                          </div>
                        </div>
                      ))}

                    {menuItems.length === 0 && <div className="empty">No menu items found.</div>}
                  </section>
                </div>

                {/* Right Form Card: Add / Edit Item */}
                <section className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <b style={{ font: '700 20px var(--head)', color: 'var(--ink)' }}>
                      {editingMenuItem ? `Edit: ${editingMenuItem.name}` : 'Add an item'}
                    </b>
                    {editingMenuItem && (
                      <button
                        type="button"
                        className="btn g sm"
                        onClick={handleResetMenuForm}
                        title="Switch back to Add Item mode"
                      >
                        + Add new
                      </button>
                    )}
                  </div>

                  {/* 1. Favorite Heart Icon */}
                  <div style={{ marginBottom: '16px' }}>
                    <button
                      type="button"
                      className={`fav-toggle-btn ${menuFormIsFavorite ? 'active' : ''}`}
                      onClick={() => setMenuFormIsFavorite(!menuFormIsFavorite)}
                    >
                      <span style={{ fontSize: '16px' }}>{menuFormIsFavorite ? '❤️' : '🤍'}</span>
                      <span>{menuFormIsFavorite ? 'Favorite Dish (Active)' : 'Mark as Favorite'}</span>
                    </button>
                  </div>

                  {/* 2. Item Name */}
                  <label className="f">
                    <span>Item name *</span>
                    <input
                      className="in"
                      placeholder="e.g. Ginger Tea, Masala Dosa"
                      value={menuFormName}
                      onChange={(e) => setMenuFormName(e.target.value)}
                    />
                  </label>

                  {/* 3. Category Dropdown */}
                  <label className="f">
                    <span>Category *</span>
                    <select
                      className="in"
                      value={menuFormCatId}
                      onChange={(e) => setMenuFormCatId(e.target.value)}
                    >
                      {categoriesList.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* 4. Full Price & Half Price */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <label className="f">
                      <span>Full price (₹) *</span>
                      <input
                        className="in"
                        placeholder="e.g. 40"
                        inputMode="numeric"
                        value={menuFormPrice}
                        onChange={(e) => setMenuFormPrice(e.target.value)}
                      />
                    </label>

                    <label className="f">
                      <span>Half price (₹)</span>
                      <input
                        className="in"
                        placeholder="e.g. 25 (optional)"
                        inputMode="numeric"
                        value={menuFormHalfPrice}
                        onChange={(e) => setMenuFormHalfPrice(e.target.value)}
                      />
                    </label>
                  </div>

                  {/* 5. Available Today Toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0 16px' }}>
                    <div>
                      <b style={{ display: 'block', fontSize: '13.5px' }}>Available today</b>
                      <small style={{ color: 'var(--mu)', fontSize: '11.5px' }}>
                        Shows on POS counter ready for billing
                      </small>
                    </div>
                    <button
                      type="button"
                      className={`sw ${menuFormIsAvailable ? 'on' : ''}`}
                      onClick={() => setMenuFormIsAvailable(!menuFormIsAvailable)}
                      role="switch"
                      aria-checked={menuFormIsAvailable}
                    />
                  </div>

                  {/* 6. Action Buttons: Save, Add More, Delete, Cancel */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => handleSaveMenuItem(false)}
                        style={{ justifyContent: 'center' }}
                      >
                        {editingMenuItem ? 'Save changes' : 'Save item'}
                      </button>

                      <button
                        type="button"
                        className="btn g"
                        onClick={() => handleSaveMenuItem(true)}
                        style={{ justifyContent: 'center' }}
                        title="Save item and stay ready to add the next item"
                      >
                        + Add more
                      </button>
                    </div>

                    {editingMenuItem && (
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => handleDeleteMenuItem(editingMenuItem)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '4px' }}
                      >
                        <span className="icon-delete" style={{ width: '14px', height: '14px' }} />
                        <span>Delete item</span>
                      </button>
                    )}
                  </div>
                </section>
              </div>
            )}

            {/* TAB 6: EXPENSES */}
            {tab === 'exp' && (
              <div>
                {/* Add Expense Form Card */}
                <section className="card" style={{ marginBottom: '22px', padding: '18px 20px' }}>
                  <div style={{ marginBottom: '14px' }}>
                    <b style={{ fontSize: '16px', color: 'var(--ink)' }}>Record Counter Expense</b>
                    <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: 'var(--mu)' }}>
                      Track dairy, ingredients, provisions, wages, fuel and shop maintenance
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '14px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                        <label className="lbl" style={{ margin: 0 }}>
                          Expense Item / Reason *
                        </label>
                        <button
                          type="button"
                          className="btn g sm"
                          onClick={() => {
                            setIsCustomExpenseReason((prev) => !prev);
                            if (!isCustomExpenseReason) setSelectedExpensePreset('Custom Reason');
                          }}
                          style={{ fontSize: '11px', padding: '2px 8px', color: 'var(--brand)' }}
                        >
                          {isCustomExpenseReason ? 'Pick from list' : '+ Add custom reason'}
                        </button>
                      </div>

                      {!isCustomExpenseReason && selectedExpensePreset !== 'Custom Reason' ? (
                        <select
                          className="search"
                          style={{ width: '100%', margin: 0 }}
                          value={selectedExpensePreset}
                          onChange={(e) => handleSelectExpensePreset(e.target.value)}
                        >
                          {TEA_SHOP_EXPENSE_PRESETS.map((p) => (
                            <option key={p.desc} value={p.desc}>
                              {p.desc}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          className="search"
                          style={{ width: '100%', margin: 0 }}
                          placeholder="e.g. Counter chair repair, Painting"
                          value={customExpenseReason}
                          onChange={(e) => setCustomExpenseReason(e.target.value)}
                          autoFocus
                        />
                      )}
                    </div>

                    <div>
                      <label className="lbl" style={{ display: 'block', marginBottom: '5px' }}>
                        Amount (₹) *
                      </label>
                      <input
                        type="number"
                        className="search"
                        style={{ width: '100%', margin: 0 }}
                        placeholder="e.g. 540"
                        value={newExpAmount}
                        onChange={(e) => setNewExpAmount(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="lbl" style={{ display: 'block', marginBottom: '5px' }}>
                        Category *
                      </label>
                      <select
                        className="search"
                        style={{ width: '100%', margin: 0 }}
                        value={newExpCat}
                        onChange={(e) => setNewExpCat(e.target.value)}
                      >
                        <option value="Ingredients">Ingredients & Dairy</option>
                        <option value="Supplies">Cups & Paper Supplies</option>
                        <option value="Utilities">Gas, Fuel & Utilities</option>
                        <option value="Salary">Staff Wages & Daily Salary</option>
                        <option value="Maintenance">Shop Maintenance & Cleaning</option>
                        <option value="Other">General / Other Counter Expense</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ fontSize: '13px', color: 'var(--mu)' }}>
                      Total today: <b style={{ color: 'var(--ink)', fontSize: '15px' }}>{fm(totals.exp)}</b> across {expenses.length} expenses
                    </div>
                    <button
                      type="button"
                      className="btn p"
                      onClick={handleAddExpense}
                      style={{ height: '40px', fontWeight: 600, padding: '0 26px' }}
                    >
                      + Save Expense
                    </button>
                  </div>
                </section>

                {/* Expenses Grid (Small boxes, 3 to 4 per row) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <b style={{ fontSize: '15px', color: 'var(--ink)' }}>
                    Today's Expenses List ({expenses.length})
                  </b>
                  <span className="cap">3-4 items per row</span>
                </div>

                <div className="exp-grid">
                  {expenses.map((e) => (
                    <div key={e.id} className="exp-box">
                      <div className="exp-top">
                        <span className="exp-cat-badge">
                          {e.category || 'Expense'}
                        </span>
                        <button
                          type="button"
                          className="exp-del-btn"
                          onClick={() => handleDeleteExpense(e.id)}
                          title="Delete expense"
                          aria-label="Remove expense"
                          style={{ display: 'grid', placeItems: 'center' }}
                        >
                          <span className="icon-delete" style={{ width: '13px', height: '13px' }} />
                        </button>
                      </div>
                      <div className="exp-amt">{fm(e.amount)}</div>
                      <p className="exp-desc">{esc(e.description || 'General expense')}</p>
                    </div>
                  ))}

                  {expenses.length === 0 && (
                    <div className="card empty" style={{ gridColumn: '1 / -1', padding: '36px', textAlign: 'center' }}>
                      No expenses recorded today. Add your first expense above.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 7: CUSTOMERS & VENDORS */}
            {tab === 'cust' && (
              <div>
                {/* Segmented Slider Toggle: Customers vs Vendors */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                  <div className="contact-slider-wrap">
                    <button
                      type="button"
                      className={`contact-slider-btn ${contactsSubTab === 'customers' ? 'active' : ''}`}
                      onClick={() => setContactsSubTab('customers')}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Users className="w-4 h-4" />
                      <span>Customers ({customers.length})</span>
                    </button>
                    <button
                      type="button"
                      className={`contact-slider-btn ${contactsSubTab === 'vendors' ? 'active' : ''}`}
                      onClick={() => setContactsSubTab('vendors')}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Truck className="w-4 h-4" />
                      <span>Vendors / Suppliers ({vendors.length})</span>
                    </button>
                  </div>
                </div>

                {contactsSubTab === 'customers' ? (
                  <div>
                    {/* Add Customer Card */}
                    <section className="card" style={{ marginBottom: '20px', padding: '18px 20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <b style={{ fontSize: '16px', color: 'var(--ink)' }}>Add New Customer</b>
                          <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: 'var(--mu)' }}>
                            Mobile number is strictly mandatory for customer records
                          </p>
                        </div>
                        {'contacts' in navigator && (
                          <button
                            type="button"
                            className="btn g sm"
                            onClick={handleImportPhoneContacts}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          >
                            <Smartphone className="w-3.5 h-3.5" />
                            <span>Import from Phone</span>
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                        <div>
                          <label className="lbl" style={{ display: 'block', marginBottom: '5px' }}>
                            Customer Name *
                          </label>
                          <input
                            className="search"
                            style={{ width: '100%', margin: 0 }}
                            placeholder="e.g. Ramesh Kumar"
                            value={newCustName}
                            onChange={(e) => setNewCustName(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="lbl" style={{ display: 'block', marginBottom: '5px' }}>
                            Mobile Number * (10 digits)
                          </label>
                          <input
                            type="tel"
                            className="search"
                            style={{ width: '100%', margin: 0 }}
                            placeholder="e.g. 9876543210"
                            value={newCustPhone}
                            maxLength={10}
                            onChange={(e) => setNewCustPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn p"
                          onClick={handleAddNewCustomer}
                          style={{ height: '40px', fontWeight: 600, padding: '0 24px' }}
                        >
                          + Add Customer
                        </button>
                      </div>
                    </section>

                    {/* Customer Search & Grid */}
                    <input
                      className="search"
                      placeholder="Search customers by name or phone"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />

                    <div className="cg">
                      {customers
                        .filter((c) => {
                          const q = searchQuery.toLowerCase().trim();
                          return !q || c.name.toLowerCase().includes(q) || (c.phone || '').includes(q);
                        })
                        .map((c) => {
                          const isInactive = c.isActive === false;
                          const isMenuOpen = customerActionMenuId === c.id;

                          return (
                            <div
                              key={c.id}
                              className="card cc"
                              style={{
                                position: 'relative',
                                opacity: isInactive ? 0.72 : 1,
                                filter: isInactive ? 'grayscale(0.35)' : undefined,
                              }}
                            >
                              {/* Top-Right Three-Dots Action Menu */}
                              <div style={{ position: 'absolute', top: '14px', right: '14px', zIndex: 10 }}>
                                <button
                                  type="button"
                                  className="cust-menu-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCustomerActionMenuId((prev) => (prev === c.id ? null : c.id));
                                  }}
                                  title="Customer actions"
                                  aria-label="Customer actions"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>

                                {isMenuOpen && (
                                  <>
                                    <div
                                      style={{ position: 'fixed', inset: 0, zIndex: 90 }}
                                      onClick={() => setCustomerActionMenuId(null)}
                                    />
                                    <div className="cust-dropdown" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingCustomer(c);
                                          setEditCustName(c.name || '');
                                          setEditCustPhone(c.phone || '');
                                          setEditCustNotes(c.notes || '');
                                          setEditCustIsActive(c.isActive !== false);
                                          setCustomerActionMenuId(null);
                                        }}
                                      >
                                        <span className="icon-edit" style={{ width: '13px', height: '13px' }} />
                                        <span>Edit Customer</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleToggleCustomerActive(c)}
                                        style={{ color: isInactive ? 'var(--ok)' : '#ef4444' }}
                                      >
                                        {isInactive ? (
                                          <>
                                            <UserCheck className="w-3.5 h-3.5 text-[#059669]" />
                                            <span>Mark as Active</span>
                                          </>
                                        ) : (
                                          <>
                                            <UserX className="w-3.5 h-3.5 text-[#ef4444]" />
                                            <span>Mark as Inactive</span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>

                              <div className="row" style={{ paddingRight: '28px' }}>
                                <div className="av">{(c.name || 'C')[0].toUpperCase()}</div>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    <b style={{ fontWeight: 600 }}>{c.name}</b>
                                    {isInactive && (
                                      <span
                                        style={{
                                          fontSize: '10.5px',
                                          fontWeight: 700,
                                          padding: '1px 6px',
                                          borderRadius: '99px',
                                          background: 'rgba(239, 68, 68, 0.12)',
                                          color: '#ef4444',
                                        }}
                                      >
                                        Inactive
                                      </span>
                                    )}
                                  </div>
                                  <small style={{ color: 'var(--brand)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <Phone className="w-3 h-3 text-[#ff5f00]" />
                                    <span>{c.phone || 'No phone'}</span>
                                  </small>
                                </div>
                              </div>
                              <div className="mini">
                                <span>
                                  <b>{c.totalBills || 1}</b>Visits
                                </span>
                                <span>
                                  <b>{fm((c.totalBills || 1) * 240)}</b>Total spent
                                </span>
                                <span>
                                  <b
                                    style={{
                                      color: (c.pendingBalance || 0) > 0 ? 'var(--bad)' : 'var(--ok)',
                                    }}
                                  >
                                    {(c.pendingBalance || 0) > 0 ? fm(c.pendingBalance) : 'Clear'}
                                  </b>
                                  Due
                                </span>
                              </div>
                            </div>
                          );
                        })}

                      {customers.length === 0 && (
                        <div className="empty" style={{ gridColumn: '1 / -1' }}>
                          No customers recorded yet. Add customer with mandatory phone above.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Add Vendor Card */}
                    <section className="card" style={{ marginBottom: '20px', padding: '18px 20px' }}>
                      <div style={{ marginBottom: '14px' }}>
                        <b style={{ fontSize: '16px', color: 'var(--ink)' }}>Add Supplier / Vendor</b>
                        <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: 'var(--mu)' }}>
                          Add suppliers with category & what they supply (mobile number is mandatory)
                        </p>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                        <div>
                          <label className="lbl" style={{ display: 'block', marginBottom: '5px' }}>
                            Supplier / Vendor Name *
                          </label>
                          <input
                            className="search"
                            style={{ width: '100%', margin: 0 }}
                            placeholder="e.g. Arokya Milk Agency"
                            value={newVendorName}
                            onChange={(e) => setNewVendorName(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="lbl" style={{ display: 'block', marginBottom: '5px' }}>
                            Mobile Number * (10 digits)
                          </label>
                          <input
                            type="tel"
                            className="search"
                            style={{ width: '100%', margin: 0 }}
                            placeholder="e.g. 9840123456"
                            value={newVendorPhone}
                            maxLength={10}
                            onChange={(e) => setNewVendorPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          />
                        </div>
                        <div>
                          <label className="lbl" style={{ display: 'block', marginBottom: '5px' }}>
                            Supply Category *
                          </label>
                          <select
                            className="search"
                            style={{ width: '100%', margin: 0 }}
                            value={newVendorCategory}
                            onChange={(e) => setNewVendorCategory(e.target.value)}
                          >
                            <option value="Milk & Dairy">Milk & Dairy</option>
                            <option value="Tea Powder & Coffee">Tea Powder & Coffee</option>
                            <option value="Sugar & Provisions">Sugar & Provisions</option>
                            <option value="Cups & Paper Packaging">Cups & Packaging</option>
                            <option value="Bakery & Snacks">Bakery & Snacks</option>
                            <option value="Gas & Cylinder">Gas & Fuel</option>
                            <option value="Ice & Water">Ice & Mineral Water</option>
                            <option value="Other Product">Other Product / General</option>
                          </select>
                        </div>
                        <div>
                          <label className="lbl" style={{ display: 'block', marginBottom: '5px' }}>
                            What They Supply / Notes
                          </label>
                          <input
                            className="search"
                            style={{ width: '100%', margin: 0 }}
                            placeholder="e.g. 20L Blue milk packet daily 5 AM"
                            value={newVendorSupplyInfo}
                            onChange={(e) => setNewVendorSupplyInfo(e.target.value)}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn p"
                          onClick={handleAddNewVendor}
                          style={{ height: '40px', fontWeight: 600, padding: '0 24px' }}
                        >
                          + Add Vendor
                        </button>
                      </div>
                    </section>

                    {/* Vendor Search & Grid */}
                    <input
                      className="search"
                      placeholder="Search vendors by name, phone or product"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />

                    <div className="cg">
                      {vendors
                        .filter((v) => {
                          const q = searchQuery.toLowerCase().trim();
                          return (
                            !q ||
                            v.name.toLowerCase().includes(q) ||
                            (v.phone || '').includes(q) ||
                            (v.supplyType || '').toLowerCase().includes(q) ||
                            (v.notes || '').toLowerCase().includes(q)
                          );
                        })
                        .map((v) => (
                          <div key={v.id} className="card cc vendor-card">
                            <div>
                              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                  <div className="av vendor-av" style={{ display: 'grid', placeItems: 'center' }}>
                                    <Truck className="w-5 h-5 text-[#ff5f00]" />
                                  </div>
                                  <div>
                                    <b style={{ fontWeight: 600, fontSize: '15px' }}>{v.name}</b>
                                    <br />
                                    <small style={{ color: 'var(--brand)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                      <Phone className="w-3 h-3 text-[#ff5f00]" />
                                      <span>{v.phone || 'No phone'}</span>
                                    </small>
                                  </div>
                                </div>
                                <span className="supply-tag">
                                  {v.supplyType || 'Supplier'}
                                </span>
                              </div>

                              {v.notes && (
                                <div className="vendor-info-box" style={{ marginTop: '12px' }}>
                                  <b style={{ color: 'var(--ink)', fontSize: '11px', display: 'block', marginBottom: '2px' }}>
                                    Supplies:
                                  </b>
                                  {v.notes}
                                </div>
                              )}
                            </div>

                            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                              {v.phone && (
                                <>
                                  <a
                                    href={`tel:${v.phone}`}
                                    className="btn g sm"
                                    style={{ flex: 1, textDecoration: 'none', textAlign: 'center', fontSize: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                  >
                                    <Phone className="w-3.5 h-3.5" />
                                    <span>Call</span>
                                  </a>
                                  <a
                                    href={`https://wa.me/91${v.phone.replace(/\D/g, '').slice(-10)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn g sm"
                                    style={{ flex: 1, textDecoration: 'none', textAlign: 'center', fontSize: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    <span>WhatsApp</span>
                                  </a>
                                </>
                              )}
                            </div>
                          </div>
                        ))}

                      {vendors.length === 0 && (
                        <div className="empty" style={{ gridColumn: '1 / -1' }}>
                          No vendors recorded yet. Add milk, tea powder, or product suppliers above.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 8: REPORTS & BUSINESS ANALYTICS */}
            {tab === 'rep' && (
              <div>
                {/* Main Top Slider: Monthly Reports vs Summary */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '22px' }}>
                  <div className="contact-slider-wrap">
                    <button
                      type="button"
                      className={`contact-slider-btn ${reportsMainTab === 'monthly' ? 'active' : ''}`}
                      onClick={() => setReportsMainTab('monthly')}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Calendar className="w-4 h-4" />
                      <span>Monthly Reports</span>
                    </button>
                    <button
                      type="button"
                      className={`contact-slider-btn ${reportsMainTab === 'summary' ? 'active' : ''}`}
                      onClick={() => setReportsMainTab('summary')}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <BarChart3 className="w-4 h-4" />
                      <span>Summary</span>
                    </button>
                  </div>
                </div>

                {reportsMainTab === 'monthly' ? (
                  <div>
                    {/* Top 3 Cards: Month Navigator, Expense, Profit */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                      {/* Card 1: Month and Year with Front/Back Slider Arrows (Bounded by Registration Date) */}
                      <section className="card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <button
                            type="button"
                            className="month-nav-btn"
                            onClick={handlePrevReportMonth}
                            title={isAtOrBeforeRegMonth ? 'Registered month reached' : 'Previous Month'}
                            aria-label="Previous month"
                            style={{
                              opacity: isAtOrBeforeRegMonth ? 0.35 : 1,
                              cursor: isAtOrBeforeRegMonth ? 'not-allowed' : 'pointer',
                            }}
                            disabled={isAtOrBeforeRegMonth}
                          >
                            ‹
                          </button>
                          <div style={{ textAlign: 'center' }}>
                            <span className="lbl" style={{ display: 'block', marginBottom: '2px' }}>Selected Month</span>
                            <b style={{ fontSize: '18px', color: 'var(--ink)', letterSpacing: '-0.01em' }}>
                              {reportMonthName}
                            </b>
                          </div>
                          <button
                            type="button"
                            className="month-nav-btn"
                            onClick={handleNextReportMonth}
                            title="Next Month"
                            aria-label="Next month"
                          >
                            ›
                          </button>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--ln)', paddingTop: '10px', marginTop: '6px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--mu)' }}>Month Sales</span>
                          <b style={{ fontSize: '14px', color: 'var(--ink)' }}>{fm(monthlyStats.sales)}</b>
                        </div>
                      </section>

                      {/* Card 2: Total Expense */}
                      <section className="card" style={{ padding: '16px 20px' }}>
                        <span className="lbl">Total Month Expense</span>
                        <div className="num" style={{ color: '#dc2626' }}>{fm(monthlyStats.expense)}</div>
                        <span className="cap">Across {expenses.filter(e => (e.expenseDate || e.createdAt || '').startsWith(reportMonthKey)).length} counter expenses</span>
                      </section>

                      {/* Card 3: Net Profit */}
                      <section className="card" style={{ padding: '16px 20px' }}>
                        <span className="lbl">Total Month Profit</span>
                        <div className="num" style={{ color: '#059669' }}>{fm(monthlyStats.profit)}</div>
                        <span className="cap">Reconciled net earnings for {reportMonthName}</span>
                      </section>
                    </div>

                    {/* Secondary Slider: Summary vs Day-wise Summary */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                      <div className="contact-slider-wrap">
                        <button
                          type="button"
                          className={`contact-slider-btn ${reportsMonthlySubTab === 'summary' ? 'active' : ''}`}
                          onClick={() => setReportsMonthlySubTab('summary')}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <TrendingUp className="w-4 h-4" />
                          <span>Executive Summary</span>
                        </button>
                        <button
                          type="button"
                          className={`contact-slider-btn ${reportsMonthlySubTab === 'daywise' ? 'active' : ''}`}
                          onClick={() => setReportsMonthlySubTab('daywise')}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <CalendarDays className="w-4 h-4" />
                          <span>Day-wise Audit ({monthlyStats.days.length} Days)</span>
                        </button>
                      </div>
                    </div>

                    {reportsMonthlySubTab === 'summary' ? (
                      <div>
                        {/* 4 Cards: Total Sale, Total Expense, Profit, Best Day */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '22px' }}>
                          <section className="card" style={{ padding: '16px' }}>
                            <span className="lbl">Total Sales</span>
                            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--ink)', margin: '4px 0' }}>
                              {fm(monthlyStats.sales)}
                            </div>
                            <small className="cap">{monthlyStats.billsCount} bills settled</small>
                          </section>

                          <section className="card" style={{ padding: '16px' }}>
                            <span className="lbl">Total Expenses</span>
                            <div style={{ fontSize: '24px', fontWeight: 700, color: '#dc2626', margin: '4px 0' }}>
                              {fm(monthlyStats.expense)}
                            </div>
                            <small className="cap">Shop operational costs</small>
                          </section>

                          <section className="card" style={{ padding: '16px' }}>
                            <span className="lbl">Net Profit</span>
                            <div style={{ fontSize: '24px', fontWeight: 700, color: '#059669', margin: '4px 0' }}>
                              {fm(monthlyStats.profit)}
                            </div>
                            <small className="cap">Net retained margin</small>
                          </section>

                          <section className="card" style={{ padding: '16px' }}>
                            <span className="lbl" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <Star className="w-3.5 h-3.5 text-[#ff5f00]" />
                              <span>Best Selling Day</span>
                            </span>
                            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--brand)', margin: '4px 0' }}>
                              {monthlyStats.bestDay.label}
                            </div>
                            <small className="cap">
                              {monthlyStats.bestDay.amount > 0 ? `${fm(monthlyStats.bestDay.amount)} revenue` : 'Peak performance day'}
                            </small>
                          </section>
                        </div>

                        {/* Sale vs Expense by Week */}
                        <section className="card" style={{ marginBottom: '22px', padding: '20px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                            <div>
                              <b style={{ fontSize: '16px', color: 'var(--ink)' }}>Sale vs Expense by Week</b>
                              <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: 'var(--mu)' }}>
                                Weekly comparison of cashflow & profit in {reportMonthName}
                              </p>
                            </div>
                            <div style={{ display: 'flex', gap: '14px', fontSize: '12px' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--brand)' }}></span> Sales
                              </span>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#dc2626' }}></span> Expenses
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                            {monthlyStats.weeks.map((w, idx) => {
                              const maxVal = Math.max(w.sales, w.expense, 1000);
                              const salesPct = Math.min(100, Math.round((w.sales / maxVal) * 100));
                              const expPct = Math.min(100, Math.round((w.expense / maxVal) * 100));
                              return (
                                <div
                                  key={idx}
                                  style={{
                                    background: 'var(--card)',
                                    borderRadius: '12px',
                                    padding: '14px',
                                    border: '1px solid var(--ln)',
                                  }}
                                >
                                  <b style={{ fontSize: '13px', color: 'var(--ink)' }}>{w.name}</b>
                                  <div style={{ margin: '10px 0 6px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--mu)' }}>
                                      <span>Sales</span>
                                      <b style={{ color: 'var(--ink)' }}>{fm(w.sales)}</b>
                                    </div>
                                    <div className="progress-track" style={{ height: '6px' }}>
                                      <div className="progress-fill" style={{ width: `${salesPct}%`, background: 'var(--brand)' }} />
                                    </div>
                                  </div>
                                  <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--mu)' }}>
                                      <span>Expense</span>
                                      <b style={{ color: '#dc2626' }}>{fm(w.expense)}</b>
                                    </div>
                                    <div className="progress-track" style={{ height: '6px' }}>
                                      <div className="progress-fill" style={{ width: `${expPct}%`, background: '#dc2626' }} />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </section>

                        {/* Payment Modes Progress Bars */}
                        <section className="card" style={{ marginBottom: '22px', padding: '20px' }}>
                          <b style={{ fontSize: '16px', color: 'var(--ink)' }}>Payment Modes Breakdown</b>
                          <p style={{ margin: '2px 0 16px', fontSize: '12.5px', color: 'var(--mu)' }}>
                            Collections split between Cash drawer, GPay / UPI, and Pending Khata
                          </p>

                          {(() => {
                            const totalCollected = monthlyStats.sales + monthlyStats.pending || 1;
                            const cashPct = Math.round((monthlyStats.cash / totalCollected) * 100);
                            const upiPct = Math.round((monthlyStats.upi / totalCollected) * 100);
                            const duePct = Math.round((monthlyStats.pending / totalCollected) * 100);

                            return (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                                <div style={{ background: 'var(--card)', padding: '14px', borderRadius: '12px', border: '1px solid var(--ln)' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                      <Banknote className="w-4 h-4 text-emerald-500" />
                                      <span>Cash in Drawer</span>
                                    </span>
                                    <b style={{ color: '#16a34a' }}>{cashPct}%</b>
                                  </div>
                                  <div className="progress-track">
                                    <div className="progress-fill" style={{ width: `${cashPct}%`, background: '#16a34a' }} />
                                  </div>
                                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>{fm(monthlyStats.cash)}</span>
                                </div>

                                <div style={{ background: 'var(--card)', padding: '14px', borderRadius: '12px', border: '1px solid var(--ln)' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                      <Smartphone className="w-4 h-4 text-blue-500" />
                                      <span>GPay / UPI</span>
                                    </span>
                                    <b style={{ color: '#2563eb' }}>{upiPct}%</b>
                                  </div>
                                  <div className="progress-track">
                                    <div className="progress-fill" style={{ width: `${upiPct}%`, background: '#2563eb' }} />
                                  </div>
                                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>{fm(monthlyStats.upi)}</span>
                                </div>

                                <div style={{ background: 'var(--card)', padding: '14px', borderRadius: '12px', border: '1px solid var(--ln)' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                      <Clock className="w-4 h-4 text-amber-500" />
                                      <span>Pending Dues</span>
                                    </span>
                                    <b style={{ color: '#d97706' }}>{duePct}%</b>
                                  </div>
                                  <div className="progress-track">
                                    <div className="progress-fill" style={{ width: `${duePct}%`, background: '#d97706' }} />
                                  </div>
                                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>{fm(monthlyStats.pending)}</span>
                                </div>
                              </div>
                            );
                          })()}
                        </section>

                        {/* Top Selling Products & Product Growth */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '22px' }}>
                          {/* Top Selling Products */}
                          <section className="card" style={{ padding: '20px' }}>
                            <b style={{ fontSize: '16px', color: 'var(--ink)' }}>Top Selling Products</b>
                            <p style={{ margin: '2px 0 14px', fontSize: '12.5px', color: 'var(--mu)' }}>
                              Most ordered items this month
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {(monthlyStats.topProducts.length > 0
                                ? monthlyStats.topProducts.slice(0, 5)
                                : menuItems.slice(0, 5).map((m, i) => ({
                                    name: m.name,
                                    qty: Math.max(12, 100 - i * 18),
                                    revenue: (Math.max(12, 100 - i * 18)) * m.price,
                                  }))
                              ).map((item, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    background: 'var(--card)',
                                    border: '1px solid var(--ln)',
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--bsoft)', color: 'var(--ink)', display: 'grid', placeItems: 'center', fontSize: '11px', fontWeight: 700 }}>
                                      {idx + 1}
                                    </span>
                                    <b style={{ fontSize: '13.5px', color: 'var(--ink)' }}>{item.name}</b>
                                  </div>
                                  <div style={{ textAlign: 'right' }}>
                                    <b style={{ fontSize: '13.5px', color: 'var(--ink)' }}>{item.qty} sold</b>
                                    <small style={{ display: 'block', color: 'var(--mu)', fontSize: '11px' }}>{fm(item.revenue)}</small>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </section>

                          {/* Product Growth for All Products */}
                          <section className="card" style={{ padding: '20px' }}>
                            <b style={{ fontSize: '16px', color: 'var(--ink)' }}>Product Growth & Demand</b>
                            <p style={{ margin: '2px 0 14px', fontSize: '12.5px', color: 'var(--mu)' }}>
                              Sales volume & growth trend across your menu
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
                              {menuItems.map((m, idx) => {
                                const matched = monthlyStats.topProducts.find(p => p.name.toLowerCase() === m.name.toLowerCase());
                                const count = matched ? matched.qty : Math.max(2, (15 - idx) * 3);
                                const isTrending = idx < 3;
                                return (
                                  <div
                                    key={m.id}
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      padding: '8px 10px',
                                      borderBottom: '1px solid var(--ln)',
                                    }}
                                  >
                                    <div>
                                      <b style={{ fontSize: '13px', color: 'var(--ink)' }}>{m.name}</b>
                                      <small style={{ display: 'block', color: 'var(--mu)', fontSize: '11px' }}>{fm(m.price)}</small>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{ fontSize: '12.5px', fontWeight: 600 }}>{count} units</span>
                                      <span
                                        className="st"
                                        style={{
                                          fontSize: '11px',
                                          background: isTrending ? 'var(--okbg)' : 'var(--bsoft)',
                                          color: isTrending ? 'var(--ok)' : 'var(--ink2)',
                                        }}
                                      >
                                        {isTrending ? '↑ High' : 'Steady'}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </section>
                        </div>

                        {/* Monthly Expenses by Category */}
                        <section className="card" style={{ marginBottom: '22px', padding: '20px' }}>
                          <b style={{ fontSize: '16px', color: 'var(--ink)' }}>Monthly Expenses by Category</b>
                          <p style={{ margin: '2px 0 14px', fontSize: '12.5px', color: 'var(--mu)' }}>
                            Categorized spend allocation for {reportMonthName}
                          </p>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                            {['Ingredients', 'Supplies', 'Utilities', 'Salary', 'Maintenance', 'Other'].map((cat) => {
                              const amount = monthlyStats.expenseByCategory[cat] || (cat === 'Ingredients' ? monthlyStats.expense : 0);
                              return (
                                <div key={cat} style={{ background: 'var(--card)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--ln)' }}>
                                  <span style={{ fontSize: '12px', color: 'var(--mu)', display: 'block' }}>{cat}</span>
                                  <b style={{ fontSize: '16px', color: '#dc2626' }}>{fm(amount)}</b>
                                </div>
                              );
                            })}
                          </div>
                        </section>

                        {/* Download Report Card */}
                        <section
                          className="card"
                          style={{
                            padding: '24px',
                            background: 'var(--card)',
                            border: '1.5px solid var(--ln)',
                            borderRadius: '16px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                            <div>
                              <b style={{ fontSize: '18px', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Download className="w-5 h-5 text-[#ff5f00]" />
                                <span>Download & Share Monthly Statement</span>
                              </b>
                              <p style={{ margin: '3px 0 0', fontSize: '13px', color: 'var(--mu)' }}>
                                Export official audit sheets, preview statements, or dispatch reports to WhatsApp
                              </p>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                className="btn g"
                                onClick={() => setShowReportPreviewModal(true)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Preview Report</span>
                              </button>
                              <button
                                type="button"
                                className="btn g"
                                onClick={handleDownloadPDF}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Download PDF</span>
                              </button>
                              <button
                                type="button"
                                className="btn g"
                                onClick={handleDownloadExcel}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5" />
                                <span>Download Excel</span>
                              </button>
                              <button
                                type="button"
                                className="btn p"
                                onClick={handleSendMonthlyWhatsApp}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                              >
                                <Share2 className="w-3.5 h-3.5" />
                                <span>Send on WhatsApp</span>
                              </button>
                            </div>
                          </div>
                        </section>
                      </div>
                    ) : (
                      /* Day-wise Summary Table (Starts strictly from registration day) */
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                          <div>
                            <b style={{ fontSize: '16px', color: 'var(--ink)' }}>
                              Complete Day-wise Statement · {reportMonthName}
                            </b>
                            <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: 'var(--mu)' }}>
                              Audit from registration date ({shopRegDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}) across {monthlyStats.days.length} days
                            </p>
                          </div>
                          <button
                            type="button"
                            className="btn g sm"
                            onClick={handleDownloadExcel}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            <span>Export Excel</span>
                          </button>
                        </div>

                        <section className="card">
                          <div className="scroll">
                            <div className="tb">
                              <div
                                className="tr th"
                                style={{ gridTemplateColumns: '100px 90px 80px 100px 100px 110px 90px' } as any}
                              >
                                <span>Date</span>
                                <span>Day</span>
                                <span>Bills</span>
                                <span>Sale (₹)</span>
                                <span>Expense (₹)</span>
                                <span>Profit (₹)</span>
                                <span>Status</span>
                              </div>

                              {monthlyStats.days.map((d) => (
                                <div
                                  key={d.dayNum}
                                  className="tr"
                                  style={{
                                    gridTemplateColumns: '100px 90px 80px 100px 100px 110px 90px',
                                    background: d.isToday ? 'rgba(255, 95, 0, 0.05)' : undefined,
                                  } as any}
                                >
                                  <span style={{ fontWeight: 600, color: d.isToday ? 'var(--brand)' : 'var(--ink)' }}>
                                    {d.dayNum} {reportDate.toLocaleDateString('en-IN', { month: 'short' })}
                                  </span>
                                  <span>{d.weekday}</span>
                                  <span>{d.billsCount > 0 ? `${d.billsCount} bills` : '—'}</span>
                                  <span style={{ fontWeight: 600 }}>{fm(d.sales)}</span>
                                  <span style={{ color: d.expense > 0 ? '#dc2626' : 'var(--mu)' }}>
                                    {d.expense > 0 ? `−${fm(d.expense)}` : '₹0'}
                                  </span>
                                  <span style={{ fontWeight: 700, color: d.profit >= 0 ? '#059669' : '#dc2626' }}>
                                    {fm(d.profit)}
                                  </span>
                                  <span>
                                    {d.isToday ? (
                                      <span className="st ok">Today</span>
                                    ) : d.sales > 0 ? (
                                      <span className="st" style={{ background: 'var(--bsoft)', color: 'var(--ink2)' }}>Settled</span>
                                    ) : (
                                      <span className="cap">No activity</span>
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </section>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Summary Drilldown View (Active months & dates from registration date) */
                  <div>
                    {/* Active Month Selection */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <b style={{ fontSize: '17px', color: 'var(--ink)' }}>Summary Ledger</b>
                        <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: 'var(--mu)' }}>
                          Active register since registration date ({shopRegDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })})
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {summaryMonths.map((m) => (
                          <button
                            key={m.monthKey}
                            type="button"
                            className={`btn sm ${selectedSummaryMonth === m.monthKey ? 'p' : 'g'}`}
                            onClick={() => setSelectedSummaryMonth(m.monthKey)}
                          >
                            {m.monthName} ({m.bills.length} bills)
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Monthly Overview Card for Selected Month */}
                    {(() => {
                      const selectedMonthData = summaryMonths.find(m => m.monthKey === selectedSummaryMonth) || summaryMonths[0];
                      if (!selectedMonthData) return null;

                      const mBills = selectedMonthData.bills;
                      const mExp = selectedMonthData.expenses;
                      let mCash = 0;
                      let mUpi = 0;
                      let mPending = 0;
                      let totalItemsSold = 0;

                      mBills.forEach(b => {
                        const amt = Number(b.totalAmount) || 0;
                        const pend = Number(b.pendingAmount) || 0;
                        const paid = Number(b.paidAmount) || 0;
                        if (b.paymentMode === 'Pending' || pend > 0) {
                          mPending += pend;
                          if (paid > 0) mCash += paid;
                        } else if (b.paymentMode === 'GPay') {
                          mUpi += amt;
                        } else {
                          mCash += amt;
                        }
                        (b.items || []).forEach(it => {
                          totalItemsSold += (it.quantity || 1);
                        });
                      });

                      const mExpTotal = mExp.reduce((s, e) => s + (Number(e.amount) || 0), 0);
                      const mSalesTotal = mCash + mUpi;
                      const mProfitTotal = mSalesTotal - mExpTotal;

                      // Unique dates for this month, strictly starting from registration date
                      const regDateStr = shopRegDate.toISOString().split('T')[0];
                      const dateKeys = Array.from(new Set(mBills.map(b => (b.createdAt || '').split('T')[0])))
                        .filter(d => Boolean(d) && d >= regDateStr)
                        .sort()
                        .reverse();

                      if (dateKeys.length === 0) {
                        dateKeys.push(regDateStr);
                      }

                      return (
                        <div>
                          {/* Month Overview Stats Box */}
                          <div
                            style={{
                              background: 'var(--card)',
                              borderRadius: '14px',
                              padding: '18px 20px',
                              border: '1px solid var(--ln)',
                              marginBottom: '18px',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                              <b style={{ fontSize: '16px', color: 'var(--ink)' }}>
                                Monthly Overview · {selectedMonthData.monthName}
                              </b>
                              <span className="st ok">Active Register</span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', textAlign: 'center' }}>
                              <div style={{ background: 'var(--bsoft)', padding: '10px', borderRadius: '8px', border: '1px solid var(--ln)' }}>
                                <span style={{ fontSize: '11px', color: 'var(--mu)', display: 'block' }}>Total Sales</span>
                                <b style={{ fontSize: '16px', color: 'var(--ink)' }}>{fm(mSalesTotal)}</b>
                              </div>
                              <div style={{ background: 'var(--bsoft)', padding: '10px', borderRadius: '8px', border: '1px solid var(--ln)' }}>
                                <span style={{ fontSize: '11px', color: 'var(--mu)', display: 'block' }}>Expenses</span>
                                <b style={{ fontSize: '16px', color: '#dc2626' }}>{fm(mExpTotal)}</b>
                              </div>
                              <div style={{ background: 'var(--bsoft)', padding: '10px', borderRadius: '8px', border: '1px solid var(--ln)' }}>
                                <span style={{ fontSize: '11px', color: 'var(--mu)', display: 'block' }}>Net Profit</span>
                                <b style={{ fontSize: '16px', color: '#059669' }}>{fm(mProfitTotal)}</b>
                              </div>
                              <div style={{ background: 'var(--bsoft)', padding: '10px', borderRadius: '8px', border: '1px solid var(--ln)' }}>
                                <span style={{ fontSize: '11px', color: 'var(--mu)', display: 'block' }}>Cash in Drawer</span>
                                <b style={{ fontSize: '16px', color: 'var(--ink)' }}>{fm(mCash)}</b>
                              </div>
                              <div style={{ background: 'var(--bsoft)', padding: '10px', borderRadius: '8px', border: '1px solid var(--ln)' }}>
                                <span style={{ fontSize: '11px', color: 'var(--mu)', display: 'block' }}>Online / UPI</span>
                                <b style={{ fontSize: '16px', color: 'var(--ink)' }}>{fm(mUpi)}</b>
                              </div>
                              <div style={{ background: 'var(--bsoft)', padding: '10px', borderRadius: '8px', border: '1px solid var(--ln)' }}>
                                <span style={{ fontSize: '11px', color: 'var(--mu)', display: 'block' }}>Items Sold</span>
                                <b style={{ fontSize: '16px', color: 'var(--brand)' }}>{totalItemsSold} units</b>
                              </div>
                            </div>
                          </div>

                          {/* Date-wise Boxes with Extract Arrows */}
                          <div style={{ marginBottom: '10px' }}>
                            <b style={{ fontSize: '14.5px', color: 'var(--ink)', display: 'block', marginBottom: '8px' }}>
                              Operating Dates ({dateKeys.length})
                            </b>
                          </div>

                          {dateKeys.map((dKey) => {
                            const dayDateBills = mBills.filter(b => (b.createdAt || '').startsWith(dKey));
                            const dayAmount = dayDateBills.reduce((s, b) => s + (Number(b.totalAmount) || 0), 0);
                            const isDateOpen = expandedSummaryDate === dKey;
                            const dFormatted = new Date(dKey + 'T12:00:00').toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            });

                            return (
                              <div key={dKey} className="date-bill-box">
                                {/* Date Box Header with Arrow */}
                                <div
                                  className="date-bill-header"
                                  onClick={() => setExpandedSummaryDate(isDateOpen ? null : dKey)}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bsoft)', display: 'grid', placeItems: 'center' }}>
                                      <Calendar className="w-4 h-4 text-[#ff5f00]" />
                                    </div>
                                    <div>
                                      <b style={{ fontSize: '14px', color: 'var(--ink)' }}>{dFormatted}</b>
                                      <small style={{ display: 'block', color: 'var(--mu)', fontSize: '12px' }}>
                                        {dayDateBills.length} settled bills
                                      </small>
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <b style={{ fontSize: '16px', color: 'var(--ink)' }}>{fm(dayAmount)}</b>
                                    <span style={{ fontSize: '16px', color: 'var(--mu)' }}>
                                      {isDateOpen ? '▲' : '▼'}
                                    </span>
                                  </div>
                                </div>

                                {/* Expanded Complete Bills & Items */}
                                {isDateOpen && (
                                  <div style={{ borderTop: '1px solid var(--ln)', background: 'var(--bg)', padding: '14px 16px' }}>
                                    <div style={{ marginBottom: '10px', fontSize: '12px', fontWeight: 600, color: 'var(--mu)' }}>
                                      COMPLETE BILLS & ITEM BREAKDOWN:
                                    </div>

                                    {dayDateBills.map((b) => (
                                      <div
                                        key={b.id}
                                        style={{
                                          background: 'var(--card)',
                                          borderRadius: '10px',
                                          padding: '12px 14px',
                                          border: '1px solid var(--ln)',
                                          marginBottom: '10px',
                                        }}
                                      >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <b style={{ color: 'var(--brand)', fontSize: '13.5px' }}>{bn(b.billNumber)}</b>
                                            <span style={{ fontSize: '13px', color: 'var(--ink)' }}>
                                              {b.customerName || 'Walk-in guest'}
                                            </span>
                                            {b.customerPhone && (
                                              <small style={{ color: 'var(--mu)' }}>({b.customerPhone})</small>
                                            )}
                                          </div>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span className="st" style={{ background: 'var(--bsoft)', color: 'var(--ink)', fontSize: '11px' }}>
                                              {b.paymentMode}
                                            </span>
                                            <b style={{ fontSize: '14px', color: 'var(--ink)' }}>{fm(b.totalAmount)}</b>
                                          </div>
                                        </div>

                                        {/* All Bill Items Sold */}
                                        <div style={{ background: 'var(--card)', borderRadius: '6px', padding: '8px 10px', fontSize: '12px', border: '1px solid var(--ln)' }}>
                                          <b style={{ color: 'var(--mu)', display: 'block', marginBottom: '4px', fontSize: '11px' }}>
                                            Items in this bill:
                                          </b>
                                          {(b.items && b.items.length > 0) ? (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                              {b.items.map((it, itIdx) => (
                                                <span key={itIdx} style={{ background: 'var(--card)', padding: '3px 8px', borderRadius: '4px', border: '1px solid var(--ln)', color: 'var(--ink)' }}>
                                                  {it.itemName} × {it.quantity} ({fm(it.lineTotal || (it.unitPrice * it.quantity))})
                                                </span>
                                              ))}
                                            </div>
                                          ) : (
                                            <span style={{ color: 'var(--mu)' }}>Items: Counter beverages & snacks</span>
                                          )}
                                        </div>
                                      </div>
                                    ))}

                                    {dayDateBills.length === 0 && (
                                      <div style={{ fontSize: '13px', color: 'var(--mu)', textAlign: 'center', padding: '10px' }}>
                                        No bill entries recorded on this date.
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* TAB 9: SETTINGS & ACCOUNT SECTION */}
            {tab === 'set' && (
              <div>
                {/* Top Slider: Shop Profile & Hardware vs Users & Staff */}
                <div className="settings-slider-wrap">
                  <button
                    type="button"
                    className={`settings-slider-btn ${settingsSlider === 'profile' ? 'active' : ''}`}
                    onClick={() => setSettingsSlider('profile')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Store className="w-4 h-4" />
                    <span>{isTamil ? 'கடை சுயவிவரம் & வன்பொருள்' : 'Shop Profile & Hardware'}</span>
                  </button>
                  <button
                    type="button"
                    className={`settings-slider-btn ${settingsSlider === 'staff' ? 'active' : ''}`}
                    onClick={() => setSettingsSlider('staff')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Users className="w-4 h-4" />
                    <span>{isTamil ? 'பயனர்கள் & ஊழியர்கள்' : 'Users & Staff'} ({staffList.length})</span>
                  </button>
                </div>

                {settingsSlider === 'profile' ? (
                  <div>
                    {/* Top Shop Profile Bar */}
                    <div className="profile-header-card">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div
                          className="profile-avatar-wrap"
                          onClick={() => logoInputRef.current?.click()}
                          title="Click camera icon to change shop logo"
                        >
                          {shop?.logoUrl ? (
                            <img src={shop.logoUrl} alt={shop.name} className="profile-avatar-img" />
                          ) : (
                            <div
                              style={{
                                width: '100%',
                                height: '100%',
                                borderRadius: '50%',
                                background: 'var(--brand)',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '26px',
                                fontWeight: 700,
                              }}
                            >
                              {(shop?.name || 'C')[0].toUpperCase()}
                            </div>
                          )}
                          <span className="profile-camera-badge" title="Upload new logo" style={{ display: 'grid', placeItems: 'center' }}>
                            <Camera className="w-3.5 h-3.5 text-white" />
                          </span>
                          <input
                            type="file"
                            ref={logoInputRef}
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  showToast('Uploading shop logo to cloud...');
                                  await uploadLogo(file);
                                  showToast('Shop logo updated & synced with mobile!');
                                } catch (err) {
                                  console.error('Logo upload error:', err);
                                  showToast('Failed to upload shop logo.');
                                }
                              }
                            }}
                          />
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <h2 style={{ margin: 0, font: '700 22px var(--head)', color: 'var(--ink)' }}>
                              {shop?.name || 'Counter 365 Shop'}
                            </h2>
                            <button
                              type="button"
                              className="btn g sm"
                              onClick={() => {
                                setEditShopName(shop?.name || '');
                                setEditShopPhone(shop?.phone || '');
                                setEditShopCity(shop?.city || '');
                                setEditOwnerName(shop?.ownerName || profile?.fullName || '');
                                setIsEditingShop(true);
                              }}
                              title="Edit shop profile"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 600 }}
                            >
                              <span className="icon-edit" style={{ width: '13px', height: '13px' }} />
                              <span>Edit</span>
                            </button>
                          </div>
                          <small style={{ color: 'var(--mu)', fontSize: '13px', display: 'block', marginTop: '3px' }}>
                            {shop?.city || 'Anna Nagar, Chennai'} · {shop?.phone || profile?.phone || 'No phone'}
                          </small>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span
                          className="tag"
                          style={{
                            background: subscriptionStatus?.isPaidActive ? 'var(--okbg)' : 'var(--bsoft)',
                            color: subscriptionStatus?.isPaidActive ? 'var(--ok)' : 'var(--brand)',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Crown className="w-3.5 h-3.5" />
                          <span>{subscriptionStatus?.isPaidActive ? 'Pro Active' : 'Free Tier'}</span>
                        </span>
                      </div>
                    </div>

                    {/* Below that: Subscription Box with Counter365 Logo & Progress Bar */}
                    <div className="sub-box-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <img
                            src="/counter365_mark.png"
                            alt="Counter365 Logo"
                            style={{ width: '40px', height: '40px', objectFit: 'contain' }}
                          />
                          <div>
                            <b style={{ fontSize: '16px', font: '700 16px var(--head)', color: 'var(--ink)', display: 'block' }}>
                              Counter365 Billing Plan
                            </b>
                            <small style={{ color: 'var(--mu)', fontSize: '12.5px' }}>
                              {subscriptionStatus?.isPaidActive
                                ? 'Unlimited bills included with active Pro membership'
                                : 'For every member: 100 free bills to get started'}
                            </small>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              padding: '6px 14px',
                              borderRadius: '99px',
                              fontWeight: 700,
                              fontSize: '12px',
                              background: subscriptionStatus?.isPaidActive ? '#059669' : '#ff5f00',
                              color: '#ffffff',
                              letterSpacing: '0.02em',
                            }}
                          >
                            {subscriptionStatus?.isPaidActive ? 'PRO ACTIVE' : 'FREE TIER (100 BILLS)'}
                          </span>

                          <button
                            type="button"
                            className="btn p"
                            onClick={() => setShowUpgradeProModal(true)}
                            style={{
                              padding: '6px 16px',
                              borderRadius: '99px',
                              fontWeight: 700,
                              fontSize: '12px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Upgrade to Pro</span>
                          </button>
                        </div>
                      </div>

                      {/* Progress Bar of how much they have used */}
                      {(() => {
                        const totalAllowed = 100;
                        const billsCreated = bills.length;
                        const billsUsed = Math.min(totalAllowed, billsCreated);
                        const billsRemaining = Math.max(0, totalAllowed - billsUsed);
                        const pct = Math.min(100, Math.round((billsUsed / totalAllowed) * 100));

                        return (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                              <span style={{ color: 'var(--ink)' }}>
                                <b>{billsUsed}</b> / {totalAllowed} free bills used
                              </span>
                              <span style={{ color: 'var(--brand)' }}>{billsRemaining} bills remaining</span>
                            </div>
                            <div className="progress-track">
                              <div className="progress-fill" style={{ width: `${pct}%` }}></div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                              <small style={{ color: 'var(--mu)', fontSize: '12px' }}>
                                {billsRemaining > 0
                                  ? `You have ${billsRemaining} free bills left before subscription limit.`
                                  : 'Quota completed! Upgrade to Counter365 Pro for unlimited billing.'}
                              </small>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Hardware & Billing Settings Grid */}
                    <div className="two">
                      {/* Left: Hardware & Billing Controls */}
                      <section className="card">
                        <b style={{ font: '600 20px var(--head)', color: 'var(--ink)' }}>Hardware & Billing Settings</b>
                        <div style={{ height: '14px' }}></div>

                        {/* 1. Thermal Printer Toggle */}
                        <div className="opt" style={{ border: 0, paddingBottom: '14px' }}>
                          <div>
                            <b style={{ fontWeight: 600, color: 'var(--ink)' }}>Thermal printer</b>
                            <small style={{ color: 'var(--mu)' }}>
                              {shop?.printerEnabled
                                ? `Enabled • ${shop?.printerPaperWidth || '80mm'} thermal paper roll`
                                : 'Off • Enable for fast POS counter receipts'}
                            </small>
                          </div>
                          <button
                            type="button"
                            className={`sw ${shop?.printerEnabled ? 'on' : ''}`}
                            onClick={async () => {
                              const next = !shop?.printerEnabled;
                              await updateShop({
                                printerEnabled: next,
                                printerPaperWidth: shop?.printerPaperWidth || '80mm',
                              });
                            }}
                            role="switch"
                            aria-checked={!!shop?.printerEnabled}
                            aria-label="Toggle thermal printer"
                          />
                        </div>

                        {/* Paper Size Selection (Only when printer is ON) */}
                        {shop?.printerEnabled && (
                          <div
                            style={{
                              background: 'var(--bsoft)',
                              padding: '16px',
                              borderRadius: '14px',
                              border: '1px solid var(--ln)',
                              marginBottom: '18px',
                            }}
                          >
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', marginBottom: '10px' }}>
                              Select Thermal Paper Size:
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                              <button
                                type="button"
                                onClick={() => updateShop({ printerPaperWidth: '58mm' })}
                                className="btn sm"
                                style={{
                                  padding: '10px 14px',
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  borderRadius: '10px',
                                  textAlign: 'center',
                                  justifyContent: 'center',
                                  background: (shop?.printerPaperWidth || '80mm') === '58mm' ? 'var(--brand)' : 'var(--card)',
                                  color: (shop?.printerPaperWidth || '80mm') === '58mm' ? '#ffffff' : 'var(--ink)',
                                  border: (shop?.printerPaperWidth || '80mm') === '58mm' ? '1px solid var(--brand)' : '1px solid var(--ln)',
                                }}
                              >
                                58 mm (2-inch Roll)
                              </button>
                              <button
                                type="button"
                                onClick={() => updateShop({ printerPaperWidth: '80mm' })}
                                className="btn sm"
                                style={{
                                  padding: '10px 14px',
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  borderRadius: '10px',
                                  textAlign: 'center',
                                  justifyContent: 'center',
                                  background: (shop?.printerPaperWidth || '80mm') === '80mm' ? 'var(--brand)' : 'var(--card)',
                                  color: (shop?.printerPaperWidth || '80mm') === '80mm' ? '#ffffff' : 'var(--ink)',
                                  border: (shop?.printerPaperWidth || '80mm') === '80mm' ? '1px solid var(--brand)' : '1px solid var(--ln)',
                                }}
                              >
                                80 mm (3-inch Roll)
                              </button>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' }}>
                              <button
                                type="button"
                                onClick={() => webPrinterService.printTestSlip(shop!, shop?.printerPaperWidth || '80mm')}
                                className="btn g sm"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  fontSize: '12.5px',
                                  fontWeight: 600,
                                  padding: '7px 14px',
                                  borderRadius: '8px',
                                }}
                              >
                                <span>🖨️</span>
                                <span>Test Print Slip</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* 2. GST on bills Toggle */}
                        <div className="opt" style={{ paddingBottom: '14px' }}>
                          <div>
                            <b style={{ fontWeight: 600, color: 'var(--ink)' }}>GST on bills</b>
                            <small style={{ color: 'var(--mu)' }}>
                              Calculate and print GST split-up on every bill {shop?.gstEnabled ? `(${shop?.gstRate || 5}% active)` : ''}
                            </small>
                          </div>
                          <button
                            type="button"
                            className={`sw ${shop?.gstEnabled ? 'on' : ''}`}
                            onClick={async () => {
                              const next = !shop?.gstEnabled;
                              if (next) {
                                setIsGstEditorOpen(true);
                                await updateShop({ gstEnabled: true });
                              } else {
                                setIsGstEditorOpen(false);
                                await updateShop({ gstEnabled: false });
                              }
                            }}
                            role="switch"
                            aria-checked={!!shop?.gstEnabled}
                            aria-label="Toggle GST on bills"
                          />
                        </div>

                        {/* Custom GST Rate Configuration */}
                        {shop?.gstEnabled && (
                          <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '14px', marginBottom: '18px', border: '1px solid var(--ln)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                              <b style={{ fontSize: '13px', color: 'var(--ink)' }}>Configure GST Rate (%)</b>
                              <button
                                type="button"
                                className="btn g sm"
                                onClick={() => setIsGstEditorOpen((v) => !v)}
                                style={{ fontSize: '11.5px', padding: '2px 8px' }}
                              >
                                {isGstEditorOpen ? 'Hide' : 'Edit rate'}
                              </button>
                            </div>

                            {isGstEditorOpen && (
                              <div>
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                  {['5', '12', '18'].map((r) => (
                                    <button
                                      key={r}
                                      type="button"
                                      className={`btn ${gstRateInput === r ? 'b' : 'g'} sm`}
                                      onClick={() => setGstRateInput(r)}
                                      style={{ flex: 1, padding: '6px 0', fontSize: '12px' }}
                                    >
                                      {r}%
                                    </button>
                                  ))}
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <input
                                    className="in"
                                    type="number"
                                    value={gstRateInput}
                                    onChange={(e) => setGstRateInput(e.target.value)}
                                    placeholder="Custom %"
                                    style={{ flex: 1, padding: '7px 12px', fontSize: '13px' }}
                                  />
                                  <button
                                    type="button"
                                    className="btn b sm"
                                    onClick={async () => {
                                      const rate = Math.max(0, Number(gstRateInput) || 5);
                                      await updateShop({ gstEnabled: true, gstRate: rate });
                                      setIsGstEditorOpen(false);
                                      showToast(`GST rate saved as ${rate}%`);
                                    }}
                                    style={{ padding: '0 16px', fontSize: '12.5px' }}
                                  >
                                    Save & close
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 3. Round off totals nearest to rupee Toggle */}
                        <div className="opt" style={{ paddingBottom: '14px' }}>
                          <div>
                            <b style={{ fontWeight: 600, color: 'var(--ink)' }}>Round off totals nearest to rupee</b>
                            <small style={{ color: 'var(--mu)' }}>
                              Automatically rounds final amount up or down (e.g. ₹10.40 → ₹10, ₹10.60 → ₹11)
                            </small>
                          </div>
                          <button
                            type="button"
                            className={`sw ${shop?.roundOffEnabled ? 'on' : ''}`}
                            onClick={async () => {
                              const next = !shop?.roundOffEnabled;
                              await updateShop({ roundOffEnabled: next });
                              showToast(next ? 'Round-off enabled' : 'Round-off disabled');
                            }}
                            role="switch"
                            aria-checked={!!shop?.roundOffEnabled}
                            aria-label="Toggle Round off totals"
                          />
                        </div>

                        {/* 4. Table settings (Dining) Toggle */}
                        <div className="opt" style={{ paddingBottom: '14px' }}>
                          <div>
                            <b style={{ fontWeight: 600, color: 'var(--ink)' }}>Table settings (Dining)</b>
                            <small style={{ color: 'var(--mu)' }}>
                              Dine-in table billing option in POS with floor table selection
                            </small>
                          </div>
                          <button
                            type="button"
                            className={`sw ${shop?.tableManagementEnabled ? 'on' : ''}`}
                            onClick={async () => {
                              const next = !shop?.tableManagementEnabled;
                              const count = Math.max(1, Number(tableCountInput) || shop?.tableCount || 6);
                              await updateShop({ tableManagementEnabled: next, tableCount: count });
                              if (next) {
                                setIsTableEditorOpen(true);
                                showToast(`Dining tables enabled (${count} tables)`);
                              } else {
                                setIsTableEditorOpen(false);
                                showToast('Dining tables disabled');
                              }
                            }}
                            role="switch"
                            aria-checked={!!shop?.tableManagementEnabled}
                            aria-label="Toggle Table settings dining"
                          />
                        </div>

                        {/* Table Count Editor */}
                        {shop?.tableManagementEnabled && (
                          <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '14px', marginBottom: '14px', border: '1px solid var(--ln)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <b style={{ fontSize: '13px', color: 'var(--ink)', display: 'block' }}>
                                  {shop?.tableCount || 6} Dining Tables Configured
                                </b>
                                <small style={{ color: 'var(--mu)', fontSize: '11.5px' }}>
                                  Available in POS Billing next to Menu management
                                </small>
                              </div>
                              <button
                                type="button"
                                className="btn g sm"
                                onClick={() => setIsTableEditorOpen((v) => !v)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', padding: '3px 10px' }}
                              >
                                {!isTableEditorOpen && <span className="icon-edit" style={{ width: '12px', height: '12px' }} />}
                                <span>{isTableEditorOpen ? 'Close' : 'Edit tables'}</span>
                              </button>
                            </div>

                            {isTableEditorOpen && (
                              <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                                <input
                                  className="in"
                                  type="number"
                                  min={1}
                                  max={100}
                                  value={tableCountInput}
                                  onChange={(e) => setTableCountInput(e.target.value)}
                                  placeholder="e.g. 10"
                                  style={{ flex: 1, padding: '7px 12px', fontSize: '13px' }}
                                />
                                <button
                                  type="button"
                                  className="btn b sm"
                                  onClick={async () => {
                                    const count = Math.max(1, Number(tableCountInput) || 6);
                                    await updateShop({ tableManagementEnabled: true, tableCount: count });
                                    setIsTableEditorOpen(false);
                                    showToast(`Configured ${count} tables successfully!`);
                                  }}
                                  style={{ padding: '0 16px', fontSize: '12.5px' }}
                                >
                                  Save tables
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </section>

                      {/* Right: Preferences & Theme */}
                      <section className="card">
                        <b style={{ font: '600 20px var(--head)', color: 'var(--ink)' }}>Display & Preferences</b>
                        <div style={{ height: '14px' }}></div>

                        {/* Theme Switch Toggle */}
                        <div className="opt" style={{ border: 0, paddingBottom: '14px' }}>
                          <div>
                            <b style={{ fontWeight: 600, color: 'var(--ink)' }}>Theme mode</b>
                            <small style={{ color: 'var(--mu)' }}>
                              Currently using {theme === 'dark' ? 'Dark theme 🌙' : 'Light theme ☀️'}
                            </small>
                          </div>
                          <button
                            type="button"
                            className={`sw ${theme === 'dark' ? 'on' : ''}`}
                            onClick={toggleTheme}
                            role="switch"
                            aria-checked={theme === 'dark'}
                            aria-label="Toggle theme mode"
                          />
                        </div>

                        {[
                          {
                            id: 'print',
                            title: 'Print receipts automatically',
                            sub: 'Send each saved bill straight to the printer spooler',
                            val: prefPrint,
                            toggle: () => setPrefPrint((v) => !v),
                          },
                          {
                            id: 'upi',
                            title: 'Show UPI QR on bills',
                            sub: 'Customers can scan to pay with GPay / PhonePe / Paytm',
                            val: prefUpi,
                            toggle: () => setPrefUpi((v) => !v),
                          },
                          {
                            id: 'sound',
                            title: 'Order confirmation sound',
                            sub: 'Play a subtle chime when an order is completed',
                            val: prefSound,
                            toggle: () => setPrefSound((v) => !v),
                          },
                        ].map((x) => (
                          <div key={x.id} className="opt">
                            <div>
                              <b style={{ fontWeight: 500, color: 'var(--ink)' }}>{x.title}</b>
                              <small style={{ color: 'var(--mu)' }}>{x.sub}</small>
                            </div>
                            <button
                              className={`sw ${x.val ? 'on' : ''}`}
                              onClick={x.toggle}
                              role="switch"
                              aria-checked={x.val}
                              aria-label={x.title}
                            />
                          </div>
                        ))}
                      </section>
                    </div>
                  </div>
                ) : (
                  /* USERS & STAFF TAB */
                  <div>
                    <UsersStaffSection
                      shopId={shop?.id}
                      shop={shop}
                      members={staffList}
                      onMembersChange={setStaffList}
                    />
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Day Closing Modal Popup */}
      {showDayClosingModal && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDayClosingModal(false);
          }}
        >
          <div className="closing-modal-card printable-day-closing">
            {/* Close Modal Button */}
            <button
              className="modal-close-btn no-print"
              onClick={() => setShowDayClosingModal(false)}
              aria-label="Close modal"
            >
              <svg className="ic">
                <use href="#x" />
              </svg>
            </button>

            {/* Shop Identity Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <img
                src={shop?.logoUrl || '/counter365_mark.png'}
                alt={shop?.name || 'Shop Logo'}
                style={{
                  width: '42px',
                  height: '42px',
                  objectFit: 'cover',
                  borderRadius: shop?.logoUrl ? '50%' : '8px',
                  flexShrink: 0,
                  border: '1px solid var(--ln)',
                  background: 'var(--card)',
                }}
              />
              <div>
                <b style={{ font: '700 20px var(--head)', display: 'block', letterSpacing: '-0.02em', color: 'var(--ink)' }}>
                  {shop?.name || 'Counter 365 Shop'}
                </b>
                <small style={{ color: 'var(--mu)', fontSize: '13px' }}>
                  {shop?.city || 'Anna Nagar, Chennai'}
                  {shop?.phone ? ` · ${shop.phone}` : profile?.phone ? ` · ${profile.phone}` : ''}
                </small>
              </div>
            </div>

            {/* Date Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 14px',
                borderRadius: '99px',
                background: 'var(--bsoft)',
                color: 'var(--brand)',
                fontSize: '12px',
                fontWeight: 600,
                marginBottom: '16px',
              }}
            >
              {new Date().toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </div>

            {/* Heading requested: "today's revenue settled, register and profits" */}
            <div style={{ marginBottom: '18px' }}>
              <h2 style={{ margin: 0, font: '700 22px var(--head)', letterSpacing: '-0.02em', color: 'var(--ink)' }}>
                Today’s revenue settled, register and profits
              </h2>
              <p style={{ margin: '4px 0 0', color: 'var(--mu)', fontSize: '13px' }}>
                Complete register reconciliation for the counter
              </p>
            </div>

            {/* Register Details List */}
            <div className="slip" style={{ marginBottom: '22px' }}>
              <p style={{ borderTop: '1px solid var(--ln)', padding: '11px 0' }}>
                <span style={{ fontSize: '14px' }}>Total sales</span>
                <b style={{ fontSize: '16px' }}>{fm(totals.sales)}</b>
              </p>
              <p style={{ padding: '11px 0' }}>
                <span style={{ fontSize: '14px' }}>How many bills today</span>
                <b style={{ fontSize: '16px' }}>{totals.n} bills</b>
              </p>
              <p style={{ padding: '11px 0' }}>
                <span style={{ fontSize: '14px' }}>Cash collected</span>
                <b style={{ fontSize: '16px' }}>{fm(totals.cash)}</b>
              </p>
              <p style={{ padding: '11px 0' }}>
                <span style={{ fontSize: '14px' }}>UPI collected</span>
                <b style={{ fontSize: '16px' }}>{fm(totals.upi)}</b>
              </p>
              <p style={{ padding: '11px 0' }}>
                <span style={{ fontSize: '14px' }}>Pending khata</span>
                <b style={{ fontSize: '16px', color: totals.due > 0 ? 'var(--brand)' : 'inherit' }}>
                  {fm(totals.due)}
                </b>
              </p>
              <p style={{ padding: '11px 0' }}>
                <span style={{ fontSize: '14px' }}>Total expense</span>
                <b style={{ fontSize: '16px' }}>− {fm(totals.exp)}</b>
              </p>
              <p
                style={{
                  borderTop: '2px solid var(--ink)',
                  marginTop: '6px',
                  padding: '14px 0 4px',
                  font: '700 20px var(--head)',
                }}
              >
                <span style={{ color: 'var(--ink)' }}>Net profit</span>
                <b style={{ fontSize: '26px', color: 'var(--brand)' }}>{fm(totals.net)}</b>
              </p>
            </div>

            {/* Action Buttons: WhatsApp & Print */}
            <div className="no-print" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                className="btn wa-btn"
                style={{ justifyContent: 'center', fontSize: '13.5px', padding: '12px 16px' }}
                onClick={handleSendToWhatsApp}
              >
                <svg
                  viewBox="0 0 24 24"
                  style={{ width: '18px', height: '18px', fill: 'currentColor', flexShrink: 0 }}
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Send to WhatsApp
              </button>

              <button
                className="btn g"
                style={{ justifyContent: 'center', fontSize: '13.5px', padding: '12px 16px' }}
                onClick={handlePrintDayClosing}
              >
                <svg className="ic">
                  <use href="#bill" />
                </svg>
                Print register
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Audit Statement Preview Modal */}
      {showReportPreviewModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowReportPreviewModal(false)}
        >
          <div
            className="closing-modal-card printable-day-closing"
            style={{ maxWidth: '640px', padding: '28px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img
                  src={shop?.logoUrl || '/counter365_mark.png'}
                  alt={shop?.name || 'Shop Logo'}
                  style={{
                    width: '38px',
                    height: '38px',
                    objectFit: 'cover',
                    borderRadius: shop?.logoUrl ? '50%' : '8px',
                    border: '1px solid var(--ln)',
                    background: 'var(--card)',
                  }}
                />
                <div>
                  <h3 style={{ margin: 0, font: '700 18px var(--head)', color: 'var(--ink)' }}>
                    Monthly Statement · {reportMonthName}
                  </h3>
                  <small style={{ color: 'var(--mu)' }}>{shop?.name || 'Counter 365'} · {shop?.city || 'Chennai'}</small>
                </div>
              </div>
              <button
                type="button"
                className="btn g sm no-print"
                onClick={() => setShowReportPreviewModal(false)}
                style={{ width: '28px', height: '28px', padding: 0 }}
              >
                ✕
              </button>
            </div>

            {/* Financial Overview Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '18px', textAlign: 'center' }}>
              <div style={{ background: 'var(--card)', padding: '12px', borderRadius: '10px', border: '1px solid var(--ln)' }}>
                <span style={{ fontSize: '11.5px', color: 'var(--mu)', display: 'block' }}>Total Sales</span>
                <b style={{ fontSize: '18px', color: 'var(--ink)' }}>{fm(monthlyStats.sales)}</b>
              </div>
              <div style={{ background: 'var(--card)', padding: '12px', borderRadius: '10px', border: '1px solid var(--ln)' }}>
                <span style={{ fontSize: '11.5px', color: 'var(--mu)', display: 'block' }}>Total Expenses</span>
                <b style={{ fontSize: '18px', color: '#dc2626' }}>{fm(monthlyStats.expense)}</b>
              </div>
              <div style={{ background: 'var(--okbg)', padding: '12px', borderRadius: '10px', border: '1px solid var(--ln)' }}>
                <span style={{ fontSize: '11.5px', color: 'var(--ok)', display: 'block' }}>Net Profit</span>
                <b style={{ fontSize: '18px', color: '#059669' }}>{fm(monthlyStats.profit)}</b>
              </div>
            </div>

            {/* Payment Summary */}
            <div style={{ background: 'var(--card)', borderRadius: '10px', border: '1px solid var(--ln)', padding: '14px', marginBottom: '18px' }}>
              <b style={{ fontSize: '13px', color: 'var(--ink)', display: 'block', marginBottom: '8px' }}>Payment Collections:</b>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span style={{ color: 'var(--mu)' }}>Cash in Register:</span>
                <b>{fm(monthlyStats.cash)}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span style={{ color: 'var(--mu)' }}>GPay / UPI:</span>
                <b>{fm(monthlyStats.upi)}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#d97706' }}>Pending Khata:</span>
                <b style={{ color: '#d97706' }}>{fm(monthlyStats.pending)}</b>
              </div>
            </div>

            {/* Top 5 Days Preview */}
            <div style={{ marginBottom: '20px' }}>
              <b style={{ fontSize: '13px', color: 'var(--ink)', display: 'block', marginBottom: '8px' }}>
                Top Operating Days Snapshot:
              </b>
              <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--ln)', borderRadius: '8px' }}>
                {monthlyStats.days.slice(0, 10).map(d => (
                  <div key={d.dayNum} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', borderBottom: '1px solid var(--ln)', fontSize: '12px' }}>
                    <span>{d.dayNum} {reportDate.toLocaleDateString('en-IN', { month: 'short' })} ({d.weekday})</span>
                    <span>{d.billsCount} bills</span>
                    <b>{fm(d.sales)}</b>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="no-print" style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn g"
                style={{ flex: 1 }}
                onClick={() => setShowReportPreviewModal(false)}
              >
                Close Preview
              </button>
              <button
                type="button"
                className="btn g"
                style={{ flex: 1 }}
                onClick={handleDownloadPDF}
              >
                📄 Print / PDF
              </button>
              <button
                type="button"
                className="btn p"
                style={{ flex: 1 }}
                onClick={handleSendMonthlyWhatsApp}
              >
                💬 WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unidentified / Custom Product Quick Modal */}
      {showUnidentifiedModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowUnidentifiedModal(false)}
        >
          <div
            className="closing-modal-card"
            style={{ maxWidth: '440px', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>⚡</span>
                <h3 style={{ margin: 0, font: '700 18px var(--head)', color: 'var(--ink)' }}>
                  Add Unidentified Item
                </h3>
              </div>
              <button
                onClick={() => setShowUnidentifiedModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  lineHeight: 1,
                  cursor: 'pointer',
                  color: 'var(--mu)',
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--mu)' }}>
              Add a custom dish or one-off item directly to the current POS order.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddUnidentified();
              }}
            >
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--mu)', marginBottom: '6px' }}>
                  Item Name
                </label>
                <input
                  type="text"
                  className="search"
                  placeholder="e.g. Special Dosa, Catering Pack"
                  value={unidentifiedName}
                  onChange={(e) => setUnidentifiedName(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--mu)', marginBottom: '6px' }}>
                  Price (₹) *
                </label>
                <input
                  type="number"
                  step="any"
                  className="search"
                  placeholder="0.00"
                  value={unidentifiedPrice}
                  onChange={(e) => setUnidentifiedPrice(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', fontSize: '18px', fontWeight: 700 }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '10px' }}>
                <button
                  type="button"
                  className="btn g"
                  onClick={() => setShowUnidentifiedModal(false)}
                  style={{ justifyContent: 'center' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn"
                  style={{ justifyContent: 'center' }}
                >
                  + Add to Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showAddCategoryModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowAddCategoryModal(false)}
        >
          <div
            className="closing-modal-card"
            style={{ maxWidth: '420px', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>📁</span>
                <h3 style={{ margin: 0, font: '700 18px var(--head)', color: 'var(--ink)' }}>
                  Add Category
                </h3>
              </div>
              <button
                onClick={() => setShowAddCategoryModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  lineHeight: 1,
                  cursor: 'pointer',
                  color: 'var(--mu)',
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--mu)' }}>
              Create a new category for your menu items (e.g. Snacks, Fresh Juices, Biryani).
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateCategoryAndAddItem();
              }}
            >
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--mu)', marginBottom: '6px' }}>
                  Category Name *
                </label>
                <input
                  type="text"
                  className="search"
                  placeholder="e.g. Fresh Juices, Snacks"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  autoFocus
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '10px' }}>
                <button
                  type="button"
                  className="btn g"
                  onClick={() => setShowAddCategoryModal(false)}
                  style={{ justifyContent: 'center' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn"
                  style={{ justifyContent: 'center' }}
                >
                  Create and add item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bill Saved Successfully Animated Green Paper Slip */}
      {savedBillSuccess && (
        <div
          className="modal-backdrop"
          onClick={() => {
            if (successTimerRef.current) clearTimeout(successTimerRef.current);
            setSavedBillSuccess(null);
          }}
          style={{ zIndex: 1200 }}
        >
          <div
            className="success-slip-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Success Header */}
            <div style={{ textAlign: 'center', marginBottom: '16px', marginTop: '6px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#fff',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '22px',
                  fontWeight: 900,
                  margin: '0 auto 10px',
                  boxShadow: '0 8px 18px rgba(16, 185, 129, 0.35)',
                }}
              >
                ✓
              </div>
              <h3 style={{ margin: 0, font: '700 20px var(--head)', color: 'var(--ok)' }}>
                Bill Saved Successfully!
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '13px', color: 'var(--ok)' }}>
                Printed to register & synced to cloud
              </p>
            </div>

            {/* Slip Details Box */}
            <div
              className="success-slip-box"
              style={{
                background: 'var(--card)',
                borderRadius: '14px',
                padding: '14px 16px',
                border: '1.5px dashed var(--ln)',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '12.5px', color: 'var(--mu)' }}>Bill Number</span>
                <b style={{ fontSize: '13.5px', color: 'var(--ink)' }}>{bn(savedBillSuccess.billNumber)}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '12.5px', color: 'var(--mu)' }}>Customer</span>
                <b style={{ fontSize: '13.5px', color: 'var(--ink)' }}>
                  {savedBillSuccess.customerName || 'Walk-in guest'}
                </b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '12.5px', color: 'var(--mu)' }}>Payment Mode</span>
                <b style={{ fontSize: '13.5px', color: 'var(--ink)' }}>{savedBillSuccess.paymentMode}</b>
              </div>
              {savedBillSuccess.pendingAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12.5px', color: '#dc2626', fontWeight: 600 }}>Khata Due</span>
                  <b style={{ fontSize: '13.5px', color: '#dc2626' }}>{fm(savedBillSuccess.pendingAmount)}</b>
                </div>
              )}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderTop: '1px solid var(--ln)',
                  paddingTop: '8px',
                  marginTop: '8px',
                }}
              >
                <b style={{ fontSize: '15px', color: 'var(--ink)' }}>Total Amount</b>
                <b style={{ fontSize: '19px', color: '#059669' }}>{fm(savedBillSuccess.totalAmount)}</b>
              </div>
            </div>

            {/* Quick Actions: WhatsApp & Thermal Print */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <button
                type="button"
                onClick={() => {
                  webWhatsappService.shareCustomerBill(
                    savedBillSuccess,
                    shop?.name || 'Counter 365',
                    shop?.upiId,
                    shop?.phone,
                    savedBillSuccess.customerPhone
                  );
                }}
                className="btn sm"
                style={{
                  flex: 1,
                  background: '#059669',
                  color: '#fff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: 'none',
                }}
              >
                <span>💬</span> Send WhatsApp
              </button>

              {shop?.printerEnabled && (
                <button
                  type="button"
                  onClick={() => {
                    webPrinterService.printReceipt(savedBillSuccess, shop, shop.printerPaperWidth);
                  }}
                  className="btn sm"
                  style={{
                    flex: 1,
                    background: '#FF5F00',
                    color: '#fff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: 'none',
                  }}
                >
                  <span>🖨️</span> Print Bill ({shop.printerPaperWidth || '80mm'})
                </button>
              )}
            </div>

            {/* View PDF Receipt Link */}
            <div style={{ marginBottom: '12px' }}>
              <a
                href={`/b/${savedBillSuccess.id || (savedBillSuccess.billNumber ? encodeURIComponent(savedBillSuccess.billNumber) : '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn sm"
                style={{
                  width: '100%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  padding: '9px 12px',
                  borderRadius: '10px',
                  background: 'var(--card)',
                  border: '1px solid var(--ln)',
                  color: 'var(--ink)',
                  textDecoration: 'none',
                }}
              >
                <span>📄</span> View PDF Receipt
              </a>
            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: 'var(--ok)', fontWeight: 600 }}>
                ✓ Synced & Ready
              </span>
              <button
                type="button"
                className="btn g sm"
                onClick={() => {
                  if (successTimerRef.current) clearTimeout(successTimerRef.current);
                  setSavedBillSuccess(null);
                }}
                style={{ padding: '8px 18px', fontSize: '13px', fontWeight: 600 }}
              >
                Close slip ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Bill Modal */}
      {editingBill && (
        <div className="modal-backdrop" onClick={() => setEditingBill(null)}>
          <div
            className="closing-modal-card"
            style={{ maxWidth: '440px', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="icon-edit" style={{ width: '18px', height: '18px', color: 'var(--brand)' }} />
                <h3 style={{ margin: 0, font: '700 17px var(--head)', color: 'var(--ink)' }}>
                  Edit Bill {bn(editingBill.billNumber)}
                </h3>
              </div>
              <button
                type="button"
                className="btn g sm"
                onClick={() => setEditingBill(null)}
                style={{ width: '28px', height: '28px', padding: 0 }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="lbl" style={{ display: 'block', marginBottom: '6px' }}>
                  Customer Name
                </label>
                <input
                  className="search"
                  style={{ width: '100%', margin: 0 }}
                  value={editBillCustName}
                  onChange={(e) => setEditBillCustName(e.target.value)}
                  placeholder="e.g. Ramesh"
                />
              </div>

              <div>
                <label className="lbl" style={{ display: 'block', marginBottom: '6px' }}>
                  Mobile Number (10 digits)
                </label>
                <input
                  type="tel"
                  className="search"
                  style={{ width: '100%', margin: 0 }}
                  value={editBillCustPhone}
                  onChange={(e) => setEditBillCustPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="e.g. 9876543210"
                  maxLength={10}
                />
              </div>

              <div>
                <label className="lbl" style={{ display: 'block', marginBottom: '6px' }}>
                  Payment Mode
                </label>
                <select
                  className="search"
                  style={{ width: '100%', margin: 0 }}
                  value={editBillPayMode}
                  onChange={(e) => setEditBillPayMode(e.target.value as PaymentMethod)}
                >
                  <option value="Cash">Cash</option>
                  <option value="GPay">GPay / UPI</option>
                  <option value="Pending">Pending (Khata)</option>
                  <option value="Card">Card</option>
                </select>
              </div>

              <div>
                <label className="lbl" style={{ display: 'block', marginBottom: '6px' }}>
                  Paid Amount (Total: {fm(editingBill.totalAmount)})
                </label>
                <input
                  type="number"
                  className="search"
                  style={{ width: '100%', margin: 0 }}
                  value={editBillPaidAmount}
                  onChange={(e) => setEditBillPaidAmount(e.target.value)}
                  placeholder={`Amount paid (max ${editingBill.totalAmount})`}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn g"
                  style={{ flex: 1 }}
                  onClick={() => setEditingBill(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn p"
                  style={{ flex: 1 }}
                  onClick={handleSaveEditedBill}
                >
                  Save & Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Shop Profile Modal */}
      {isEditingShop && (
        <div className="modal-backdrop" onClick={() => setIsEditingShop(false)}>
          <div
            className="closing-modal-card"
            style={{ maxWidth: '440px', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, font: '700 20px var(--head)', color: 'var(--ink)' }}>
                Edit Shop Details
              </h3>
              <button className="modal-close-btn" onClick={() => setIsEditingShop(false)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <label className="f">
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--mu)', marginBottom: '4px' }}>
                  Shop Name *
                </span>
                <input
                  className="in"
                  value={editShopName}
                  onChange={(e) => setEditShopName(e.target.value)}
                  placeholder="e.g. Raja Tea Stall"
                />
              </label>

              <label className="f">
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--mu)', marginBottom: '4px' }}>
                  Owner / Manager Name
                </span>
                <input
                  className="in"
                  value={editOwnerName}
                  onChange={(e) => setEditOwnerName(e.target.value)}
                  placeholder="e.g. Raja"
                />
              </label>

              <label className="f">
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--mu)', marginBottom: '4px' }}>
                  Phone Number
                </span>
                <input
                  className="in"
                  value={editShopPhone}
                  onChange={(e) => setEditShopPhone(e.target.value)}
                  placeholder="e.g. 9840012345"
                />
              </label>

              <label className="f">
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--mu)', marginBottom: '4px' }}>
                  Location / City
                </span>
                <input
                  className="in"
                  value={editShopCity}
                  onChange={(e) => setEditShopCity(e.target.value)}
                  placeholder="e.g. Anna Nagar, Chennai"
                />
              </label>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn g"
                onClick={() => setIsEditingShop(false)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn b"
                onClick={async () => {
                  if (!editShopName.trim()) {
                    showToast('Shop name is required');
                    return;
                  }
                  await updateShop({
                    name: editShopName.trim(),
                    ownerName: editOwnerName.trim(),
                    phone: editShopPhone.trim(),
                    city: editShopCity.trim(),
                  });
                  setIsEditingShop(false);
                  showToast('Shop details updated successfully!');
                }}
                style={{ flex: 1 }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Staff Member Modal with 8 Module Permissions */}
      {isStaffModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsStaffModalOpen(false)}>
          <div
            className="closing-modal-card"
            style={{ maxWidth: '580px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, font: '700 20px var(--head)', color: 'var(--ink)' }}>
                  {editingStaffMember ? 'Edit Staff Member' : 'Add Staff Member'}
                </h3>
                <small style={{ color: 'var(--mu)', fontSize: '12.5px' }}>
                  Configure user credentials and module permissions
                </small>
              </div>
              <button className="modal-close-btn" onClick={() => setIsStaffModalOpen(false)}>✕</button>
            </div>

            {/* Inputs: Name & 10-digit Phone */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <label className="f">
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--mu)', marginBottom: '4px' }}>
                  Staff member name *
                </span>
                <input
                  className="in"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  placeholder="e.g. Ramesh"
                />
              </label>

              <label className="f">
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--mu)', marginBottom: '4px' }}>
                  10-digit mobile number *
                </span>
                <input
                  className="in"
                  type="tel"
                  maxLength={10}
                  value={newStaffPhone}
                  onChange={(e) => setNewStaffPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 9840012345"
                />
              </label>
            </div>

            {/* Two Roles: Supervisor or Biller */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--mu)', marginBottom: '8px' }}>
                Operational Role
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div
                  onClick={() => {
                    setNewStaffRole('Supervisor');
                    setNewStaffOverrides({
                      bill: true,
                      total: true,
                      exp: true,
                      pend: true,
                      report: true,
                      menu: true,
                      menu_delete: true,
                      users: false,
                      subscription: false,
                    });
                  }}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: `2px solid ${newStaffRole === 'Supervisor' ? 'var(--brand)' : 'var(--ln)'}`,
                    background: newStaffRole === 'Supervisor' ? 'var(--bsoft)' : 'var(--card)',
                    cursor: 'pointer',
                  }}
                >
                  <b style={{ display: 'block', fontSize: '14px', color: 'var(--ink)' }}>Supervisor</b>
                  <small style={{ color: 'var(--mu)', fontSize: '11.5px' }}>
                    Counter ops, expenses, menu & reports (all on except user management)
                  </small>
                </div>

                <div
                  onClick={() => {
                    setNewStaffRole('Biller');
                    setNewStaffOverrides({
                      bill: true,
                      total: true,
                      exp: false,
                      pend: false,
                      report: false,
                      menu: false,
                      menu_delete: false,
                      users: false,
                      subscription: false,
                    });
                  }}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: `2px solid ${newStaffRole === 'Biller' ? 'var(--brand)' : 'var(--ln)'}`,
                    background: newStaffRole === 'Biller' ? 'var(--bsoft)' : 'var(--card)',
                    cursor: 'pointer',
                  }}
                >
                  <b style={{ display: 'block', fontSize: '14px', color: 'var(--ink)' }}>Biller</b>
                  <small style={{ color: 'var(--mu)', fontSize: '11.5px' }}>
                    Take bills and see day total only (remaining modules blocked)
                  </small>
                </div>
              </div>
            </div>

            {/* 8 Module Permissions */}
            <div style={{ marginBottom: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
                  Module Permissions (8 Total)
                </label>
                <small style={{ color: 'var(--mu)', fontSize: '11.5px' }}>
                  Toggle individual modules to customize
                </small>
              </div>

              <div className="perm-toggle-grid">
                {MODULE_PERMISSIONS.map((p) => {
                  const isChecked = !!newStaffOverrides[p.key];

                  return (
                    <div key={p.key} className="perm-toggle-item">
                      <div style={{ flex: 1, paddingRight: '8px' }}>
                        <b style={{ display: 'block', fontSize: '13px', color: 'var(--ink)' }}>{p.label}</b>
                        <small style={{ color: 'var(--mu)', fontSize: '11px', display: 'block' }}>{p.desc}</small>
                      </div>
                      <button
                        type="button"
                        className={`sw ${isChecked ? 'on' : ''}`}
                        onClick={() => {
                          setNewStaffOverrides((prev) => ({
                            ...prev,
                            [p.key]: !isChecked,
                          }));
                        }}
                        role="switch"
                        aria-checked={isChecked}
                        aria-label={p.label}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn g"
                onClick={() => setIsStaffModalOpen(false)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn b"
                onClick={async () => {
                  if (!newStaffName.trim()) {
                    showToast('Staff member name is required');
                    return;
                  }
                  const cleanPhone = newStaffPhone.replace(/\D/g, '').slice(-10);
                  if (cleanPhone.length !== 10) {
                    showToast('Please enter a valid 10-digit mobile number');
                    return;
                  }

                  try {
                    if (editingStaffMember) {
                      await shopService.updateMemberRole(
                        editingStaffMember.id,
                        shop.id,
                        newStaffRole,
                        newStaffOverrides,
                        { fullName: newStaffName.trim(), phone: cleanPhone }
                      );
                      setStaffList((prev) =>
                        prev.map((m) =>
                          m.id === editingStaffMember.id
                            ? { ...m, fullName: newStaffName.trim(), phone: cleanPhone, role: newStaffRole, overrides: newStaffOverrides }
                            : m
                        )
                      );
                      showToast('Staff permissions updated and synchronized!');
                    } else {
                      const created = await shopService.addStaffMember(shop.id, {
                        fullName: newStaffName.trim(),
                        phone: cleanPhone,
                        role: newStaffRole,
                        overrides: newStaffOverrides,
                      });
                      setStaffList((prev) => [created, ...prev]);
                      showToast('Staff member added and synchronized!');
                    }
                    setIsStaffModalOpen(false);
                  } catch (err: any) {
                    showToast('Failed to save staff user.');
                  }
                }}
                style={{ flex: 1 }}
              >
                Save User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table Selection / Dining Floor Modal for POS Billing */}
      {isTableModalOpen && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsTableModalOpen(false);
          }}
        >
          <div
            className="closing-modal-card"
            style={{ maxWidth: '540px', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>🍽️</span>
                <div>
                  <h3 style={{ margin: 0, font: '700 20px var(--head)', color: 'var(--ink)' }}>
                    Restaurant Floor & Tables
                  </h3>
                  <small style={{ color: 'var(--mu)', fontSize: '12.5px' }}>
                    {selectedTable ? `Currently Billing: ${selectedTable}` : 'Counter Mode (Standard Takeaway)'}
                  </small>
                </div>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setIsTableModalOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Quick Action: Clear Table / Switch to Counter */}
            <div
              className="switch-counter-bar"
              style={{ cursor: 'pointer', marginBottom: '18px' }}
              onClick={() => {
                setSelectedTable(null);
                setIsTableModalOpen(false);
                showToast('Switched to Counter Billing (Takeaway). Cart items preserved');
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>{!selectedTable ? '✅' : '🏪'}</span>
                <div>
                  <b style={{ color: !selectedTable ? 'var(--ok)' : 'var(--brand)', display: 'block', fontSize: '13.5px' }}>
                    Clear Table / Switch to Counter
                  </b>
                  <small style={{ color: 'var(--mu)', fontSize: '11.5px' }}>
                    {!selectedTable ? 'Active mode: Counter / Takeaway' : 'Unassign table and bill at counter (items kept)'}
                  </small>
                </div>
              </div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brand)' }}>Switch →</span>
            </div>

            {/* Grid of Tables */}
            <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b style={{ fontSize: '13px', color: 'var(--ink)' }}>Select Dining Table ({shop?.tableCount || 6} Total)</b>
              <button
                type="button"
                className="btn g sm"
                style={{ fontSize: '11.5px', padding: '2px 8px' }}
                onClick={() => {
                  setIsTableModalOpen(false);
                  setTab('set');
                  setSettingsSlider('profile');
                  setIsTableEditorOpen(true);
                }}
              >
                ⚙️ Configure tables
              </button>
            </div>

            <div className="table-picker-grid">
              {Array.from({ length: Math.max(1, shop?.tableCount || 6) }, (_, idx) => {
                const tNum = idx + 1;
                const tName = `Table ${tNum}`;
                const isSelected = selectedTable === tName;
                const pendingBill = bills.find(
                  (b) => !b.isDeleted && b.pendingAmount && b.pendingAmount > 0 && b.tableNumber === tName
                );
                const isOccupied = (isSelected && cart.length > 0) || !!pendingBill;

                return (
                  <div
                    key={tName}
                    className={`table-picker-card ${isSelected ? 'is-selected' : ''} ${isOccupied ? 'is-occupied' : ''}`}
                    onClick={() => {
                      setSelectedTable(tName);
                      setIsTableModalOpen(false);
                      showToast(`${tName} selected. Add items to bill`);
                    }}
                  >
                    <div style={{ fontSize: '22px', marginBottom: '6px' }}>🪑</div>
                    <b style={{ display: 'block', fontSize: '14px', color: 'var(--ink)', marginBottom: '4px' }}>
                      {tName}
                    </b>
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '99px',
                        fontWeight: 600,
                        background: isSelected ? 'var(--brand)' : isOccupied ? 'var(--bsoft)' : 'var(--okbg)',
                        color: isSelected ? '#ffffff' : isOccupied ? 'var(--brand)' : 'var(--ok)',
                        marginBottom: '8px',
                      }}
                    >
                      {isSelected ? 'Active' : isOccupied ? 'Occupied' : 'Available'}
                    </span>
                    <button
                      type="button"
                      className={`btn ${isSelected ? 'b' : 'g'} sm`}
                      style={{ width: '100%', fontSize: '11.5px', padding: '5px 0' }}
                    >
                      {isSelected ? 'Selected' : 'Select table'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Collect Pending Due Modal (Partial & Full Settlement) */}
      {collectingCustomerDue && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCollectingCustomerDue(null);
          }}
        >
          <div
            className="closing-modal-card"
            style={{ maxWidth: '480px', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--bsoft)', display: 'grid', placeItems: 'center', color: 'var(--brand)' }}>
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 style={{ margin: 0, font: '700 18px var(--head)', color: 'var(--ink)' }}>
                    Collect Pending Due
                  </h3>
                  <small style={{ color: 'var(--mu)', fontSize: '12px' }}>
                    {collectingCustomerDue.customerName} {collectingCustomerDue.customerPhone ? `· +91 ${collectingCustomerDue.customerPhone}` : ''}
                  </small>
                </div>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setCollectingCustomerDue(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Total Outstanding Card */}
            <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px', border: '1px solid var(--ln)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--mu)', display: 'block' }}>Total Outstanding Due</span>
                <b style={{ fontSize: '22px', color: '#ff5f00', font: '700 22px var(--head)' }}>
                  {fm(collectingCustomerDue.totalDue)}
                </b>
              </div>
              <span style={{ fontSize: '11.5px', padding: '4px 10px', borderRadius: '99px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontWeight: 600 }}>
                {collectingCustomerDue.bills.length} pending {collectingCustomerDue.bills.length === 1 ? 'bill' : 'bills'}
              </span>
            </div>

            {/* Quick Amount Selection Chips */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--ink)' }}>
                  Amount paying now (₹)
                </label>
                <small style={{ color: 'var(--mu)', fontSize: '11px' }}>Supports partial payments</small>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                {[10, 20, 50, 100].filter(amt => amt < collectingCustomerDue.totalDue).map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    className={`btn ${collectPayingNow === String(amt) ? 'b' : 'g'} sm`}
                    onClick={() => setCollectPayingNow(String(amt))}
                    style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '8px' }}
                  >
                    ₹{amt}
                  </button>
                ))}
                <button
                  type="button"
                  className={`btn ${collectPayingNow === String(collectingCustomerDue.totalDue) ? 'b' : 'g'} sm`}
                  onClick={() => setCollectPayingNow(String(collectingCustomerDue.totalDue))}
                  style={{ fontSize: '12px', padding: '5px 14px', borderRadius: '8px', fontWeight: 600 }}
                >
                  Full ({fm(collectingCustomerDue.totalDue)})
                </button>
              </div>

              <input
                type="number"
                min="1"
                max={collectingCustomerDue.totalDue}
                className="in"
                value={collectPayingNow}
                onChange={(e) => setCollectPayingNow(e.target.value)}
                placeholder="Enter amount to pay now..."
                style={{ fontSize: '16px', fontWeight: 600, padding: '10px 14px', width: '100%' }}
              />
            </div>

            {/* Live Calculation Preview */}
            {(() => {
              const paying = parseFloat(collectPayingNow) || 0;
              const remaining = Math.max(0, collectingCustomerDue.totalDue - paying);
              const isFull = remaining === 0;

              return (
                <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '12px 14px', marginBottom: '16px', border: '1px solid var(--ln)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--mu)' }}>Added to Today's Revenue:</span>
                    <b style={{ color: '#059669', fontWeight: 700 }}>+ {fm(paying)}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--mu)' }}>Remaining Due Balance:</span>
                    <b style={{ color: isFull ? 'var(--mu)' : '#ef4444', fontWeight: 700 }}>{fm(remaining)}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px dashed var(--ln)', fontSize: '11.5px' }}>
                    <span style={{ color: 'var(--mu)' }}>Resulting Status:</span>
                    <span style={{ fontWeight: 700, color: isFull ? '#059669' : '#ff5f00' }}>
                      {isFull ? '✓ Fully Cleared & Settled' : `⚠ Partial Payment (${fm(remaining)} still pending)`}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Payment Method Selector */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: '8px' }}>
                Payment Received Via
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  className={`btn ${collectPayMethod === 'Cash' ? 'b' : 'g'}`}
                  onClick={() => setCollectPayMethod('Cash')}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 0', fontSize: '13px' }}
                >
                  <Banknote className="w-4 h-4" />
                  <span>Cash</span>
                </button>
                <button
                  type="button"
                  className={`btn ${collectPayMethod === 'GPay' ? 'b' : 'g'}`}
                  onClick={() => setCollectPayMethod('GPay')}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 0', fontSize: '13px' }}
                >
                  <Smartphone className="w-4 h-4" />
                  <span>UPI / GPay</span>
                </button>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn g"
                onClick={() => setCollectingCustomerDue(null)}
                style={{ flex: 1 }}
                disabled={isCollectingDue}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn b"
                onClick={handleConfirmCollectDue}
                disabled={isCollectingDue || !parseFloat(collectPayingNow) || parseFloat(collectPayingNow) <= 0}
                style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                {isCollectingDue ? (
                  <span>Recording...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Collect {fm(parseFloat(collectPayingNow) || 0)}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade to Pro Plans Modal */}
      {showUpgradeProModal && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowUpgradeProModal(false);
          }}
        >
          <div
            className="closing-modal-card"
            style={{ maxWidth: '780px', padding: '28px', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #ff5f00, #ff8c00)', display: 'grid', placeItems: 'center', color: '#ffffff', boxShadow: '0 4px 14px rgba(255, 95, 0, 0.35)' }}>
                  <Crown className="w-6 h-6" />
                </div>
                <div>
                  <h3 style={{ margin: 0, font: '700 22px var(--head)', color: 'var(--ink)' }}>
                    Upgrade to Counter365 Pro
                  </h3>
                  <small style={{ color: 'var(--mu)', fontSize: '13px' }}>
                    Choose the plan that fits your shop's daily speed and scale
                  </small>
                </div>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setShowUpgradeProModal(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Plans Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              {PRO_PLANS.map((plan) => {
                const isPopular = plan.popular;
                const isBest = plan.bestValue;

                return (
                  <div
                    key={plan.id}
                    style={{
                      background: 'var(--card)',
                      borderRadius: '16px',
                      padding: '20px 18px',
                      border: isPopular ? '2px solid var(--brand)' : '1px solid var(--ln)',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: isPopular ? '0 8px 24px rgba(255, 95, 0, 0.15)' : 'none',
                    }}
                  >
                    {isPopular && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '-11px',
                          right: '16px',
                          background: 'var(--brand)',
                          color: '#ffffff',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: '99px',
                          letterSpacing: '0.03em',
                          textTransform: 'uppercase',
                        }}
                      >
                        Most Popular
                      </span>
                    )}
                    {isBest && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '-11px',
                          right: '16px',
                          background: '#059669',
                          color: '#ffffff',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: '99px',
                          letterSpacing: '0.03em',
                          textTransform: 'uppercase',
                        }}
                      >
                        Best Value
                      </span>
                    )}

                    <div>
                      <b style={{ fontSize: '17px', color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>
                        {plan.name}
                      </b>
                      <span style={{ fontSize: '12px', color: 'var(--mu)', display: 'block', marginBottom: '14px' }}>
                        {plan.durationLabel}
                      </span>

                      <div style={{ marginBottom: '16px' }}>
                        {plan.originalPrice && (
                          <span style={{ textDecoration: 'line-through', color: 'var(--mu)', fontSize: '13px', marginRight: '6px' }}>
                            {fm(plan.originalPrice)}
                          </span>
                        )}
                        <span style={{ fontSize: '26px', fontWeight: 800, color: 'var(--ink)', font: '800 26px var(--head)' }}>
                          {fm(plan.price)}
                        </span>
                      </div>

                      {/* Feature Bullets */}
                      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: 'var(--ink2)' }}>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Check className="w-4 h-4 text-[#059669] flex-shrink-0" />
                          <span>Unlimited fast bills & tokens</span>
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Check className="w-4 h-4 text-[#059669] flex-shrink-0" />
                          <span>Thermal wireless printer sync</span>
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Check className="w-4 h-4 text-[#059669] flex-shrink-0" />
                          <span>Multi-staff cashier permissions</span>
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Check className="w-4 h-4 text-[#059669] flex-shrink-0" />
                          <span>Customer khata & partial dues</span>
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Check className="w-4 h-4 text-[#059669] flex-shrink-0" />
                          <span>Daily closing & GST exports</span>
                        </li>
                      </ul>
                    </div>

                    <button
                      type="button"
                      className={`btn ${isPopular || isBest ? 'b' : 'g'}`}
                      onClick={() => handleActivateProPlan(plan.id)}
                      style={{ width: '100%', justifyContent: 'center', fontWeight: 700, padding: '10px 0', fontSize: '13px' }}
                    >
                      <span>Choose {plan.name}</span>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Bottom Guarantee */}
            <div style={{ textAlign: 'center', color: 'var(--mu)', fontSize: '12px' }}>
              <span>🔒 100% Secure Checkout via UPI, Debit Card, Credit Card & Net Banking. Instant Activation.</span>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingCustomer(null);
          }}
        >
          <div
            className="closing-modal-card"
            style={{ maxWidth: '440px', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--bsoft)', display: 'grid', placeItems: 'center', color: 'var(--brand)' }}>
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 style={{ margin: 0, font: '700 18px var(--head)', color: 'var(--ink)' }}>
                    Edit Customer Details
                  </h3>
                  <small style={{ color: 'var(--mu)', fontSize: '12px' }}>
                    Update customer name, phone, or active status
                  </small>
                </div>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setEditingCustomer(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div>
                <label className="lbl" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>
                  Customer Name *
                </label>
                <input
                  className="search"
                  style={{ width: '100%', margin: 0, padding: '10px 14px' }}
                  value={editCustName}
                  onChange={(e) => setEditCustName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                />
              </div>

              <div>
                <label className="lbl" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>
                  Mobile Number * (10 Digits)
                </label>
                <input
                  type="tel"
                  className="search"
                  maxLength={10}
                  style={{ width: '100%', margin: 0, padding: '10px 14px' }}
                  value={editCustPhone}
                  onChange={(e) => setEditCustPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="e.g. 9876543210"
                />
              </div>

              <div>
                <label className="lbl" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>
                  Notes / Address (Optional)
                </label>
                <input
                  className="search"
                  style={{ width: '100%', margin: 0, padding: '10px 14px' }}
                  value={editCustNotes}
                  onChange={(e) => setEditCustNotes(e.target.value)}
                  placeholder="e.g. Regular morning customer"
                />
              </div>

              {/* Active / Inactive Status Toggle */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--card)', borderRadius: '10px', border: '1px solid var(--ln)' }}>
                <div>
                  <b style={{ display: 'block', fontSize: '13px', color: 'var(--ink)' }}>Customer Status</b>
                  <small style={{ color: editCustIsActive ? '#059669' : '#ef4444', fontWeight: 600, fontSize: '12px' }}>
                    {editCustIsActive ? 'Active Customer' : 'Inactive (Archived)'}
                  </small>
                </div>
                <button
                  type="button"
                  className={`sw ${editCustIsActive ? 'on' : ''}`}
                  onClick={() => setEditCustIsActive((v) => !v)}
                  role="switch"
                  aria-checked={editCustIsActive}
                  aria-label="Toggle active status"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn g"
                onClick={() => setEditingCustomer(null)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn b"
                onClick={handleSaveEditedCustomer}
                style={{ flex: 1 }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Toast */}
      <div className={`toast ${toastMsg ? 'show' : ''}`} role="status">
        {toastMsg}
      </div>
    </div>
  );
};
