/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import { User, Role, RolePermission, CRMObject, SystemLog } from '../types';

interface RbacManagerProps {
  roles: Role[];
  setRoles: React.Dispatch<React.SetStateAction<Role[]>>;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  currentUser: User;
  setCurrentUser: (user: User) => void;
  objects: CRMObject[];
  addLog: (log: SystemLog) => void;
}

export default function RbacManager({
  roles,
  setRoles,
  users,
  setUsers,
  currentUser,
  setCurrentUser,
  objects,
  addLog,
}: RbacManagerProps) {
  const [selectedRoleId, setSelectedRoleId] = useState<string>('sales_rep');
  const [expandedObjectId, setExpandedObjectId] = useState<string | null>('leads');

  // Find currently selected role for permission editing
  const selectedRole = roles.find(r => r.id === selectedRoleId) || roles[0];

  // Helper to safely fetch/initialize object permission dictionary 
  const getOrCreatePermissionObj = (role: Role, objId: string): RolePermission => {
    const existing = role.permissions.find(p => p.objectId === objId);
    if (existing) return existing;

    // Default permission if missing
    return {
      objectId: objId,
      read: true,
      write: true,
      fieldPermissions: {},
    };
  };

  // Switch Active User / Handle Impersonation
  const handleSwitchUser = (user: User) => {
    setCurrentUser(user);
    const roleObj = roles.find(r => r.id === user.roleId);
    
    addLog({
      id: `security-switch-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'action',
      message: `[Security Impersonation] Switched active workspace login to: "${user.name}" (${user.email})`,
      payload: `Operational boundaries refreshed. Current Profile Role: ${roleObj?.name || user.roleId} (Admin: ${roleObj?.isAdmin ? 'YES' : 'NO'})`
    });
  };

  // Toggle general field toggle inside safe record updates
  const handleUpdateRoleBase = (updatedFields: Partial<Role>) => {
    if (selectedRole.id === 'admin') {
      // Admin stays admin
      return;
    }
    
    setRoles(prev => prev.map(r => r.id === selectedRole.id ? { ...r, ...updatedFields } : r));
    
    addLog({
      id: `role-update-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'action',
      message: `[Metadata Service] Updated base properties for Role Profile: "${selectedRole.name}"`,
      payload: JSON.stringify(updatedFields)
    });
  };

  // Update object permission read/write toggle
  const handleToggleObjectPermission = (objId: string, flag: 'read' | 'write') => {
    if (selectedRole.id === 'admin') return;

    setRoles(prev => prev.map(r => {
      if (r.id !== selectedRole.id) return r;

      const perm = getOrCreatePermissionObj(r, objId);
      const updatedPerm: RolePermission = {
        ...perm,
        [flag]: !perm[flag],
      };

      // Ensure write requires read
      if (flag === 'write' && updatedPerm.write && !updatedPerm.read) {
        updatedPerm.read = true;
      }
      // Ensure turning off read also turns off write
      if (flag === 'read' && !updatedPerm.read) {
        updatedPerm.write = false;
      }

      const existingPerms = r.permissions.filter(p => p.objectId !== objId);
      return {
        ...r,
        permissions: [...existingPerms, updatedPerm],
      };
    }));

    addLog({
      id: `rbac-entity-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'action',
      message: `[RBAC Policy] Updated object authorization rules on role "${selectedRole.name}" for "${objId}"`,
      payload: `Modified flag: ${flag.toUpperCase()}`
    });
  };

  // Update FLS configuration for attribute
  const handleUpdateFieldAccess = (objId: string, fieldId: string, value: 'write' | 'read' | 'none') => {
    if (selectedRole.id === 'admin') return;

    setRoles(prev => prev.map(r => {
      if (r.id !== selectedRole.id) return r;

      const perm = getOrCreatePermissionObj(r, objId);
      const updatedPerm: RolePermission = {
        ...perm,
        fieldPermissions: {
          ...perm.fieldPermissions,
          [fieldId]: value,
        },
      };

      const existingPerms = r.permissions.filter(p => p.objectId !== objId);
      return {
        ...r,
        permissions: [...existingPerms, updatedPerm],
      };
    }));

    addLog({
      id: `fls-attr-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'action',
      message: `[Field Security Policy] FLS modified for attributes: ${objId}.${fieldId} set to "${value.toUpperCase()}" on role "${selectedRole.name}"`,
      payload: `Metadata schema updated successfully.`
    });
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden" id="rbac-manager-workspace">
      
      {/* Top Banner: User Impersonation Center */}
      <section className="bg-slate-900 text-slate-100 p-4 shrink-0 border-b border-slate-950 shadow-inner">
        <h3 className="text-xs font-black tracking-widest text-emerald-400 flex items-center gap-1.5 uppercase mb-2">
          <Icons.ShieldAlert className="w-4 h-4 text-emerald-400" />
          Active Workspace Login Impersonation Hub
        </h3>
        <p className="text-[10px] text-slate-400 max-w-2xl mb-3">
          Salesforce security architectures are dry run in sandboxes by shifting profiles. Click any card below to hot-swap active users. Watch how the schema explorer hides/reveals tables or locks cells instantly.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {users.map(u => {
            const isMe = currentUser.id === u.id;
            const rObj = roles.find(r => r.id === u.roleId);

            return (
              <button
                key={u.id}
                onClick={() => handleSwitchUser(u)}
                className={`text-left p-2.5 rounded border transition-all flex flex-col justify-between cursor-pointer focus:outline-none ${
                  isMe
                    ? 'bg-slate-800/90 border-emerald-500 shadow-md ring-1 ring-emerald-500/20'
                    : 'bg-slate-950/40 border-slate-800 hover:bg-slate-800/30'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className={`text-[10px] font-black ${isMe ? 'text-white' : 'text-slate-300'}`}>
                    {u.name}
                  </span>
                  {isMe ? (
                    <span className="text-[8px] font-extrabold bg-emerald-500/20 border border-emerald-500 text-emerald-400 rounded px-1 flex items-center gap-0.5 uppercase tracking-wide">
                      <Icons.UserCheck className="w-2.5 h-2.5" /> ACTIVE LOGIN
                    </span>
                  ) : (
                    <span className="text-[8px] bg-slate-800 text-slate-400 font-extrabold px-1 rounded uppercase tracking-wider">
                      Impersonate
                    </span>
                  )}
                </div>

                <div className="text-[9px] text-slate-400 font-semibold truncate w-full mb-1">
                  {u.email}
                </div>

                <div className="flex items-center justify-between w-full mt-1.5 pt-1.5 border-t border-slate-800">
                  <span className="text-[8px] font-mono text-indigo-400 uppercase font-black tracking-wider">
                    {rObj?.name || u.roleId}
                  </span>
                  {rObj?.isAdmin && (
                    <span className="text-[8px] bg-amber-500/10 text-amber-500 font-bold px-1 rounded uppercase border border-amber-500/20">
                      Super Admin
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Main Core Editor: Two-Column Split Pane */}
      <section className="flex-1 flex overflow-hidden min-h-0">
        
        {/* Left column: Roles selection list */}
        <div className="w-72 bg-white border-r border-slate-200 p-4 flex flex-col overflow-y-auto shrink-0 select-none">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
            <span className="text-[9px] font-extrabold tracking-wider text-slate-400 uppercase">
              Defined Salesforce Roles
            </span>
            <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded-full font-bold">
              {roles.length}
            </span>
          </div>

          <div className="space-y-2 flex-1">
            {roles.map(r => {
              const isSelected = selectedRoleId === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedRoleId(r.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer relative flex flex-col ${
                    isSelected
                      ? 'bg-gradient-to-br from-indigo-50 to-slate-50 border-indigo-500 shadow-xs'
                      : 'bg-white hover:bg-slate-50/60 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-[11px] font-bold text-slate-900 flex items-center gap-1">
                      {r.name}
                      {r.isAdmin && (
                        <Icons.ShieldAlert className="w-3.5 h-3.5 text-amber-500" title="Full Master Controls" />
                      )}
                    </span>
                    {r.isAdmin ? (
                      <span className="text-[8px] bg-amber-100 text-amber-800 font-bold px-1 rounded border border-amber-200 uppercase scale-90">
                        Admin
                      </span>
                    ) : (
                      <span className="text-[8px] bg-indigo-50 text-indigo-700 font-bold px-1 rounded border border-indigo-150 uppercase scale-90">
                        Profile
                      </span>
                    )}
                  </div>
                  
                  <p className="text-[10px] text-slate-500 leading-snug line-clamp-3 mb-2">
                    {r.description}
                  </p>

                  <div className="mt-auto pt-2 border-t border-slate-100 flex items-center justify-between w-full text-[9px]">
                    <span className="text-slate-400">Automation Rule Bypass:</span>
                    <span className={`font-mono font-bold ${r.allowTriggerAutomation ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {r.allowTriggerAutomation ? 'ENABLED (BYPASS)' : 'RESTRICTED'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right column: Selected Role permissions control configuration panel */}
        <div className="flex-1 bg-slate-50 p-4 overflow-y-auto flex flex-col">
          
          <div className="bg-white border border-slate-250/80 rounded p-4 mb-4 shadow-xs shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 mb-3 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">
                    {selectedRole.name}
                  </h4>
                  {selectedRole.isAdmin && (
                    <span className="text-[8px] bg-amber-100 text-amber-800 font-extrabold px-1.5 py-0.2 rounded uppercase">
                      IMMUTABLE RULES
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{selectedRole.description}</p>
              </div>

              {/* Automation Trigger switch */}
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded border border-slate-200">
                <span className="text-[10px] font-extrabold text-slate-600">TRIGGER AUTOMATIONS:</span>
                <button
                  type="button"
                  disabled={selectedRole.isAdmin}
                  onClick={() => handleUpdateRoleBase({ allowTriggerAutomation: !selectedRole.allowTriggerAutomation })}
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                    selectedRole.allowTriggerAutomation ? 'bg-emerald-500' : 'bg-slate-300'
                  } ${selectedRole.isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      selectedRole.allowTriggerAutomation ? 'translate-x-4.5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {selectedRole.isAdmin && (
              <div className="bg-amber-50 border border-amber-200 rounded p-3 text-[10px] text-amber-800 font-medium flex items-start gap-2">
                <Icons.AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <strong className="block text-amber-900 mb-0.5">Immutable Global Permissions Policy</strong>
                  The System Administrator role possesses permanent master credentials. This role bypasses all field protection shields, schema table security controls, and workflow execution blockades automatically.
                </div>
              </div>
            )}
          </div>

          {/* Granular Table Controls Header */}
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
              Object Entities & Field-Level Security Rules (FLS)
            </span>
            <span className="text-[9px] text-slate-500 font-semibold font-mono">
              Click Object name to expand field credentials
            </span>
          </div>

          <div className="space-y-3 flex-1">
            {objects.map(obj => {
              const isExpanded = expandedObjectId === obj.id;
              const perm = getOrCreatePermissionObj(selectedRole, obj.id);

              return (
                <div
                  key={obj.id}
                  className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs hover:border-slate-300 transition-colors"
                >
                  {/* Object Header Bar */}
                  <div className="p-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between select-none">
                    <button
                      onClick={() => setExpandedObjectId(isExpanded ? null : obj.id)}
                      className="flex items-center space-x-2 text-slate-800 hover:text-black font-semibold text-xs text-left cursor-pointer focus:outline-none flex-1"
                    >
                      {isExpanded ? (
                        <Icons.ChevronDown className="w-3.5 h-3.5 text-slate-450 shrink-0" />
                      ) : (
                        <Icons.ChevronRight className="w-3.5 h-3.5 text-slate-450 shrink-0" />
                      )}
                      <span className="text-[11px] font-black tracking-tight text-slate-900">
                        {obj.labelPlural} <span className="text-[8px] font-mono text-slate-400 font-normal">({obj.id})</span>
                      </span>
                      {obj.isCustom && (
                        <span className="text-[8px] font-bold bg-purple-50 text-purple-700 px-1 border border-purple-200 rounded uppercase">
                          Custom
                        </span>
                      )}
                    </button>

                    {/* Checkbox Policies */}
                    <div className="flex items-center space-x-4">
                      {/* Read permission */}
                      <label className="flex items-center space-x-1.5 cursor-pointer text-[10px] font-bold text-slate-600">
                        <input
                          type="checkbox"
                          disabled={selectedRole.isAdmin}
                          checked={selectedRole.isAdmin ? true : perm.read}
                          onChange={() => handleToggleObjectPermission(obj.id, 'read')}
                          className="rounded border-slate-350 text-indigo-600 focus:ring-slate-350 h-3.5 w-3.5 cursor-pointer disabled:opacity-50"
                        />
                        <span>READ ACCESS</span>
                      </label>

                      {/* Write permission */}
                      <label className="flex items-center space-x-1.5 cursor-pointer text-[10px] font-bold text-slate-600">
                        <input
                          type="checkbox"
                          disabled={selectedRole.isAdmin || (selectedRole.isAdmin ? false : !perm.read)}
                          checked={selectedRole.isAdmin ? true : perm.write}
                          onChange={() => handleToggleObjectPermission(obj.id, 'write')}
                          className="rounded border-slate-350 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer disabled:opacity-50"
                        />
                        <span>WRITE ACCESS</span>
                      </label>
                    </div>
                  </div>

                  {/* Fields FLS Configuration (Expanded Block) */}
                  {isExpanded && (
                    <div className="p-3 bg-white border-t border-slate-100">
                      {/* Access Status Summary */}
                      {!(selectedRole.isAdmin ? true : perm.read) ? (
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded text-center text-[10px] text-slate-405 font-medium uppercase">
                          No read schema access granted on this entity. All fields are default locked.
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="grid grid-cols-12 text-[9px] font-bold text-slate-400 pb-1.5 border-b border-slate-100 uppercase">
                            <span className="col-span-5">Field Name & Identifier</span>
                            <span className="col-span-2 text-center">Type</span>
                            <span className="col-span-5 text-right pr-2">Field-Level Access Limit</span>
                          </div>

                          <div className="divide-y divide-slate-100">
                            {obj.fields.map(field => {
                              // Defaults for Admin/normal roles
                              let activeFlAccess: 'write' | 'read' | 'none' = 'write';
                              if (!selectedRole.isAdmin) {
                                activeFlAccess = perm.fieldPermissions[field.id] || 'write';
                              }

                              return (
                                <div key={field.id} className="grid grid-cols-12 py-2 items-center text-[10px]">
                                  {/* Field detail */}
                                  <div className="col-span-5 flex flex-col">
                                    <span className="font-bold text-slate-800">{field.label}</span>
                                    <span className="font-mono text-[9px] text-slate-400">{field.id}</span>
                                  </div>

                                  {/* Data Type */}
                                  <span className="col-span-2 text-center text-slate-450 uppercase font-mono text-[9px] tracking-wide font-semibold">
                                    {field.type}
                                  </span>

                                  {/* Selected FLS choice */}
                                  <div className="col-span-5 flex justify-end space-x-1.5">
                                    {['write', 'read', 'none'].map((fOption) => {
                                      const isSelected = activeFlAccess === fOption;
                                      const isOptionDisabled = selectedRole.isAdmin || (fOption === 'write' && !perm.write);

                                      return (
                                        <button
                                          key={fOption}
                                          type="button"
                                          disabled={isOptionDisabled}
                                          onClick={() => handleUpdateFieldAccess(obj.id, field.id, fOption as any)}
                                          className={`px-1.5 py-0.5 rounded text-[8px] font-bold border cursor-pointer uppercase transition-all tracking-wider ${
                                            isSelected
                                              ? fOption === 'write'
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                                : fOption === 'read'
                                                ? 'bg-amber-50 text-amber-700 border-amber-300'
                                                : 'bg-rose-50 text-rose-700 border-rose-300'
                                              : 'bg-white hover:bg-slate-50 text-slate-400 border-slate-200'
                                          } ${isOptionDisabled && !isSelected ? 'opacity-30 cursor-not-allowed' : ''}`}
                                        >
                                          {fOption === 'write' && 'Read-Write'}
                                          {fOption === 'read' && 'Read-Only'}
                                          {fOption === 'none' && 'Restricted'}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>

      </section>

    </div>
  );
}
