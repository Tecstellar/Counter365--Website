import React, { createContext, useContext, useState, useEffect } from 'react';
import { storage } from '../lib/storage';

type Language = 'en' | 'ta';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const TRANSLATIONS: Record<Language, Record<string, string>> = {
  en: {
    dashboard: 'Dashboard',
    pos_billing: 'Billing POS',
    bills: 'Bills',
    pending_due: 'Khata Due',
    menu: 'Menu Items',
    expenses: 'Expenses',
    contacts: 'Customers',
    reports: 'Reports',
    settings: 'Settings',
    cart: 'Order Cart',
    total: 'Total',
    subtotal: 'Subtotal',
    discount: 'Discount',
    gst: 'GST',
    cash: 'Cash',
    gpay: 'GPay',
    pending: 'Pending',
    save_bill: 'Save & Print',
    clear_cart: 'Clear Cart',
    search_items: 'Search dishes & items...',
    logout: 'Logout',
  },
  ta: {
    dashboard: 'முகப்பு',
    pos_billing: 'பில்லிங்',
    bills: 'பில்கள்',
    pending_due: 'நிலுவை கடன்',
    menu: 'உணவு பட்டியல்',
    expenses: 'செலவுகள்',
    contacts: 'வாடிக்கையாளர்கள்',
    reports: 'அறிக்கைகள்',
    settings: 'அமைப்புகள்',
    cart: 'கூடை',
    total: 'மொத்தம்',
    subtotal: 'கூட்டுத்தொகை',
    discount: 'தள்ளுபடி',
    gst: 'ஜிஎஸ்டி',
    cash: 'ரொக்கம்',
    gpay: 'ஜிபே',
    pending: 'நிலுவை',
    save_bill: 'பில் சேமி',
    clear_cart: 'அழி',
    search_items: 'உணவுப் பொருட்களைத் தேடுங்கள்...',
    logout: 'வெளியேறு',
  },
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string) => key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    storage.getItem('@counterpro/app_language').then(lang => {
      if (lang === 'en' || lang === 'ta') {
        setLanguageState(lang);
      }
    });
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    storage.setItem('@counterpro/app_language', lang);
  };

  const t = (key: string): string => {
    return TRANSLATIONS[language]?.[key] || TRANSLATIONS['en']?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
