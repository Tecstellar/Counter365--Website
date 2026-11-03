import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, ShopMember, UserRole, PermissionKey, Shop } from '../types/models';
import { authService, LOCAL_PROFILE_KEY, LOCAL_MEMBER_KEY, LOCAL_SHOP_KEY, VerifyAuthResult } from '../services/authService';
import { SendOtpResult } from '../services/twoFactorService';
import { storage } from '../lib/storage';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  profile: UserProfile | null;
  member: ShopMember | null;
  currentMember: ShopMember | null;
  currentShop: Shop | null;
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
  currentMember: null,
  currentShop: null,
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
  const [currentShop, setCurrentShop] = useState<Shop | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>('Owner');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      try {
        const session = await authService.getStoredSession();
        if (session.profile) {
          setProfile(session.profile);
        }
        if (session.shop) {
          setCurrentShop(session.shop);
        }

        if (session.member) {
          // Verify with Supabase if the member is still active
          try {
            const { data: dbMember } = await (supabase.from('shop_members') as any)
              .select('*, profile:profiles!shop_members_user_id_fkey(id, full_name, phone)')
              .eq('id', session.member.id)
              .maybeSingle();

            if (dbMember) {
              if (dbMember.is_active === false) {
                // Auto-logout deactivated staff
                await authService.clearSession();
                setProfile(null);
                setMember(null);
                setCurrentRole('Owner');
                setIsLoading(false);
                return;
              }

              // Load active overrides
              let liveOverrides = dbMember.permissions_override || {};
              try {
                const { data: upoData } = await (supabase.from('user_permission_overrides') as any)
                  .select('permission_key, granted')
                  .eq('member_id', session.member.id);
                if (upoData && Array.isArray(upoData)) {
                  upoData.forEach((u: any) => {
                    liveOverrides[u.permission_key] = !!u.granted;
                  });
                }
              } catch (uErr) {
                console.warn('Load overrides notice:', uErr);
              }

              const freshMember: ShopMember = {
                id: dbMember.id,
                shopId: dbMember.shop_id,
                userId: dbMember.user_id,
                fullName: dbMember.full_name || dbMember.profile?.full_name || session.member.fullName,
                phone: dbMember.phone || dbMember.profile?.phone || session.member.phone,
                role: dbMember.role as UserRole,
                isActive: true,
                overrides: liveOverrides,
              };

              setMember(freshMember);
              setCurrentRole(freshMember.role);
              await storage.setObject(LOCAL_MEMBER_KEY, freshMember);
            } else {
              setMember(session.member);
              setCurrentRole(session.member.role);
            }
          } catch (verifyErr) {
            console.warn('Verify remote member notice:', verifyErr);
            setMember(session.member);
            setCurrentRole(session.member.role);
          }
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

  // Real-time synchronization for staff account deactivation & permission updates
  useEffect(() => {
    if (!member?.id) return;

    const channelName = `auth-member-live-${member.id}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shop_members', filter: `id=eq.${member.id}` },
        async (payload: any) => {
          if (payload.eventType === 'DELETE' || (payload.new && payload.new.is_active === false)) {
            // Staff account deactivated or removed by owner -> IMMEDIATE AUTO-LOGOUT
            alert('Your staff account has been deactivated by the shop owner. You are being logged out.');
            await authService.clearSession();
            setProfile(null);
            setMember(null);
            setCurrentRole('Owner');
            window.location.reload();
            return;
          }

          if (payload.new) {
            const newRole = (payload.new.role as UserRole) || 'Biller';
            const newOverrides = payload.new.permissions_override || {};

            setMember((prev) => {
              if (!prev) return null;
              const updated: ShopMember = {
                ...prev,
                role: newRole,
                overrides: newOverrides,
                isActive: payload.new.is_active ?? true,
              };
              storage.setObject(LOCAL_MEMBER_KEY, updated);
              return updated;
            });
            setCurrentRole(newRole);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_permission_overrides', filter: `member_id=eq.${member.id}` },
        async () => {
          // Re-fetch permission overrides
          try {
            const { data: upoData } = await (supabase.from('user_permission_overrides') as any)
              .select('permission_key, granted')
              .eq('member_id', member.id);

            if (upoData && Array.isArray(upoData)) {
              const freshOverrides: Record<string, boolean> = {};
              upoData.forEach((u: any) => {
                freshOverrides[u.permission_key] = !!u.granted;
              });

              setMember((prev) => {
                if (!prev) return null;
                const updated: ShopMember = {
                  ...prev,
                  overrides: { ...(prev.overrides || {}), ...freshOverrides },
                };
                storage.setObject(LOCAL_MEMBER_KEY, updated);
                return updated;
              });
            }
          } catch (err) {
            console.warn('Live permission override update notice:', err);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [member?.id]);

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
      if (res.shop) {
        setCurrentShop(res.shop);
      }
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
    setCurrentShop(newShop);
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
    setCurrentShop(null);
    setCurrentRole('Owner');
  };

  return (
    <AuthContext.Provider
      value={{
        profile,
        member,
        currentMember: member,
        currentShop,
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
