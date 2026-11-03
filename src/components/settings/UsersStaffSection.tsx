import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { Crown, Users } from 'lucide-react';

export const UsersStaffSection: React.FC<{
  shopId?: string;
  onCountChange?: (count: number) => void;
}> = ({ shopId: propShopId, onCountChange }) => {
  const { currentShop, currentMember, currentRole, profile } = useAuth();
  const { shop: contextShop } = useShop();

  const [activeShopId, setActiveShopId] = useState<string>(
    propShopId || contextShop?.id || currentShop?.id || ''
  );
  const isOwner = currentRole === 'Owner' || currentMember?.role === 'Owner';

  const [members, setMembers] = useState<ShopMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

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

  // Stable callback ref to prevent infinite re-render loops
  const onCountChangeRef = useRef(onCountChange);
  onCountChangeRef.current = onCountChange;

  // Resolve shopId if missing
  useEffect(() => {
    async function resolveShopId() {
      if (propShopId) {
        setActiveShopId(propShopId);
        return;
      }
      if (contextShop?.id) {
        setActiveShopId(contextShop.id);
        return;
      }
      if (currentShop?.id) {
        setActiveShopId(currentShop.id);
        return;
      }
      const stored = await storage.getObject<Shop | null>(LOCAL_SHOP_KEY, null);
      if (stored?.id) {
        setActiveShopId(stored.id);
      }
    }
    resolveShopId();
  }, [propShopId, contextShop?.id, currentShop?.id]);

  // Fetch members directly from Supabase
  const loadMembers = useCallback(async () => {
    let targetShopId = activeShopId;
    if (!targetShopId) {
      const stored = await storage.getObject<Shop | null>(LOCAL_SHOP_KEY, null);
      targetShopId = stored?.id || '';
      if (targetShopId) setActiveShopId(targetShopId);
    }
    if (!targetShopId) return;

    try {
      setLoading(true);
      setErrorMsg('');
      const data = await staffService.getShopMembers(targetShopId);
      setMembers(data);
      onCountChangeRef.current?.(data.length);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load staff list.');
    } finally {
      setLoading(false);
    }
  }, [activeShopId]);

  useEffect(() => {
    if (!activeShopId) return;
    loadMembers();

    // Subscribe to live Supabase updates
    const unsubscribe = staffService.subscribeToShopMembers(activeShopId, () => {
      loadMembers();
    });
    return () => unsubscribe();
  }, [loadMembers, activeShopId]);

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
      await staffService.addMember(activeShopId, newName, newRole, cleanPhone, newOverrides);
      setIsAddOpen(false);
      setNewName('');
      setNewPhone('');
      setNewRole('Supervisor');
      setNewOverrides({ ...ROLE_DEFAULT_PERMISSIONS.Supervisor });
      await loadMembers();
    } catch (err: any) {
      alert(err.message || 'Failed to add staff member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (member: ShopMember) => {
    if (!isOwner || member.role === 'Owner') return;
    const nextState = !member.isActive;
    const confirmMsg = nextState
      ? `Activate staff member ${member.fullName}?`
      : `Deactivate ${member.fullName}? This will immediately end their active sessions and log them out from the web.`;

    if (!confirm(confirmMsg)) return;

    try {
      await staffService.toggleMemberActive(activeShopId, member.id, nextState);
      await loadMembers();
    } catch (err: any) {
      alert('Failed to update member status.');
    }
  };

  const handleDeleteMember = async (member: ShopMember) => {
    if (!isOwner || member.role === 'Owner') return;
    if (!confirm(`Are you sure you want to permanently remove staff member ${member.fullName}?`)) return;
    try {
      await staffService.deleteMember(activeShopId, member.id);
      await loadMembers();
    } catch (err: any) {
      alert('Failed to delete member.');
    }
  };

  const handleOpenEdit = (m: ShopMember) => {
    setSelectedMember(m);
    setEditRole(m.role);
    const base = ROLE_DEFAULT_PERMISSIONS[m.role] || ROLE_DEFAULT_PERMISSIONS.Biller;
    setEditOverrides({
      ...base,
      ...(m.overrides || {}),
    });
  };

  const handleSaveEdit = async () => {
    if (!selectedMember) return;
    try {
      setIsSavingEdit(true);
      // Update role if changed
      if (editRole !== selectedMember.role) {
        await staffService.updateRole(activeShopId, selectedMember.id, editRole);
      }
      // Update each permission override
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
      await loadMembers();
    } catch (err: any) {
      alert('Failed to save permissions: ' + err.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const activeShopObj = contextShop || currentShop;
  const staffOnly = members.filter((m) => m.role !== 'Owner');

  return (
    <div>
      {/* 1. Primary Owner Account Card (Master ID Owner) */}
      <div className="profile-header-card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: 'var(--brand)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Crown className="w-6 h-6 text-white" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <b style={{ fontSize: '18px', color: 'var(--ink)' }}>
                {activeShopObj?.ownerName || profile?.fullName || activeShopObj?.name || 'Shop Owner'}
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
            <small style={{ color: 'var(--mu)', fontSize: '12.5px', display: 'block', marginTop: '2px' }}>
              +91 {activeShopObj?.phone || profile?.phone || 'N/A'} · Full access across all modules & settings
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
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              borderRadius: '10px',
            }}
          >
            <span>+</span>
            <span>Add user</span>
          </button>
        )}
      </div>

      {errorMsg && (
        <div
          style={{
            padding: '12px',
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            borderRadius: '10px',
            fontSize: '13px',
            marginBottom: '16px',
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* 3. Staff Members List / Grid */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--mu)' }}>
          Loading staff members from database...
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
            const basePerms = ROLE_DEFAULT_PERMISSIONS[m.role] || ROLE_DEFAULT_PERMISSIONS.Biller;
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
                      {(m.fullName || 'S')[0].toUpperCase()}
                    </div>
                    <div>
                      <b style={{ fontSize: '15px', color: 'var(--ink)', display: 'block' }}>
                        {m.fullName}
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
                      {m.role}
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
                      <span className="icon-edit" style={{ width: '13px', height: '13px' }} />
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
                      <span
                        className="icon-delete"
                        style={{ width: '13px', height: '13px', color: '#ef4444' }}
                      />
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

            <form onSubmit={handleAddMember} className="space-y-4">
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
                  10-Digit Mobile Number
                </label>
                <div style={{ display: 'flex' }}>
                  <span
                    style={{
                      padding: '9px 12px',
                      background: 'var(--bsoft)',
                      color: 'var(--mu)',
                      borderRadius: '10px 0 0 10px',
                      border: '1px solid var(--ln)',
                      borderRight: 'none',
                      fontSize: '13.5px',
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
                    onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, ''))}
                    style={{
                      flex: 1,
                      padding: '9px 12px',
                      borderRadius: '0 10px 10px 0',
                      border: '1px solid var(--ln)',
                      background: 'var(--card)',
                      color: 'var(--ink)',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    color: 'var(--ink)',
                    marginBottom: '5px',
                  }}
                >
                  Operational Role
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setNewRole('Supervisor');
                      setNewOverrides({ ...ROLE_DEFAULT_PERMISSIONS.Supervisor });
                    }}
                    className="btn sm"
                    style={{
                      padding: '8px 12px',
                      fontSize: '13px',
                      fontWeight: 600,
                      borderRadius: '10px',
                      textAlign: 'center',
                      justifyContent: 'center',
                      background:
                        newRole === 'Supervisor' ? 'rgba(59, 130, 246, 0.2)' : 'var(--card)',
                      color: newRole === 'Supervisor' ? '#60a5fa' : 'var(--ink)',
                      border:
                        newRole === 'Supervisor'
                          ? '1.5px solid #3b82f6'
                          : '1px solid var(--ln)',
                    }}
                  >
                    Supervisor
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewRole('Biller');
                      setNewOverrides({ ...ROLE_DEFAULT_PERMISSIONS.Biller });
                    }}
                    className="btn sm"
                    style={{
                      padding: '8px 12px',
                      fontSize: '13px',
                      fontWeight: 600,
                      borderRadius: '10px',
                      textAlign: 'center',
                      justifyContent: 'center',
                      background:
                        newRole === 'Biller' ? 'rgba(16, 185, 129, 0.2)' : 'var(--card)',
                      color: newRole === 'Biller' ? '#10b981' : 'var(--ink)',
                      border:
                        newRole === 'Biller'
                          ? '1.5px solid #10b981'
                          : '1px solid var(--ln)',
                    }}
                  >
                    Biller (Counter)
                  </button>
                </div>
              </div>

              {/* Module Permissions Switches */}
              <div style={{ marginBottom: '20px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                  }}
                >
                  <label
                    style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}
                  >
                    Module Permissions (8 Total)
                  </label>
                  <small style={{ color: 'var(--mu)', fontSize: '11px' }}>
                    Customizable
                  </small>
                </div>

                <div className="perm-toggle-grid">
                  {MODULE_PERMISSIONS.map((p) => {
                    const isChecked = !!newOverrides[p.key];

                    return (
                      <div key={p.key} className="perm-toggle-item">
                        <div style={{ flex: 1, paddingRight: '8px' }}>
                          <b style={{ display: 'block', fontSize: '12.5px', color: 'var(--ink)' }}>
                            {p.label}
                          </b>
                          <small
                            style={{ color: 'var(--mu)', fontSize: '11px', display: 'block' }}
                          >
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

              <div style={{ display: 'flex', gap: '10px', paddingTop: '8px' }}>
                <button
                  type="button"
                  className="btn g"
                  onClick={() => setIsAddOpen(false)}
                  style={{ flex: 1, padding: '10px 14px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn b"
                  style={{ flex: 1, padding: '10px 14px' }}
                >
                  {isSubmitting ? 'Saving...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Granular Permissions Customizer Modal */}
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
                  Edit Permissions
                </h4>
                <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--mu)' }}>
                  {selectedMember.fullName} · {selectedMember.phone ? `+91 ${selectedMember.phone}` : ''}
                </p>
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
                Staff Role
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setEditRole('Supervisor');
                    setEditOverrides({ ...ROLE_DEFAULT_PERMISSIONS.Supervisor });
                  }}
                  className="btn sm"
                  style={{
                    padding: '8px 12px',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderRadius: '10px',
                    textAlign: 'center',
                    justifyContent: 'center',
                    background:
                      editRole === 'Supervisor' ? 'rgba(59, 130, 246, 0.2)' : 'var(--card)',
                    color: editRole === 'Supervisor' ? '#60a5fa' : 'var(--ink)',
                    border:
                      editRole === 'Supervisor'
                        ? '1.5px solid #3b82f6'
                        : '1px solid var(--ln)',
                  }}
                >
                  Supervisor
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditRole('Biller');
                    setEditOverrides({ ...ROLE_DEFAULT_PERMISSIONS.Biller });
                  }}
                  className="btn sm"
                  style={{
                    padding: '8px 12px',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderRadius: '10px',
                    textAlign: 'center',
                    justifyContent: 'center',
                    background:
                      editRole === 'Biller' ? 'rgba(16, 185, 129, 0.2)' : 'var(--card)',
                    color: editRole === 'Biller' ? '#10b981' : 'var(--ink)',
                    border:
                      editRole === 'Biller'
                        ? '1.5px solid #10b981'
                        : '1px solid var(--ln)',
                  }}
                >
                  Biller (Counter)
                </button>
              </div>
            </div>

            {/* Module Permissions Switches */}
            <div style={{ marginBottom: '20px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}
              >
                <label
                  style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}
                >
                  Module Permissions
                </label>
                <small style={{ color: 'var(--mu)', fontSize: '11px' }}>
                  Toggle to override
                </small>
              </div>

              <div className="perm-toggle-grid">
                {MODULE_PERMISSIONS.map((p) => {
                  const isChecked = !!editOverrides[p.key];

                  return (
                    <div key={p.key} className="perm-toggle-item">
                      <div style={{ flex: 1, paddingRight: '8px' }}>
                        <b style={{ display: 'block', fontSize: '12.5px', color: 'var(--ink)' }}>
                          {p.label}
                        </b>
                        <small
                          style={{ color: 'var(--mu)', fontSize: '11px', display: 'block' }}
                        >
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

            <div style={{ display: 'flex', gap: '10px', paddingTop: '8px' }}>
              <button
                type="button"
                className="btn g"
                onClick={() => setSelectedMember(null)}
                style={{ flex: 1, padding: '10px 14px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingEdit}
                onClick={handleSaveEdit}
                className="btn b"
                style={{ flex: 1, padding: '10px 14px' }}
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
