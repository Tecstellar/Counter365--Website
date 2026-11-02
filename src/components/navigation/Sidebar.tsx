import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  Clock,
  UtensilsCrossed,
  Users,
  Wallet,
  BarChart3,
  Settings,
  Shield,
} from 'lucide-react';
import { AppRoute } from '../../types/navigation';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

interface SidebarProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentRoute, onNavigate }) => {
  const { can, currentRole } = useAuth();
  const { t } = useLanguage();

  const navItems = [
    { route: 'home' as AppRoute, label: t('dashboard'), icon: LayoutDashboard, perm: 'total' },
    { route: 'sales' as AppRoute, label: t('pos_billing'), icon: Receipt, perm: 'bill' },
    { route: 'bills' as AppRoute, label: t('bills'), icon: Receipt, perm: 'bill' },
    { route: 'pending' as AppRoute, label: t('pending_due'), icon: Clock, perm: 'pend' },
    { route: 'menu' as AppRoute, label: t('menu'), icon: UtensilsCrossed, perm: 'menu' },
    { route: 'expenses' as AppRoute, label: t('expenses'), icon: Wallet, perm: 'exp' },
    { route: 'contacts' as AppRoute, label: t('contacts'), icon: Users, perm: 'bill' },
    { route: 'reports' as AppRoute, label: t('reports'), icon: BarChart3, perm: 'report' },
    { route: 'account' as AppRoute, label: t('settings'), icon: Settings, perm: 'total' },
  ];

  return (
    <aside className="hidden md:flex w-56 bg-white border-r border-[#EBE7E1] flex-col justify-between shrink-0 h-[calc(100vh-4rem)]">
      {/* Navigation Links */}
      <nav className="p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isAllowed = can(item.perm as any);
          if (!isAllowed) return null;

          const isActive = currentRoute === item.route;
          const Icon = item.icon;

          return (
            <button
              key={item.route}
              onClick={() => onNavigate(item.route)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                isActive
                  ? 'bg-[#FFF0E6] text-[#FF5F00] shadow-xs'
                  : 'text-[#76716B] hover:text-[#111111] hover:bg-[#FAF8F5]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#FF5F00]' : 'text-[#76716B]'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Role Footer */}
      <div className="p-3 border-t border-[#EBE7E1] bg-[#FAF8F5]">
        <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-[#EBE7E1]">
          <Shield className="w-4 h-4 text-[#FF5F00]" />
          <div className="overflow-hidden">
            <span className="text-[10px] uppercase font-bold text-[#76716B] block tracking-wider">
              Counter Mode
            </span>
            <span className="text-xs font-extrabold text-[#111111] truncate block">
              {currentRole} Access
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
