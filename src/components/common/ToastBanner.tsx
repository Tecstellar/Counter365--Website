import React from 'react';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';

interface ToastBannerProps {
  message: string | null;
  type?: 'success' | 'warning' | 'info';
}

export const ToastBanner: React.FC<ToastBannerProps> = ({ message, type = 'success' }) => {
  if (!message) return null;

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 animate-bounce duration-300">
      <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-full shadow-lg bg-[#111111] text-white text-sm font-medium border border-[#333333]">
        {type === 'success' && <CheckCircle2 className="w-4 h-4 text-[#FF5F00]" />}
        {type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
        {type === 'info' && <Info className="w-4 h-4 text-blue-400" />}
        <span>{message}</span>
      </div>
    </div>
  );
};
