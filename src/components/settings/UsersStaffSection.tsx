import React, { useState, useEffect, useRef } from 'react';
import {
  staffService,
  ShopMember,
  UserRole,
  PermissionKey,
  ROLE_DEFAULT_PERMISSIONS,
  MODULE_PERMISSIONS,
} from '../../services/staffService';
import { useAuth } from '../../context/AuthContext';
import { useShop } from '../../context/ShopContext';
import { storage } from '../../lib/storage';
import { LOCAL_SHOP_KEY } from '../../services/authService';
import { Shop } from '../../types/models';
import { Crown, Users, Plus, Shield, Check, X, Edit, Trash2 } from 'lucide-react';

export interface UsersStaffSectionProps {
  shopId?: string;
  shop?: Shop | null;
  members?: ShopMember[];
  onMembersChange?: (members: ShopMember[]) => void;
  onCountChange?: (count: number) => void;
}

export const UsersStaffSection: React.FC<UsersStaffSectionProps> = ({
  shopId: propShopId,
  shop: propShop,
  members: propMembers,
  onMembersChange,
  onCountChange,
}) => {
  const { currentShop, currentMember, currentRole, profile } = useAuth();
  const { shop: contextShop } = useShop();

  const activeShop = propShop || contextShop || currentShop;
  const activeShopId = propShopId || activeShop?.id || '';

  const isOwner = currentRole === 'Owner' || currentMember?.role === 'Owner';

  const [members, setMembers] = useState<ShopMember[]>(propMembers || []);
  const [loading, setLoading] = useState<boolean>(!propMembers || propMembers.length === 0);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Add Member Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('Supervisor');
  const [newOverrides, setNewOverrides] = useState<Partial<Record<PermissionKey, boolean>>>({
    ...ROLE_DEFAULT_PERMISSIONS.Supervisor,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Permissions Modal State
  const [selectedMember, setSelectedMember] = useState<ShopMember | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('Supervisor');
  const [editOverrides, setEditOverrides] = useState<Partial<Record<PermissionKey, boolean>>>({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Stable callback refs
  const onMembersChangeRef = useRef(onMembersChange);
  onMembersChangeRef.current = onMembersChange;
  const onCountChangeRef = useRef(onCountChange);
  onCountChangeRef.current = onCountChange;

  // Sync with propMembers if parent updates them
  useEffect(() => {
    if (propMembers && propMembers.length >= 0) {
      setMembers(propMembers);
      setLoading(false);
      onCountChangeRef.current?.(propMembers.length);
    }
  }, [propMembers]);

  // Initial and refresh load
  const reloadStaff = async () => {
    let targetShopId = activeShopId;
    if (!targetShopId) {
      try {
        const stored = await storage.getObject<Shop | null>(LOCAL_SHOP_KEY, null);
        targetShopId = stored?.id || '';
      } catch {}
    }
    if (!targetShopId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      const data = await staffService.getShopMembers(targetShopId);
      setMembers(data);
      onMembersChangeRef.current?.(data);
      onCountChangeRef.current?.(data.length);
    } catch (err: any) {
      console.warn('reloadStaff error:', err);
      setErrorMsg(err?.message || 'Failed to load staff list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!propMembers || propMembers.length === 0) {
      reloadStaff();
    }
  }, [activeShopId]);

  // Real-time Supabase subscription
  useEffect(() => {
    if (!activeShopId) return;
    const unsubscribe = staffService.subscribeToShopMembers(activeShopId, () => {
      reloadStaff();
    });
    return () => unsubscribe();
  }, [activeShopId]);

  // Handle Add Member
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      alert('Staff member name is required.');
      return;
    }
    const cleanPhone = newPhone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      alert('Please enter a valid 10-digit mobile number.');
      return;
    }

    try {
      setIsSubmitting(true);
      await staffService.addMember(activeShopId, newName.trim(), newRole, cleanPhone, newOverrides);
      setIsAddOpen(false);
      setNewName('');
      setNewPhone('');
      setNewRole('Supervisor');
      setNewOverrides({ ...ROLE_DEFAULT_PERMISSIONS.Supervisor });
      await reloadStaff();
    } catch (err: any) {
      alert(err?.message || 'Failed to add staff member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Toggle Active
  const handleToggleActive = async (member: ShopMember) => {
    if (!isOwner || member.role === 'Owner') return;
    const nextState = !member.isActive;
    const confirmMsg = nextState
      ? `Activate staff member ${member.fullName}?`
      : `Deactivate ${member.fullName}? This will immediately end their active sessions and log them out from the web.`;

    if (!confirm(confirmMsg)) return;

    try {
      await staffService.toggleMemberActive(activeShopId, member.id, nextState);
      await reloadStaff();
    } catch (err: any) {
      alert('Failed to update member status.');
    }
  };

  // Handle Delete Member
  const handleDeleteMember = async (member: ShopMember) => {
    if (!isOwner || member.role === 'Owner') return;
    if (!confirm(`Are you sure you want to permanently remove staff member ${member.fullName}?`)) return;
    try {
      await staffService.deleteMember(activeShopId, member.id);
      await reloadStaff();
    } catch (err: any) {
      alert('Failed to delete member.');
    }
  };

  // Open Edit Permissions Modal
  const handleOpenEdit = (m: ShopMember) => {
    setSelectedMember(m);
    setEditRole(m.role || 'Supervisor');
    const safeRole = m.role || 'Supervisor';
    const base = ROLE_DEFAULT_PERMISSIONS[safeRole] || ROLE_DEFAULT_PERMISSIONS.Biller;
    setEditOverrides({
      ...base,
      ...(m.overrides || {}),
    });
  };

  // Save Edit Permissions
  const handleSaveEdit = async () => {
    if (!selectedMember) return;
    try {
      setIsSavingEdit(true);
      if (editRole !== selectedMember.role) {
        await staffService.updateRole(activeShopId, selectedMember.id, editRole);
      }
      for (const p of MODULE_PERMISSIONS) {
        const val = !!editOverrides[p.key];
        await staffService.setPermissionOverride(
          activeShopId,
          selectedMember.id,
          selectedMember.overrides || {},
          p.key,
          val
        );
      }
      setSelectedMember(null);
      await reloadStaff();
    } catch (err: any) {
      alert('Failed to save permissions: ' + err?.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const staffOnly = members.filter((m) => m && m.role !== 'Owner');

  return (
    <div style={{ paddingBottom: '32px' }}>
      {/* 1. Primary Owner Account Card (Master ID Owner) */}
      <div className="profile-header-card" style={{ marginBottom: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #FF5F00 0%, #FF8A00 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(255, 95, 0, 0.25)',
            }}
          >
            <Crown className="w-6 h-6 text-white" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <b style={{ fontSize: '18px', color: 'var(--ink)' }}>
                {activeShop?.ownerName || profile?.fullName || activeShop?.name || 'Shop Owner'}
              </b>
              <span
                style={{
                  background: 'var(--bsoft)',
                  color: 'var(--brand)',
                  padding: '2px 8px',
                  borderRadius: '99px',
                  fontSize: '11px',
                  fontWeight: 700,
                }}
              >
                Master ID · Owner
              </span>
              <span
                style={{
                  background: 'var(--okbg)',
                  color: 'var(--ok)',
                  padding: '2px 8px',
                  borderRadius: '99px',
                  fontSize: '11px',
                  fontWeight: 600,
                }}
              >
                Active
              </span>
            </div>
            <small style={{ color: 'var(--mu)', fontSize: '12.5px', display: 'block', marginTop: '3px' }}>
              +91 {activeShop?.phone || profile?.phone || '98765 43210'} · Full Administrator access across all 8 modules & hardware
            </small>
          </div>
        </div>
      </div>

      {/* 2. Staff Accounts Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <div>
          <h3 style={{ margin: 0, font: '700 20px var(--head)', color: 'var(--ink)' }}>
            Staff Accounts & Cashiers
          </h3>
          <small style={{ color: 'var(--mu)', fontSize: '13px' }}>
            Manage supervisors, billers, and module-specific access permissions
          </small>
        </div>

        {isOwner && (
          <button
            type="button"
            className="btn b sm"
            onClick={() => {
              setNewName('');
              setNewPhone('');
              setNewRole('Supervisor');
              setNewOverrides({ ...ROLE_DEFAULT_PERMISSIONS.Supervisor });
              setIsAddOpen(true);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              borderRadius: '10px',
            }}
          >
            <Plus className="w-4 h-4" />
            <span>Add user</span>
          </button>
        )}
      </div>

      {errorMsg && (
        <div
          style={{
            padding: '12px 16px',
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            borderRadius: '10px',
            fontSize: '13px',
            marginBottom: '16px',
            border: '1px solid rgba(239, 68, 68, 0.2)',
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* 3. Staff Members List / Grid */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--mu)' }}>
          Loading staff members from cloud database...
        </div>
      ) : staffOnly.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
            <Users className="w-10 h-10 text-[#76716B]" />
          </div>
          <b style={{ fontSize: '16px', color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>
            No additional staff users added yet
          </b>
          <p style={{ color: 'var(--mu)', fontSize: '13px', maxWidth: '400px', margin: '0 auto 16px' }}>
            Add your counter cashiers as <b>Billers</b> or shop managers as <b>Supervisors</b> with custom module permissions.
          </p>
          {isOwner && (
            <button
              type="button"
              className="btn b sm"
              onClick={() => {
                setNewName('');
                setNewPhone('');
                setNewRole('Supervisor');
                setNewOverrides({ ...ROLE_DEFAULT_PERMISSIONS.Supervisor });
                setIsAddOpen(true);
              }}
            >
              + Add first staff member
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '14px',
          }}
        >
          {staffOnly.map((m) => {
            const overrides = m.overrides || {};
            const safeRole: UserRole = m.role || 'Biller';
            const basePerms = ROLE_DEFAULT_PERMISSIONS[safeRole] || ROLE_DEFAULT_PERMISSIONS.Biller;
            const allowedCount = MODULE_PERMISSIONS.filter((p) =>
              overrides[p.key] !== undefined ? overrides[p.key] : basePerms[p.key]
            ).length;

            return (
              <div key={m.id} className="card" style={{ marginBottom: 0, padding: '18px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background:
                          m.role === 'Supervisor' ? 'rgba(59, 130, 246, 0.2)' : 'var(--bsoft)',
                        color: m.role === 'Supervisor' ? '#60a5fa' : 'var(--ink2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '16px',
                      }}
                    >
                      {(m.fullName || 'S')[0]?.toUpperCase() || 'S'}
                    </div>
                    <div>
                      <b style={{ fontSize: '15px', color: 'var(--ink)', display: 'block' }}>
                        {m.fullName || 'Staff Member'}
                      </b>
                      <small style={{ color: 'var(--mu)', fontSize: '12px' }}>
                        +91 {m.phone || 'N/A'}
                      </small>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '99px',
                        background:
                          m.role === 'Supervisor' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bsoft)',
                        color: m.role === 'Supervisor' ? '#60a5fa' : 'var(--ink2)',
                        border: '1px solid var(--ln)',
                      }}
                    >
                      {m.role || 'Biller'}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '99px',
                        background: m.isActive
                          ? 'rgba(34, 197, 94, 0.15)'
                          : 'rgba(239, 68, 68, 0.15)',
                        color: m.isActive ? '#16a34a' : '#ef4444',
                        border: '1px solid var(--ln)',
                      }}
                    >
                      {m.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    background: 'var(--card)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    marginBottom: '14px',
                    border: '1px solid var(--ln)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ color: 'var(--mu)' }}>Permissions:</span>
                  <b style={{ color: 'var(--ink)' }}>{allowedCount} of 8 modules allowed</b>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {isOwner && (
                    <button
                      type="button"
                      className="btn g sm"
                      onClick={() => handleOpenEdit(m)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        padding: '5px 10px',
                      }}
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  )}

                  {isOwner && (
                    <button
                      type="button"
                      className="btn g sm"
                      onClick={() => handleToggleActive(m)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        padding: '5px 10px',
                        color: m.isActive ? '#ea580c' : '#16a34a',
                      }}
                    >
                      <span>{m.isActive ? 'Deactivate' : 'Activate'}</span>
                    </button>
                  )}

                  {isOwner && (
                    <button
                      type="button"
                      className="btn g sm"
                      onClick={() => handleDeleteMember(m)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: '#ef4444',
                        fontSize: '12px',
                        padding: '5px 8px',
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Add Staff Member */}
      {isAddOpen && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddOpen(false);
          }}
        >
          <div
            className="closing-modal-card"
            style={{ maxWidth: '480px', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <h4 style={{ margin: 0, font: '700 18px var(--head)', color: 'var(--ink)' }}>
                Add Staff Member
              </h4>
              <button
                type="button"
                className="btn g sm"
                onClick={() => setIsAddOpen(false)}
                style={{ padding: '4px 8px', fontSize: '13px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMember}>
              <div style={{ marginBottom: '14px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    color: 'var(--ink)',
                    marginBottom: '5px',
                  }}
                >
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--ln)',
                    background: 'var(--card)',
                    color: 'var(--ink)',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    color: 'var(--ink)',
                    marginBottom: '5px',
                  }}
                >
                  Mobile Number (Used for Staff Login)
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span
                    style={{
                      padding: '9px 12px',
                      background: 'var(--card)',
                      border: '1px solid var(--ln)',
                      borderRadius: '10px',
                      color: 'var(--mu)',
                      fontSize: '14px',
                      fontWeight: 600,
                    }}
                  >
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="9876543210"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    style={{
                      flex: 1,
                      padding: '9px 12px',
                      borderRadius: '10px',
                      border: '1px solid var(--ln)',
                      background: 'var(--card)',
                      color: 'var(--ink)',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    color: 'var(--ink)',
                    marginBottom: '8px',
                  }}
                >
                  Staff Role
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setNewRole('Supervisor');
                      setNewOverrides({ ...ROLE_DEFAULT_PERMISSIONS.Supervisor });
                    }}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: `2px solid ${newRole === 'Supervisor' ? 'var(--brand)' : 'var(--ln)'}`,
                      background: newRole === 'Supervisor' ? 'var(--bsoft)' : 'var(--card)',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <b style={{ display: 'block', fontSize: '13.5px', color: 'var(--ink)' }}>
                      Supervisor
                    </b>
                    <small style={{ color: 'var(--mu)', fontSize: '11px' }}>
                      Can bill, view reports, manage menu & expenses
                    </small>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewRole('Biller');
                      setNewOverrides({ ...ROLE_DEFAULT_PERMISSIONS.Biller });
                    }}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: `2px solid ${newRole === 'Biller' ? 'var(--brand)' : 'var(--ln)'}`,
                      background: newRole === 'Biller' ? 'var(--bsoft)' : 'var(--card)',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <b style={{ display: 'block', fontSize: '13.5px', color: 'var(--ink)' }}>
                      Biller
                    </b>
                    <small style={{ color: 'var(--mu)', fontSize: '11px' }}>
                      Only Fast Billing Counter access
                    </small>
                  </button>
                </div>
              </div>

              {/* Module Permission Toggles */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>
                    Permissions ({MODULE_PERMISSIONS.filter((p) => !!newOverrides[p.key]).length} of 8 enabled)
                  </label>
                  <small style={{ color: 'var(--mu)', fontSize: '11.5px', display: 'block' }}>
                    Fine-tune specific access for this user
                  </small>
                </div>

                <div className="perm-toggle-grid">
                  {MODULE_PERMISSIONS.map((p) => {
                    const isChecked = !!newOverrides[p.key];
                    return (
                      <div key={p.key} className="perm-toggle-item">
                        <div style={{ flex: 1, paddingRight: '8px' }}>
                          <b style={{ display: 'block', fontSize: '13px', color: 'var(--ink)' }}>
                            {p.label}
                          </b>
                          <small style={{ color: 'var(--mu)', fontSize: '11px', display: 'block' }}>
                            {p.desc}
                          </small>
                        </div>
                        <button
                          type="button"
                          className={`sw ${isChecked ? 'on' : ''}`}
                          onClick={() => {
                            setNewOverrides((prev) => ({
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

              {/* Actions */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn g"
                  onClick={() => setIsAddOpen(false)}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn b"
                  disabled={isSubmitting}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  {isSubmitting ? 'Saving...' : 'Add Staff User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Permissions */}
      {selectedMember && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedMember(null);
          }}
        >
          <div
            className="closing-modal-card"
            style={{ maxWidth: '480px', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <div>
                <h4 style={{ margin: 0, font: '700 18px var(--head)', color: 'var(--ink)' }}>
                  Edit Staff Permissions
                </h4>
                <small style={{ color: 'var(--mu)', fontSize: '12.5px' }}>
                  {selectedMember.fullName} (+91 {selectedMember.phone})
                </small>
              </div>
              <button
                type="button"
                className="btn g sm"
                onClick={() => setSelectedMember(null)}
                style={{ padding: '4px 8px', fontSize: '13px' }}
              >
                ✕
              </button>
            </div>

            {/* Role Selector */}
            <div style={{ marginBottom: '18px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: 'var(--ink)',
                  marginBottom: '8px',
                }}
              >
                Change Role
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditRole('Supervisor')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: `2px solid ${editRole === 'Supervisor' ? 'var(--brand)' : 'var(--ln)'}`,
                    background: editRole === 'Supervisor' ? 'var(--bsoft)' : 'var(--card)',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <b style={{ display: 'block', fontSize: '13px', color: 'var(--ink)' }}>
                    Supervisor
                  </b>
                  <small style={{ color: 'var(--mu)', fontSize: '11px' }}>Manager access</small>
                </button>

                <button
                  type="button"
                  onClick={() => setEditRole('Biller')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: `2px solid ${editRole === 'Biller' ? 'var(--brand)' : 'var(--ln)'}`,
                    background: editRole === 'Biller' ? 'var(--bsoft)' : 'var(--card)',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <b style={{ display: 'block', fontSize: '13px', color: 'var(--ink)' }}>
                    Biller
                  </b>
                  <small style={{ color: 'var(--mu)', fontSize: '11px' }}>Cashier access</small>
                </button>
              </div>
            </div>

            {/* 8 Module Switches */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>
                  Module Permissions ({MODULE_PERMISSIONS.filter((p) => !!editOverrides[p.key]).length} of 8 enabled)
                </label>
                <small style={{ color: 'var(--mu)', fontSize: '11.5px', display: 'block' }}>
                  Changes take effect immediately on staff device upon save
                </small>
              </div>

              <div className="perm-toggle-grid">
                {MODULE_PERMISSIONS.map((p) => {
                  const isChecked = !!editOverrides[p.key];
                  return (
                    <div key={p.key} className="perm-toggle-item">
                      <div style={{ flex: 1, paddingRight: '8px' }}>
                        <b style={{ display: 'block', fontSize: '13px', color: 'var(--ink)' }}>
                          {p.label}
                        </b>
                        <small style={{ color: 'var(--mu)', fontSize: '11px', display: 'block' }}>
                          {p.desc}
                        </small>
                      </div>
                      <button
                        type="button"
                        className={`sw ${isChecked ? 'on' : ''}`}
                        onClick={() => {
                          setEditOverrides((prev) => ({
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

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn g"
                onClick={() => setSelectedMember(null)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn b"
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                {isSavingEdit ? 'Saving...' : 'Save Permissions'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
