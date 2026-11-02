import React from 'react';
import { Store, User, LogOut, Clock, Globe, Shield, Sparkles } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

interface AppHeaderProps {
  onOpenDayClosing?: () => void;
  onOpenSubscriptionModal?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  onOpenDayClosing,
  onOpenSubscriptionModal,
}) => {
  const { shop, subscriptionStatus } = useShop();
  const { profile, currentRole, logout } = useAuth();
  const { language, setLanguage } = useLanguage();

  return (
    <header className="h-16 px-4 sm:px-6 bg-white border-b border-[#EBE7E1] flex items-center justify-between shrink-0 z-20">
      {/* Left: Shop Brand Info */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#FFF0E6] border border-[#FED7AA] flex items-center justify-center text-[#FF5F00] font-bold shadow-xs">
          <Store className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading font-bold text-base text-[#111111] leading-tight line-clamp-1">
              {shop?.name || 'Counter 365 POS'}
            </h1>
            {shop?.shopType && (
              <span className="hidden md:inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F3F0EB] text-[#76716B]">
                {shop.shopType}
              </span>
            )}
          </div>
          <p className="text-xs text-[#76716B]">
            {shop?.city ? `${shop.city} · ` : ''}
            Role: <span className="font-bold text-[#111111]">{currentRole}</span>
          </p>
        </div>
      </div>

      {/* Right: Actions, Language, Subscription, Day Closing */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Subscription Badge */}
        {subscriptionStatus && (
          <button
            onClick={onOpenSubscriptionModal}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
              subscriptionStatus.isPaidActive
                ? 'bg-green-50 text-green-700 border-green-200'
                : subscriptionStatus.billLimitReached
                ? 'bg-red-50 text-red-700 border-red-200 animate-pulse'
                : 'bg-orange-50 text-[#FF5F00] border-[#FED7AA]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {subscriptionStatus.isPaidActive
                ? 'PRO ACTIVE'
                : `${subscriptionStatus.billsRemaining} Bills Left`}
            </span>
          </button>
        )}

        {/* Day Closing Button */}
        {onOpenDayClosing && (
          <button
            onClick={onOpenDayClosing}
            title="Daily Closing Business Report"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#F3F0EB] hover:bg-[#EBE7E1] text-[#111111] transition"
          >
            <Clock className="w-3.5 h-3.5 text-[#FF5F00]" />
            <span className="hidden md:inline">Day Closing</span>
          </button>
        )}

        {/* Language Switcher */}
        <button
          onClick={() => setLanguage(language === 'en' ? 'ta' : 'en')}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-[#EBE7E1] text-xs font-bold text-[#111111] hover:bg-[#FAF8F5] transition"
          title="Switch Language (English / தமிழ்)"
        >
          <Globe className="w-3.5 h-3.5 text-[#76716B]" />
          <span>{language === 'en' ? 'தமிழ்' : 'English'}</span>
        </button>

        {/* Logout */}
        <button
          onClick={logout}
          title="Log out of this counter"
          className="p-2 rounded-xl text-[#76716B] hover:text-red-600 hover:bg-red-50 transition"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
