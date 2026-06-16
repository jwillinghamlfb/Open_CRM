/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import { CRMObject, CRMRecord, CRMField, SystemLog, CRMFieldType, Workflow, User, Role } from '../types';
import { processRecordFormulas, generateInsertSQLLog, generateUpdateSQLLog, generateDeleteSQLLog, executeWorkflowAutomation } from '../utils/engine';
import { DBConfig, cloudSaveRecord, cloudDeleteRecord } from '../utils/dbAdapters';

interface RecordExplorerProps {
  objects: CRMObject[];
  records: CRMRecord[];
  setRecords: React.Dispatch<React.SetStateAction<CRMRecord[]>>;
  workflows: Workflow[];
  addLog: (log: SystemLog) => void;
  addLogsBatch: (logs: SystemLog[]) => void;
  currentUser: User;
  roles: Role[];
  dbConfig?: DBConfig;
}

export default function RecordExplorer({
  objects,
  records,
  setRecords,
  workflows,
  addLog,
  addLogsBatch,
  currentUser,
  roles,
  dbConfig
}: RecordExplorerProps) {
  const [selectedObjectId, setSelectedObjectId] = useState<string>('accounts');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingRecord, setEditingRecord] = useState<CRMRecord | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isNewMode, setIsNewMode] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Record<string, any>>({});

  const userRole = roles?.find(r => r.id === currentUser?.roleId);
  const isAdmin = userRole ? userRole.isAdmin : true;

  // Object-level permission checks
  const getObjectPermission = (objId: string) => {
    if (!userRole || userRole.isAdmin) return { read: true, write: true };
    const perm = userRole.permissions.find(p => p.objectId === objId);
    return perm ? { read: perm.read, write: perm.write } : { read: false, write: false };
  };

  // Filter objects list
  const visibleObjects = objects.filter(o => getObjectPermission(o.id).read);

  // Auto redirect selectedObjectId when permission profiles rotate
  React.useEffect(() => {
    const activePerm = getObjectPermission(selectedObjectId);
    if (!activePerm.read && visibleObjects.length > 0) {
      setSelectedObjectId(visibleObjects[0].id);
    }
  }, [selectedObjectId, currentUser, roles]);

  const activeObjectId = visibleObjects.find(o => o.id === selectedObjectId) ? selectedObjectId : (visibleObjects[0]?.id || selectedObjectId);
  const selectedObject = objects.find(o => o.id === activeObjectId) || objects[0];
  const activeFields = selectedObject.fields;

  const currentObjPerm = getObjectPermission(selectedObject.id);
  const canReadObject = currentObjPerm.read;
  const canWriteObject = currentObjPerm.write;

  const getFieldAccess = (fieldId: string) => {
    if (!userRole || userRole.isAdmin) return 'write';
    const perm = userRole.permissions.find(p => p.objectId === selectedObject.id);
    if (!perm) return 'none';
    return perm.fieldPermissions[fieldId] || 'none';
  };

  // Filter records mapped to this object
  const objectRecords = records.filter(r => r.objectId === selectedObject.id);

  // Search filter
  const filteredRecords = objectRecords.filter(r => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return Object.values(r.data).some(val => 
      String(val).toLowerCase().includes(query)
    );
  });

  // Find status/stage field for Kanban eligibility
  const kanbanField = activeFields.find(f => 
    f.type === 'picklist' && (f.id === 'status' || f.id === 'stage')
  );

  // Resolve Lookup record names (e.g., display Account Name instead of Account ID 'acc1')
  const resolveLookupName = (value: string, targetObjectId?: string) => {
    if (!value || !targetObjectId) return value;
    const targetRec = records.find(r => r.id === value && r.objectId === targetObjectId);
    if (targetRec) {
      return targetRec.data.name || targetRec.data.first_name + ' ' + targetRec.data.last_name || targetRec.id;
    }
    return value;
  };

  // Switch tables from click in badge
  const handleLookupPivot = (targetObjectId: string, targetRecordId: string) => {
    setSelectedObjectId(targetObjectId);
    setViewMode('table');
    setSearchQuery(targetRecordId); // Quick filter target
  };

  // Open Add Record Form
  const handleOpenAdd = () => {
    const freshData: Record<string, any> = {};
    activeFields.forEach(f => {
      freshData[f.id] = f.defaultValue !== undefined ? f.defaultValue : '';
    });
    setFormData(freshData);
    setIsNewMode(true);
    setEditingRecord(null);
    setShowEditModal(true);
  };

  // Open Edit Record Form
  const handleOpenEdit = (rec: CRMRecord) => {
    setFormData({ ...rec.data });
    setIsNewMode(false);
    setEditingRecord(rec);
    setShowEditModal(true);
  };

  // Persist record insertions / updates
  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();

    if (!canWriteObject) {
      alert("Access Denied: Your profile role is restricted from writing records on this object.");
      return;
    }

    const timestamp = new Date().toISOString();
    
    if (isNewMode) {
      // Build core record
      const newId = `${selectedObject.id.replace('__c', '')}-${Math.random().toString(36).substr(2, 9)}`;
      let tempRecord: CRMRecord = {
        id: newId,
        objectId: selectedObject.id,
        data: formData,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      // 1. Process Formula Fields
      tempRecord = processRecordFormulas(tempRecord, activeFields);

      // 2. Insert into React State
      setRecords(prev => [...prev, tempRecord]);

      if (dbConfig && dbConfig.provider !== 'localStorage') {
        cloudSaveRecord(dbConfig, tempRecord)
          .then(() => {
            addLog({
              id: `cloud-save-${Date.now()}`,
              timestamp,
              type: 'info',
              message: `[Cloud DB Sync] Inserted record "${tempRecord.id}" directly into remote ${dbConfig.provider.toUpperCase()} database.`,
              payload: `Synchronization check verified.`
            });
          })
          .catch(err => {
            addLog({
              id: `cloud-err-${Date.now()}`,
              timestamp,
              type: 'info',
              message: `[Cloud DB sync fail] Error pushing new record:`,
              payload: err.message || err
            });
          });
      }

      // 3. Emit Postgres SQL log
      addLog({
        id: `sql-insert-${Date.now()}`,
        timestamp,
        type: 'sql',
        message: `[PostgreSQL] persisting JSONB structural row for standard Object: "${selectedObject.label}"`,
        sqlQuery: generateInsertSQLLog(tempRecord)
      });

      addLog({
        id: `info-insert-${Date.now()}`,
        timestamp,
        type: 'info',
        message: `[Database] Success. Record ${newId} created.`
      });

      // 4. Trace Workflows !
      const allowTrigger = userRole ? userRole.allowTriggerAutomation : true;
      if (allowTrigger) {
        executeWorkflowAutomation(
          'create',
          null,
          tempRecord,
          objects,
          records,
          workflows,
          (wfLogs, wfRecords) => {
            addLogsBatch(wfLogs);
            if (wfRecords.length > 0) {
              setRecords(prev => [...prev, ...wfRecords]);
            }
          }
        );
      } else {
        addLog({
          id: `info-wf-skip-${Date.now()}`,
          timestamp,
          type: 'workflow',
          message: `[Workflow Security] Skipping automation loops because user profile role '${userRole?.name || currentUser.roleId}' is restricted from triggering operational workflows.`
        });
      }

    } else if (editingRecord) {
      // Manage update
      const oldRec = editingRecord;
      let tempRecord: CRMRecord = {
        ...editingRecord,
        data: formData,
        updatedAt: timestamp
      };

      // 1. Re-process Formulas
      tempRecord = processRecordFormulas(tempRecord, activeFields);

      // Find modified fields for dynamic targeted update SQL log
      const modifiedFields: Record<string, any> = {};
      Object.entries(tempRecord.data).forEach(([key, val]) => {
        if (oldRec.data[key] !== val) {
          modifiedFields[key] = val;
        }
      });

      // 2. Perform Save
      setRecords(prev => prev.map(r => r.id === tempRecord.id ? tempRecord : r));

      if (dbConfig && dbConfig.provider !== 'localStorage') {
        cloudSaveRecord(dbConfig, tempRecord)
          .then(() => {
            addLog({
              id: `cloud-save-${Date.now()}`,
              timestamp,
              type: 'info',
              message: `[Cloud DB Sync] Saved record updates for "${tempRecord.id}" to remote ${dbConfig.provider.toUpperCase()} database.`,
              payload: `Database tables remain synchronized.`
            });
          })
          .catch(err => {
            console.error('[Cloud DB Error] edit record:', err);
          });
      }

      // 3. Log Update SQL Query
      addLog({
        id: `sql-update-${Date.now()}`,
        timestamp,
        type: 'sql',
        message: `[PostgreSQL] updating dynamic row record: ${tempRecord.id}`,
        sqlQuery: generateUpdateSQLLog(tempRecord, modifiedFields)
      });

      addLog({
        id: `info-update-${Date.now()}`,
        timestamp,
        type: 'info',
        message: `[Database] DB transaction success for Row ID: ${tempRecord.id}`
      });

      // 4. Trigger Events
      const allowTrigger = userRole ? userRole.allowTriggerAutomation : true;
      if (allowTrigger) {
        executeWorkflowAutomation(
          'update',
          oldRec,
          tempRecord,
          objects,
          records,
          workflows,
          (wfLogs, wfRecords) => {
            addLogsBatch(wfLogs);
            if (wfRecords.length > 0) {
              setRecords(prev => [...prev, ...wfRecords]);
            }
          }
        );
      } else {
        addLog({
          id: `info-wf-skip-upd-${Date.now()}`,
          timestamp,
          type: 'workflow',
          message: `[Workflow Security] Skipping update automation loops because user profile role '${userRole?.name || currentUser.roleId}' is restricted from triggering operational workflows.`
        });
      }
    }

    setShowEditModal(false);
  };

  // Delete Record
  const handleDeleteRecord = (id: string) => {
    if (!canWriteObject) {
      alert("Access Denied: Your profile role is restricted from deleting records on this object.");
      return;
    }

    if (!confirm('Are you sure you want to delete this record physically from Postgres?')) return;

    setRecords(prev => prev.filter(r => r.id !== id));

    if (dbConfig && dbConfig.provider !== 'localStorage') {
      cloudDeleteRecord(dbConfig, id)
        .then(() => {
          addLog({
            id: `cloud-del-${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: 'info',
            message: `[Cloud DB Sync] Deleted record "${id}" from remote ${dbConfig.provider.toUpperCase()} database.`,
            payload: `Synchronization check verified.`
          });
        })
        .catch(err => {
          console.error('[Cloud DB Sync error]', err);
        });
    }

    const timestamp = new Date().toISOString();
    // Log Delete SQL
    addLog({
      id: `sql-delete-${Date.now()}`,
      timestamp,
      type: 'sql',
      message: `[PostgreSQL] Delete trigger for ID ${id}`,
      sqlQuery: generateDeleteSQLLog(id, selectedObject.id)
    });

    addLog({
      id: `info-delete-${Date.now()}`,
      timestamp,
      type: 'info',
      message: `[Database] Terminated index segment for record ${id}.`
    });
  };

  // Move Kanban column (touch action)
  const handleMoveKanban = (record: CRMRecord, targetColumn: string) => {
    if (!canWriteObject) {
      alert("Access Denied: Your profile role is restricted from writing records on this object.");
      return;
    }

    if (!kanbanField) return;

    const timestamp = new Date().toISOString();
    const oldRec = { ...record };
    
    // Update picklist value
    const updatedData = {
      ...record.data,
      [kanbanField.id]: targetColumn
    };

    let updatedRecord: CRMRecord = {
      ...record,
      data: updatedData,
      updatedAt: timestamp
    };

    // Calculate Formulas in case they depend on state
    updatedRecord = processRecordFormulas(updatedRecord, activeFields);

    // Save To State
    setRecords(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));

    if (dbConfig && dbConfig.provider !== 'localStorage') {
      cloudSaveRecord(dbConfig, updatedRecord)
        .then(() => {
          addLog({
            id: `cloud-kb-${Date.now()}`,
            timestamp,
            type: 'info',
            message: `[Cloud DB Sync] Updated dynamic column value "${kanbanField.id}" & saved to remote ${dbConfig.provider.toUpperCase()}`
          });
        })
        .catch(err => {
          console.error('[Cloud DB Sync error]', err);
        });
    }

    // Emit standard update logs
    addLog({
      id: `sql-kb-update-${Date.now()}`,
      timestamp,
      type: 'sql',
      message: `[PostgreSQL] Pipeline state update on Kanban Card drag-and-drop: ${record.id}`,
      sqlQuery: generateUpdateSQLLog(updatedRecord, { [kanbanField.id]: targetColumn })
    });

    // Execute flow
    const allowTrigger = userRole ? userRole.allowTriggerAutomation : true;
    if (allowTrigger) {
      executeWorkflowAutomation(
        'update',
        oldRec,
        updatedRecord,
        objects,
        records,
        workflows,
        (wfLogs, wfRecords) => {
          addLogsBatch(wfLogs);
          if (wfRecords.length > 0) {
            setRecords(prev => [...prev, ...wfRecords]);
          }
        }
      );
    } else {
      addLog({
        id: `info-wf-skip-kb-${Date.now()}`,
        timestamp,
        type: 'workflow',
        message: `[Workflow Security] Skipping Kanban pipeline update workflows because user profile role '${userRole?.name || currentUser.roleId}' is restricted from triggering operational workflows.`
      });
    }
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-slate-50 overflow-hidden" id="record-explorer-root">
      
      {/* Objects Selector Drawer */}
      <div className="w-56 border-r border-slate-200 bg-white flex flex-col shrink-0 h-full">
        <div className="p-3 border-b border-slate-200">
          <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">JSONB Datastores</span>
          <h3 className="text-xs font-bold text-slate-800">Available Tables</h3>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {visibleObjects.map(obj => {
            const Icon = (Icons as any)[obj.icon] || Icons.Cpu;
            const isSelected = obj.id === selectedObjectId;
            const recCount = records.filter(r => r.objectId === obj.id).length;

            return (
              <button
                key={obj.id}
                onClick={() => { setSelectedObjectId(obj.id); setSearchQuery(''); }}
                className={`w-full text-left flex items-center justify-between p-2 rounded transition text-[11px] font-bold ${
                  isSelected
                    ? 'bg-slate-100 text-slate-900 border-l-[3px] border-indigo-650'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-[3px] border-transparent'
                }`}
              >
                <div className="flex items-center space-x-2 min-w-0">
                  <div className={`p-1 rounded shrink-0 ${isSelected ? 'bg-indigo-650 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    <Icon className="h-3 w-3" />
                  </div>
                  <span className="truncate text-slate-850 leading-none">{obj.labelPlural}</span>
                </div>
                <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                  {recCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Database Datagrid Body */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Dynamic Query Controls */}
        <div className="bg-white border-b border-slate-200 px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder={`Search lines in Postgres JSONB...`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full sm:w-60 bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-[11px] focus:ring-1 focus:ring-slate-705 outline-none h-7"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-[10px] hover:underline text-slate-500 font-semibold"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* View Model Toggle for Kanban eligibility */}
            {kanbanField && (
              <div className="flex bg-slate-100 p-0.5 rounded border border-slate-200 h-7 items-center">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1 px-2.5 rounded text-[10px] font-bold flex items-center space-x-1 transition cursor-pointer leading-none ${
                    viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Icons.Database className="h-3 w-3" />
                  <span>Grid</span>
                </button>
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`p-1 px-2.5 rounded text-[10px] font-bold flex items-center space-x-1 transition cursor-pointer leading-none ${
                    viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Icons.Sliders className="h-3 w-3" />
                  <span>Kanban</span>
                </button>
              </div>
            )}

            <button
              onClick={handleOpenAdd}
              className="px-2.5 py-1 bg-indigo-650 hover:bg-indigo-600 text-white rounded text-[10px] uppercase font-bold tracking-wider flex items-center space-x-1 transition cursor-pointer shadow-xs border border-indigo-600 h-7"
            >
              <Icons.Plus className="h-3 w-3" />
              <span>New {selectedObject.label} Record</span>
            </button>
          </div>
        </div>

        {/* Dynamic Records Render Area */}
        <div className="flex-1 overflow-auto bg-slate-50 p-3">
          {viewMode === 'table' ? (
            /* Table Grid Render */
            <div className="bg-white border border-slate-200 rounded shadow-xs overflow-hidden min-w-full">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50 text-[9px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <th className="p-2 pl-3">Row ID</th>
                      {activeFields.map(field => (
                        <th key={field.id} className="p-2">{field.label}</th>
                      ))}
                      <th className="p-2 pr-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 text-[11px]">
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={activeFields.length + 2} className="p-6 text-center text-slate-400">
                          <Icons.Info className="h-5 w-5 mx-auto mb-1 text-slate-300" />
                          <span className="text-[11px]">No structural records matched. Change criteria or seed rows.</span>
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map(record => (
                        <tr key={record.id} className="hover:bg-slate-50/55 group">
                          <td className="p-2 pl-3 font-mono text-[9px] text-slate-400 font-bold">{record.id}</td>
                          
                           {activeFields.map(field => {
                            const val = record.data[field.id];
                            const access = getFieldAccess(field.id);

                            if (access === 'none') {
                              return (
                                <td key={field.id} className="p-2 max-w-[180px] truncate leading-tight select-none">
                                  <span className="text-slate-400 font-mono text-[10px] italic bg-slate-100 p-0.5 px-1.5 rounded border border-slate-200" title="FLS Restricted Profile Lock">
                                    ••••••
                                  </span>
                                </td>
                              );
                            }
                            
                            return (
                              <td key={field.id} className="p-2 max-w-[180px] truncate leading-tight">
                                {field.type === 'lookup' && val ? (
                                  <button
                                    onClick={() => handleLookupPivot(field.relatedTo!, val)}
                                    className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 transition cursor-pointer font-bold text-[10px]"
                                  >
                                    <Icons.Link className="h-2.5 w-2.5 shrink-0" />
                                    <span>{resolveLookupName(val, field.relatedTo)}</span>
                                  </button>
                                ) : field.type === 'formula' ? (
                                  <span className="font-mono text-indigo-700 bg-indigo-50/50 p-0.5 px-1.5 rounded border border-indigo-120 font-bold text-[10px]">
                                    {val !== undefined ? `$${Number(val).toLocaleString()}` : '$0'}
                                  </span>
                                ) : field.type === 'number' ? (
                                  <span className="font-bold text-slate-800">
                                    {val !== undefined ? (typeof val === 'number' ? val.toLocaleString() : val) : ''}
                                  </span>
                                ) : (
                                  <span className="text-slate-700">{val !== undefined ? String(val) : ''}</span>
                                )}
                              </td>
                            );
                          })}

                          <td className="p-2 pr-3 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              {canWriteObject ? (
                                <>
                                  <button
                                    onClick={() => handleOpenEdit(record)}
                                    className="text-slate-500 hover:text-slate-850 hover:bg-slate-100 p-1 rounded transition"
                                    title="Edit DB record"
                                  >
                                    <Icons.Edit2 className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteRecord(record.id)}
                                    className="text-rose-500 hover:text-rose-600 hover:bg-rose-55 p-1 rounded transition"
                                    title="Delete Record"
                                  >
                                    <Icons.Trash2 className="h-3 w-3" />
                                  </button>
                                </>
                              ) : (
                                <span className="text-[9px] text-slate-400 font-extrabold bg-slate-50 p-1 border border-slate-150 rounded flex items-center gap-0.5" title="Access Policy locks modification of database rows.">
                                  <Icons.Lock className="w-2.5 h-2.5" /> Locked
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Kanban Pipeline View */
            <div className="h-full flex overflow-x-auto space-x-3 pb-2 min-h-[400px]">
              {kanbanField?.options?.map(columnName => {
                const columnCards = filteredRecords.filter(r => r.data[kanbanField.id] === columnName);

                return (
                  <div key={columnName} className="w-64 bg-slate-100 rounded flex flex-col shrink-0 overflow-hidden border border-slate-205">
                    <div className="p-2 px-3 border-b border-slate-205 flex items-center justify-between bg-white/80">
                      <span className="text-[11px] font-bold text-slate-800 uppercase tracking-tight">{columnName}</span>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">
                        {columnCards.length}
                      </span>
                    </div>

                    {/* Cards Column list */}
                    <div className="flex-1 p-2 overflow-y-auto space-y-2">
                      {columnCards.length === 0 ? (
                        <div className="border border-dashed border-slate-300 rounded p-4 text-center text-[10px] text-slate-400">
                          No Cards
                        </div>
                      ) : (
                        columnCards.map(card => {
                          const subTitleField = activeFields.find(f => f.id !== 'name' && f.id !== 'id' && (f.type === 'text' || f.type === 'email' || f.type === 'lookup'));
                          const numericField = activeFields.find(f => f.type === 'number' || f.type === 'formula');

                          const subTitleVisible = subTitleField && getFieldAccess(subTitleField.id) !== 'none';
                          const numericVisible = numericField && getFieldAccess(numericField.id) !== 'none';

                          return (
                            <div
                              key={card.id}
                              className="bg-white border border-slate-200 p-2.5 rounded hover:shadow-xs transition duration-150 relative group"
                            >
                              <div className="flex justify-between items-start mb-1 gap-1">
                                <h5 className="text-[11px] font-bold text-slate-950 truncate flex-1 leading-tight">
                                  {card.data.name || card.data.first_name + ' ' + card.data.last_name || card.id}
                                </h5>
                                {canWriteObject ? (
                                  <button
                                    onClick={() => handleOpenEdit(card)}
                                    className="text-slate-400 hover:text-slate-700 opacity-60 hover:opacity-100 transition p-0.5 rounded shrink-0"
                                    title="Edit DB record"
                                  >
                                    <Icons.Edit2 className="h-2.5 w-2.5" />
                                  </button>
                                ) : (
                                  <Icons.Lock className="h-2.5 w-2.5 text-slate-300 shrink-0 mt-0.5" title="Read-Only Object" />
                                )}
                              </div>

                              {/* Info Subtitles */}
                              {subTitleVisible && card.data[subTitleField.id] && (
                                <p className="text-[10px] text-slate-500 mb-1 truncate">
                                  {subTitleField.type === 'lookup' 
                                    ? resolveLookupName(card.data[subTitleField.id], subTitleField.relatedTo)
                                    : card.data[subTitleField.id]}
                                </p>
                              )}

                              {/* Pricing Metrics */}
                              {numericVisible && card.data[numericField.id] !== undefined && (
                                <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between">
                                  <span className="text-[9px] text-slate-400 uppercase font-bold">{numericField.label}</span>
                                  <span className={`text-[11px] font-bold ${numericField.type === 'formula' ? 'text-indigo-700 font-mono': 'text-slate-700'}`}>
                                    ${Number(card.data[numericField.id]).toLocaleString()}
                                  </span>
                                </div>
                              )}

                              {/* Kanban column shifter (touch-friendly overlay elements) */}
                              {canWriteObject ? (
                                <div className="flex items-center justify-end space-x-1 mt-2 pt-2 border-t border-slate-100">
                                  {kanbanField.options && kanbanField.options.indexOf(columnName) > 0 && (
                                    <button
                                      onClick={() => {
                                        const idx = kanbanField.options!.indexOf(columnName);
                                        handleMoveKanban(card, kanbanField.options![idx - 1]);
                                      }}
                                      className="p-0.5 px-1 border bg-slate-50 text-slate-500 hover:bg-slate-100 rounded text-[9px] leading-none shrink-0 cursor-pointer"
                                      title="Move Left"
                                    >
                                      &larr;
                                    </button>
                                  )}
                                  <span className="text-[8px] text-slate-400 flex-1 text-center font-bold tracking-tight bg-slate-50 py-0.5 rounded border max-w-[90px] truncate leading-none">Move Stage</span>
                                  {kanbanField.options && kanbanField.options.indexOf(columnName) < kanbanField.options.length - 1 && (
                                    <button
                                      onClick={() => {
                                        const idx = kanbanField.options!.indexOf(columnName);
                                        handleMoveKanban(card, kanbanField.options![idx + 1]);
                                      }}
                                      className="p-0.5 px-1 border bg-slate-50 text-slate-500 hover:bg-slate-100 rounded text-[9px] leading-none shrink-0 cursor-pointer"
                                      title="Move Right"
                                    >
                                      &rarr;
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center justify-center space-x-1 mt-2 pt-2 border-t border-slate-100 text-[8px] font-extrabold text-slate-400 uppercase tracking-tight">
                                  <Icons.Lock className="w-2.5 h-2.5" /> Pipeline Locked
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Record Form Modal Backdrop */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs">
          <form onSubmit={handleSaveRecord} className="bg-white rounded w-full max-w-sm p-4 border border-slate-200 shadow-xl relative max-h-[90vh] overflow-y-auto">
            <h4 className="text-xs font-extrabold text-slate-900 border-b border-slate-100 pb-1.5 mb-2 flex items-center justify-between">
              <span>{isNewMode ? `NEW ${selectedObject.label.toUpperCase()}` : `EDIT ID: ${editingRecord?.id}`}</span>
              <button type="button" onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
            </h4>

            <div className="space-y-2">
              {activeFields.map(field => {
                const isFormulary = field.type === 'formula';
                const access = getFieldAccess(field.id);

                // If FLS access level is 'none', hide completely
                if (access === 'none') {
                  return null;
                }

                const isLocked = access === 'read' || isFormulary;
                
                return (
                  <div key={field.id} className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase flex items-center justify-between">
                      <span className="flex items-center space-x-1">
                        <span>{field.label}</span>
                        {field.required && !isLocked && <span className="text-rose-500">*</span>}
                      </span>
                      {access === 'read' && (
                        <span className="text-[8px] bg-slate-100 border text-slate-400 font-extrabold px-1 rounded flex items-center gap-0.5 uppercase tracking-wider scale-90">
                          <Icons.Lock className="w-2 h-2" /> Read-Only
                        </span>
                      )}
                    </label>

                    {/* Choose input type based on schema */}
                    {field.type === 'picklist' ? (
                      <select
                        value={formData[field.id] || ''}
                        disabled={isLocked}
                        required={field.required && !isLocked}
                        onChange={e => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                        className="w-full bg-white disabled:bg-slate-50 disabled:text-slate-450 disabled:border-slate-150 border border-slate-250 rounded px-2 py-1 text-[11px] focus:ring-1 focus:ring-slate-700 outline-none h-7"
                      >
                        <option value="">-- Select option --</option>
                        {field.options?.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : field.type === 'lookup' && field.relatedTo ? (
                      <select
                        value={formData[field.id] || ''}
                        disabled={isLocked}
                        required={field.required && !isLocked}
                        onChange={e => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                        className="w-full bg-white disabled:bg-slate-50 disabled:text-slate-450 disabled:border-slate-150 border border-slate-250 rounded px-2 py-1 text-[11px] focus:ring-1 focus:ring-indigo-500 outline-none h-7"
                      >
                        <option value="">-- Select Reference --</option>
                        {records
                           .filter(r => r.objectId === field.relatedTo)
                           .map(r => (
                             <option key={r.id} value={r.id}>
                               {r.data.name || r.data.first_name + ' ' + r.data.last_name || r.id} ({r.id})
                             </option>
                           ))}
                      </select>
                    ) : isFormulary ? (
                      <div className="bg-amber-50/40 p-2 rounded border border-amber-200">
                        <div className="flex items-center justify-between text-[10px] font-mono text-amber-700 mb-0.5 font-bold">
                          <span>Formula Calculated</span>
                          <span>{field.formula}</span>
                        </div>
                        <input
                          type="text"
                          disabled
                          placeholder="Automatically computed on save"
                          className="w-full bg-slate-100 border border-slate-200 text-slate-500 rounded px-2 py-1 text-[11px] cursor-not-allowed font-semibold h-7"
                        />
                      </div>
                    ) : (
                      <input
                        type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : 'text'}
                        disabled={isLocked}
                        required={field.required && !isLocked}
                        value={formData[field.id] !== undefined ? formData[field.id] : ''}
                        onChange={e => {
                          const val = field.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value;
                          setFormData(prev => ({ ...prev, [field.id]: val }));
                        }}
                        className="w-full bg-white disabled:bg-slate-50 disabled:text-slate-450 disabled:border-slate-150 border border-slate-250 rounded px-2 py-1 text-[11px] focus:ring-1 focus:ring-slate-700 outline-none h-7"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end space-x-2 pt-3 mt-4 border-t border-slate-150">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 bg-indigo-650 hover:bg-indigo-600 text-white text-[10px] uppercase font-bold tracking-wide rounded cursor-pointer border border-indigo-600"
              >
                Save Row
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
