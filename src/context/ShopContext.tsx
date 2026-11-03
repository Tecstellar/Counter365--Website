import React, { createContext, useContext, useState, useEffect } from 'react';
import { Shop, SubscriptionRecord, SubscriptionStatusInfo, ShopType } from '../types/models';
import { storage } from '../lib/storage';
import { LOCAL_SHOP_KEY } from '../services/authService';
import { shopService } from '../services/shopService';
import { subscriptionService } from '../services/subscriptionService';
import { billingService } from '../services/billingService';
import { useAuth } from './AuthContext';

interface ShopContextType {
  shop: Shop | null;
  subscription: SubscriptionRecord | null;
  subscriptionStatus: SubscriptionStatusInfo | null;
  isLoading: boolean;
  updateShop: (updated: Partial<Shop>) => Promise<Shop>;
  uploadLogo: (file: File | Blob) => Promise<string>;
  registerNewShop: (params: {
    name: string;
    shopType: ShopType;
    phone: string;
    address: string;
    city: string;
    pincode: string;
    ownerName?: string;
    ownerUserId?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
    hasLogo?: boolean;
    logoUrl?: string;
    gstEnabled?: boolean;
    gstRate?: number;
    gstNumber?: string;
    tableManagementEnabled?: boolean;
    tableCount?: number;
    invoicePrefix?: string;
  }) => Promise<Shop>;
  refreshSubscription: () => Promise<void>;
  clearShop: () => Promise<void>;
}

const ShopContext = createContext<ShopContextType>({
  shop: null,
  subscription: null,
  subscriptionStatus: null,
  isLoading: true,
  updateShop: async () => ({} as any),
  uploadLogo: async () => '',
  registerNewShop: async () => ({} as any),
  refreshSubscription: async () => {},
  clearShop: async () => {},
});

export const ShopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatusInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSubscription = async () => {
    if (!shop?.id) return;
    try {
      const totalCreated = await billingService.getTotalBillsCreated(shop.id);
      const { subscription: sub, statusInfo } = await subscriptionService.getShopSubscription(
        shop.id,
        subscription,
        totalCreated
      );
      setSubscription(sub);
      setSubscriptionStatus(statusInfo);
    } catch (err) {
      console.warn('refreshSubscription notice:', err);
    }
  };

  useEffect(() => {
    let unsubscribeRealtime: (() => void) | null = null;

    async function loadShop() {
      try {
        const storedShop = await storage.getObject<Shop | null>(LOCAL_SHOP_KEY, null);
        if (storedShop) {
          setShop(storedShop);

          // 1. Fetch fresh authoritative shop data from Supabase to sync with mobile
          shopService.getShop(storedShop.id).then((remoteShop) => {
            if (remoteShop) {
              setShop(remoteShop);
            }
          });

          // 2. Real-time subscription to postgres changes for live 100% sync
          unsubscribeRealtime = shopService.subscribeToShopChanges(storedShop.id, (fresh) => {
            setShop(fresh);
          });

          const totalCreated = await billingService.getTotalBillsCreated(storedShop.id);
          const { subscription: sub, statusInfo } = await subscriptionService.getShopSubscription(
            storedShop.id,
            null,
            totalCreated
          );
          setSubscription(sub);
          setSubscriptionStatus(statusInfo);
        }
      } catch (err) {
        console.warn('loadShop notice:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadShop();

    return () => {
      if (unsubscribeRealtime) {
        unsubscribeRealtime();
      }
    };
  }, [profile?.id]);

  const uploadLogo = async (file: File | Blob): Promise<string> => {
    if (!shop) throw new Error('No active shop found');
    const publicUrl = await shopService.uploadShopLogo(shop.id, file);
    await updateShop({ logoUrl: publicUrl });
    return publicUrl;
  };

  const updateShop = async (updated: Partial<Shop>): Promise<Shop> => {
    if (!shop) throw new Error('No active shop found to update');
    const merged: Shop = { ...shop, ...updated };
    const saved = await shopService.updateShop(merged);
    setShop(saved);
    return saved;
  };

  const registerNewShop = async (params: {
    name: string;
    shopType: ShopType;
    phone: string;
    address: string;
    city: string;
    pincode: string;
    ownerName?: string;
    ownerUserId?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
    hasLogo?: boolean;
    logoUrl?: string;
    gstEnabled?: boolean;
    gstRate?: number;
    gstNumber?: string;
    tableManagementEnabled?: boolean;
    tableCount?: number;
    invoicePrefix?: string;
  }): Promise<Shop> => {
    const ownerId = params.ownerUserId || profile?.id;
    const { shop: newShop } = await shopService.registerShop({
      ...params,
      ownerName: params.ownerName || profile?.fullName || 'Shop Owner',
      ownerId: ownerId || undefined,
    });
    setShop(newShop);
    await refreshSubscription();
    return newShop;
  };

  const clearShop = async () => {
    await storage.removeItem(LOCAL_SHOP_KEY);
    setShop(null);
    setSubscription(null);
    setSubscriptionStatus(null);
  };

  return (
    <ShopContext.Provider
      value={{
        shop,
        subscription,
        subscriptionStatus,
        isLoading,
        updateShop,
        uploadLogo,
        registerNewShop,
        refreshSubscription,
        clearShop,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = () => useContext(ShopContext);
