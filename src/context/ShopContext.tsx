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
  setShopDirect: (newShop: Shop | null) => void;
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
  setShopDirect: () => {},
  updateShop: async () => ({} as any),
  uploadLogo: async () => '',
  registerNewShop: async () => ({} as any),
  refreshSubscription: async () => {},
  clearShop: async () => {},
});

export const ShopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, currentShop, setCurrentShop } = useAuth();
  const [shop, setShop] = useState<Shop | null>(() => currentShop);
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatusInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Sync immediately when currentShop from AuthContext changes
  useEffect(() => {
    if (currentShop && currentShop.id && currentShop.id !== shop?.id) {
      setShop(currentShop);
      setIsLoading(false);
    } else if (currentShop === null && profile === null) {
      setShop(null);
    }
  }, [currentShop, profile]);

  const setShopDirect = (newShop: Shop | null) => {
    setShop(newShop);
    setIsLoading(false);
    if (newShop) {
      storage.setObject(LOCAL_SHOP_KEY, newShop);
      if (setCurrentShop) setCurrentShop(newShop);
    } else {
      storage.removeItem(LOCAL_SHOP_KEY);
      if (setCurrentShop) setCurrentShop(null);
    }
  };

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
    async function loadShop() {
      try {
        const storedShop = await storage.getObject<Shop | null>(LOCAL_SHOP_KEY, null);
        if (storedShop) {
          setShop(storedShop);
          if (setCurrentShop) setCurrentShop(storedShop);
        } else if (currentShop) {
          setShop(currentShop);
        }
      } catch (err) {
        console.warn('loadShop notice:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadShop();
  }, [profile?.id]);

  // Real-time synchronization and subscription update when shop.id is active
  useEffect(() => {
    if (!shop?.id) return;
    let isSubscribed = true;

    // 1. Fetch fresh authoritative shop data from Supabase to sync with mobile
    shopService.getShop(shop.id).then((remoteShop) => {
      if (remoteShop && isSubscribed) {
        setShop(remoteShop);
        if (setCurrentShop) setCurrentShop(remoteShop);
      }
    });

    // 2. Fetch subscription status
    billingService.getTotalBillsCreated(shop.id).then((totalCreated) => {
      if (isSubscribed) {
        subscriptionService.getShopSubscription(shop.id, subscription, totalCreated).then(({ subscription: sub, statusInfo }) => {
          if (isSubscribed) {
            setSubscription(sub);
            setSubscriptionStatus(statusInfo);
          }
        });
      }
    });

    // 3. Real-time subscription to postgres changes for live 100% sync
    const unsubscribeRealtime = shopService.subscribeToShopChanges(shop.id, (fresh) => {
      if (isSubscribed) {
        setShop(fresh);
        if (setCurrentShop) setCurrentShop(fresh);
      }
    });

    return () => {
      isSubscribed = false;
      if (unsubscribeRealtime) unsubscribeRealtime();
    };
  }, [shop?.id]);

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
        setShopDirect,
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
