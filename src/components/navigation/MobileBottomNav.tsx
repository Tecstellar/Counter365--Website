import React, { useState } from 'react';
import {
  LayoutDashboard,
  Receipt,
  Clock,
  MoreHorizontal,
  UtensilsCrossed,
  Wallet,
  Users,
  BarChart3,
  Settings,
  X,
  Plus
} from 'lucide-react';
import { AppRoute } from '../../types/navigation';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

interface MobileBottomNavProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ currentRoute, onNavigate }) => {
  const { can, currentRole } = useAuth();
  const { t } = useLanguage();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const primaryTabs: { route: AppRoute; label: string; icon: React.ComponentType<any> }[] = [
    { route: 'home', label: t('dashboard'), icon: LayoutDashboard },
    { route: 'bills', label: t('bills'), icon: Receipt },
    { route: 'pending', label: t('pending_due'), icon: Clock },
  ];

  const moreItems: { route: AppRoute; label: string; icon: React.ComponentType<any>; perm: string }[] = [
    { route: 'menu', label: t('menu'), icon: UtensilsCrossed, perm: 'menu' },
    { route: 'expenses', label: t('expenses'), icon: Wallet, perm: 'exp' },
    { route: 'contacts', label: t('contacts'), icon: Users, perm: 'bill' },
    { route: 'reports', label: t('reports'), icon: BarChart3, perm: 'report' },
    { route: 'account', label: t('settings'), icon: Settings, perm: 'total' },
  ];

  return (
    <>
      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#EBE7E1] px-3 py-1.5 flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
        {/* Home */}
        <button
          onClick={() => {
            setIsDrawerOpen(false);
            onNavigate('home');
          }}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition ${
            currentRoute === 'home' ? 'text-[#FF5F00]' : 'text-[#76716B] hover:text-[#111111]'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-bold">Home</span>
        </button>

        {/* Bills */}
        <button
          onClick={() => {
            setIsDrawerOpen(false);
            onNavigate('bills');
          }}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition ${
            currentRoute === 'bills' ? 'text-[#FF5F00]' : 'text-[#76716B] hover:text-[#111111]'
          }`}
        >
          <Receipt className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-bold">Bills</span>
        </button>

        {/* Floating Quick POS Billing Action Button */}
        <div className="flex-1 flex justify-center -mt-6">
          <button
            onClick={() => {
              setIsDrawerOpen(false);
              onNavigate('sales');
            }}
            aria-label="New Bill"
            className="w-14 h-14 rounded-full bg-linear-to-tr from-[#FF5F00] to-[#FF8A3D] text-white flex flex-col items-center justify-center shadow-[0_8px_20px_rgba(255,95,0,0.4)] active:scale-95 transition-transform border-4 border-white"
          >
            <Plus className="w-6 h-6 stroke-[3]" />
            <span className="text-[9px] font-extrabold -mt-1 tracking-wider uppercase">Bill</span>
          </button>
        </div>

        {/* Khata / Pending */}
        <button
          onClick={() => {
            setIsDrawerOpen(false);
            onNavigate('pending');
          }}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition ${
            currentRoute === 'pending' ? 'text-[#FF5F00]' : 'text-[#76716B] hover:text-[#111111]'
          }`}
        >
          <Clock className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-bold">Khata</span>
        </button>

        {/* More Drawer Toggle */}
        <button
          onClick={() => setIsDrawerOpen(!isDrawerOpen)}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition ${
            isDrawerOpen || moreItems.some((m) => m.route === currentRoute)
              ? 'text-[#FF5F00]'
              : 'text-[#76716B] hover:text-[#111111]'
          }`}
        >
          <MoreHorizontal className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-bold">More</span>
        </button>
      </nav>

      {/* More Options Mobile Drawer Overlay */}
      {isDrawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex flex-col justify-end"
          onClick={() => setIsDrawerOpen(false)}
        >
          <div
            className="bg-white rounded-t-3xl p-6 shadow-2xl max-h-[70vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#EBE7E1] mb-4">
              <div>
                <h3 className="font-heading font-extrabold text-base text-[#111111]">All Modules</h3>
                <p className="text-xs text-[#76716B]">Role: {currentRole}</p>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-[#FAF8F5] text-[#76716B] hover:text-[#111111] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 pb-6">
              {moreItems.map((item) => {
                if (!can(item.perm as any)) return null;
                const Icon = item.icon;
                const isActive = currentRoute === item.route;
                return (
                  <button
                    key={item.route}
                    onClick={() => {
                      onNavigate(item.route);
                      setIsDrawerOpen(false);
                    }}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition ${
                      isActive
                        ? 'bg-[#FFF0E6] border-[#FF5F00] text-[#FF5F00]'
                        : 'bg-[#FAF8F5] border-[#EBE7E1] text-[#111111] hover:border-[#FED7AA]'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isActive ? 'bg-[#FF5F00] text-white' : 'bg-white text-[#76716B]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
