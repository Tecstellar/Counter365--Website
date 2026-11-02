import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, ShopMember, UserRole, PermissionKey, Shop } from '../types/models';
import { authService, LOCAL_PROFILE_KEY, LOCAL_MEMBER_KEY, LOCAL_SHOP_KEY, VerifyAuthResult } from '../services/authService';
import { SendOtpResult } from '../services/twoFactorService';
import { storage } from '../lib/storage';

interface AuthContextType {
  profile: UserProfile | null;
  member: ShopMember | null;
  currentRole: UserRole;
  isLoading: boolean;
  can: (permission: PermissionKey) => boolean;
  sendOtp: (phone: string) => Promise<SendOtpResult>;
  verifyOtp: (phone: string, token: string) => Promise<VerifyAuthResult>;
  setSessionDirect: (profile: UserProfile, shop: Shop, member?: ShopMember) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  profile: null,
  member: null,
  currentRole: 'Owner',
  isLoading: true,
  can: () => false,
  sendOtp: async () => ({ success: false }),
  verifyOtp: async () => ({ success: false }),
  setSessionDirect: async () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [member, setMember] = useState<ShopMember | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>('Owner');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      try {
        const session = await authService.getStoredSession();
        if (session.profile) {
          setProfile(session.profile);
        }
        if (session.member) {
          setMember(session.member);
          setCurrentRole(session.member.role);
        } else {
          setCurrentRole('Owner');
        }
      } catch (err) {
        console.warn('Load session notice:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSession();
  }, []);

  const can = (permission: PermissionKey): boolean => {
    return authService.canUserPerform(currentRole, permission, member?.overrides);
  };

  const sendOtp = async (phone: string): Promise<SendOtpResult> => {
    return await authService.sendOtp(phone);
  };

  const verifyOtp = async (phone: string, token: string): Promise<VerifyAuthResult> => {
    const res = await authService.verifyOtp(phone, token);
    if (res.success && res.profile) {
      setProfile(res.profile);
      if (res.member) {
        setMember(res.member);
        setCurrentRole(res.member.role);
      } else {
        setCurrentRole('Owner');
      }
    }
    return res;
  };

  const setSessionDirect = async (newProfile: UserProfile, newShop: Shop, newMember?: ShopMember): Promise<void> => {
    await storage.setObject(LOCAL_PROFILE_KEY, newProfile);
    await storage.setObject(LOCAL_SHOP_KEY, newShop);
    if (newMember) {
      await storage.setObject(LOCAL_MEMBER_KEY, newMember);
      setMember(newMember);
      setCurrentRole(newMember.role);
    } else {
      setCurrentRole('Owner');
    }
    setProfile(newProfile);
  };

  const logout = async () => {
    await authService.clearSession();
    setProfile(null);
    setMember(null);
    setCurrentRole('Owner');
  };

  return (
    <AuthContext.Provider
      value={{
        profile,
        member,
        currentRole,
        isLoading,
        can,
        sendOtp,
        verifyOtp,
        setSessionDirect,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
