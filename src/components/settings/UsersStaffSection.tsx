import React, { useState, useEffect, useCallback } from 'react';
import { staffService, ShopMember, UserRole, PermissionKey, ROLE_DEFAULT_PERMISSIONS } from '../../services/staffService';
import { useAuth } from '../../context/AuthContext';
import { useShop } from '../../context/ShopContext';
import { storage } from '../../lib/storage';
import { LOCAL_SHOP_KEY } from '../../services/authService';
import { Shop } from '../../types/models';

export const UsersStaffSection: React.FC<{ shopId?: string; onCountChange?: (count: number) => void }> = ({
  shopId: propShopId,
  onCountChange,
}) => {
  const { currentShop, currentMember, currentRole } = useAuth();
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
  const [newRole, setNewRole] = useState<UserRole>('Biller');
  const [newOverrides, setNewOverrides] = useState<Partial<Record<PermissionKey, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Permissions Modal State
  const [selectedMember, setSelectedMember] = useState<ShopMember | null>(null);

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
      onCountChange?.(data.length);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load staff list.');
    } finally {
      setLoading(false);
    }
  }, [activeShopId, onCountChange]);

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
    if (!newName.trim() || newPhone.replace(/\D/g, '').length !== 10) {
      alert('Please enter a valid name and 10-digit phone number.');
      return;
    }

    try {
      setIsSubmitting(true);
      await staffService.addMember(activeShopId, newName, newRole, newPhone, newOverrides);
      setIsAddOpen(false);
      setNewName('');
      setNewPhone('');
      setNewRole('Biller');
      setNewOverrides({});
      await loadMembers();
    } catch (err: any) {
      alert(err.message || 'Failed to add staff member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (memberId: string, role: UserRole) => {
    if (!isOwner) return;
    try {
      await staffService.updateRole(activeShopId, memberId, role);
      await loadMembers();
    } catch (err: any) {
      alert('Failed to update role: ' + err.message);
    }
  };

  const handleToggleActive = async (member: ShopMember) => {
    if (!isOwner || member.role === 'Owner') return;
    try {
      await staffService.toggleMemberActive(activeShopId, member.id, !member.isActive);
      await loadMembers();
    } catch (err: any) {
      alert('Failed to update member status.');
    }
  };

  const handleDeleteMember = async (member: ShopMember) => {
    if (!isOwner || member.role === 'Owner') return;
    if (!confirm(`Are you sure you want to remove ${member.fullName}?`)) return;
    try {
      await staffService.deleteMember(activeShopId, member.id);
      await loadMembers();
    } catch (err: any) {
      alert('Failed to delete member.');
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Users & Staff Management</h3>
          <p className="text-sm text-gray-500">Manage billing counter access, supervisors, and role permissions.</p>
        </div>
        {isOwner && (
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2 bg-[#FF5F00] hover:bg-[#e05400] text-white text-sm font-semibold rounded-xl flex items-center gap-2 shadow-sm transition"
          >
            <span>+</span> Add Staff Member
          </button>
        )}
      </div>

      {errorMsg && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{errorMsg}</div>}

      {/* Staff List */}
      {loading ? (
        <div className="py-8 text-center text-gray-400 text-sm">Loading staff members from database...</div>
      ) : members.length === 0 ? (
        <div className="py-8 text-center text-gray-400 text-sm">No staff members found.</div>
      ) : (
        <div className="divide-y divide-gray-100">
          {members.map((m) => {
            const roleBadgeStyle =
              m.role === 'Owner'
                ? 'bg-orange-100 text-[#FF5F00] border-orange-200'
                : m.role === 'Supervisor'
                ? 'bg-purple-100 text-purple-700 border-purple-200'
                : 'bg-emerald-100 text-emerald-700 border-emerald-200';

            return (
              <div key={m.id} className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 font-bold flex items-center justify-center text-sm">
                    {m.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{m.fullName}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${roleBadgeStyle}`}>
                        {m.role}
                      </span>
                      {!m.isActive && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">Ph: +91 {m.phone || 'N/A'}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Role Selector (Owner Only, cannot change Owner role) */}
                  {isOwner && m.role !== 'Owner' ? (
                    <select
                      value={m.role}
                      onChange={(e) => handleRoleChange(m.id, e.target.value as UserRole)}
                      className="text-xs font-semibold px-2 py-1.5 border border-gray-200 rounded-lg bg-gray-50 hover:bg-white"
                    >
                      <option value="Biller">Biller</option>
                      <option value="Supervisor">Supervisor</option>
                    </select>
                  ) : null}

                  {/* Permissions Button */}
                  {isOwner && m.role !== 'Owner' && (
                    <button
                      onClick={() => setSelectedMember(m)}
                      className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                    >
                      Permissions
                    </button>
                  )}

                  {/* Active / Inactive Toggle */}
                  {isOwner && m.role !== 'Owner' && (
                    <button
                      onClick={() => handleToggleActive(m)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg font-medium ${
                        m.isActive
                          ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      {m.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  )}

                  {/* Delete Button */}
                  {isOwner && m.role !== 'Owner' && (
                    <button
                      onClick={() => handleDeleteMember(m)}
                      className="text-gray-400 hover:text-red-500 p-1 rounded-md"
                      title="Remove Staff"
                    >
                      🗑️
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h4 className="text-lg font-bold text-gray-900">Add Staff Member</h4>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">10-Digit Mobile Number</label>
                <div className="flex">
                  <span className="px-3 py-2 bg-gray-100 text-gray-600 rounded-l-xl border border-r-0 border-gray-200 text-sm">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="9876543210"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-r-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Role</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewRole('Biller')}
                    className={`py-2 px-3 text-sm font-semibold rounded-xl border text-center ${
                      newRole === 'Biller'
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'bg-white text-gray-700 border-gray-200'
                    }`}
                  >
                    Biller (Counter Only)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRole('Supervisor')}
                    className={`py-2 px-3 text-sm font-semibold rounded-xl border text-center ${
                      newRole === 'Supervisor'
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white text-gray-700 border-gray-200'
                    }`}
                  >
                    Supervisor
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#FF5F00] text-white text-sm font-semibold rounded-xl"
                >
                  {isSubmitting ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Granular Permissions Customizer */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h4 className="font-bold text-gray-900">Custom Permissions</h4>
                <p className="text-xs text-gray-500">{selectedMember.fullName} ({selectedMember.role})</p>
              </div>
              <button
                onClick={() => setSelectedMember(null)}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {(['bill', 'total', 'exp', 'pend', 'report', 'menu', 'menu_delete'] as PermissionKey[]).map((perm) => {
                const isInherited = ROLE_DEFAULT_PERMISSIONS[selectedMember.role][perm];
                const currentVal = staffService.canPerform(selectedMember, perm);

                return (
                  <div key={perm} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <div className="text-sm font-semibold text-gray-800 capitalize">
                        {perm === 'exp' ? 'Expenses Management' : perm === 'pend' ? 'Customer Dues / Pending' : perm === 'menu_delete' ? 'Delete Menu Items' : `${perm} Access`}
                      </div>
                      <div className="text-xs text-gray-400">
                        Default for {selectedMember.role}: {isInherited ? 'Allowed' : 'Denied'}
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        await staffService.setPermissionOverride(
                          activeShopId,
                          selectedMember.id,
                          selectedMember.overrides || {},
                          perm,
                          !currentVal
                        );
                        await loadMembers();
                        setSelectedMember((prev) =>
                          prev
                            ? {
                                ...prev,
                                overrides: { ...(prev.overrides || {}), [perm]: !currentVal },
                              }
                            : null
                        );
                      }}
                      className={`w-11 h-6 flex items-center rounded-full p-1 duration-200 ${
                        currentVal ? 'bg-[#FF5F00]' : 'bg-gray-300'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow transform duration-200 ${
                          currentVal ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedMember(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-semibold rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
