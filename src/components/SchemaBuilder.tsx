/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import { CRMObject, CRMField, CRMFieldType, SystemLog, User, Role } from '../types';
import { DBConfig, cloudSaveObject } from '../utils/dbAdapters';

interface SchemaBuilderProps {
  objects: CRMObject[];
  setObjects: React.Dispatch<React.SetStateAction<CRMObject[]>>;
  addLog: (log: SystemLog) => void;
  currentUser: User;
  roles: Role[];
  dbConfig?: DBConfig;
}

export default function SchemaBuilder({ objects, setObjects, addLog, currentUser, roles, dbConfig }: SchemaBuilderProps) {
  const userRole = roles?.find(r => r.id === currentUser?.roleId);
  const isAdmin = userRole ? userRole.isAdmin : true;

  const [selectedObjectId, setSelectedObjectId] = useState<string>('accounts');
  const [activeSubTab, setActiveSubTab] = useState<'fields' | 'erd'>('fields');
  
  // Custom Object Creator State
  const [showObjectModal, setShowObjectModal] = useState(false);
  const [objLabel, setObjLabel] = useState('');
  const [objLabelPlural, setObjLabelPlural] = useState('');
  const [objIcon, setObjIcon] = useState('Cpu');
  
  // Custom Field Creator State
  const [showFieldForm, setShowFieldForm] = useState(false);
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldType, setFieldType] = useState<CRMFieldType>('text');
  const [fieldOptions, setFieldOptions] = useState(''); 
  const [fieldFormula, setFieldFormula] = useState('');
  const [fieldRelatedTo, setFieldRelatedTo] = useState('accounts');

  const selectedObject = objects.find(o => o.id === selectedObjectId) || objects[0];

  // Icons options for custom objects
  const iconOptions = ['Cpu', 'Building2', 'Users', 'Briefcase', 'CheckSquare', 'Layers', 'Target', 'Settings', 'Activity', 'Award'];

  // Handle Custom Object Creation
  const handleCreateObject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('[Metadata Security Block] Unauthorized Operation: Only System Administrators can define new custom objects.');
      return;
    }
    if (!objLabel || !objLabelPlural) return;

    // Standard Salesforce custom suffix __c
    const id = objLabel.toLowerCase().trim().replace(/[^a-z0-9]/g, '_') + '__c';
    
    // Duplicate check
    if (objects.some(o => o.id === id)) {
      alert('An object with that name already exists!');
      return;
    }

    const newObj: CRMObject = {
      id,
      label: objLabel,
      labelPlural: objLabelPlural,
      isCustom: true,
      icon: objIcon,
      fields: [
        { id: 'name', name: 'name', label: `${objLabel} Name`, type: 'text', required: true },
        { id: 'status', name: 'status', label: 'Status', type: 'picklist', required: true, defaultValue: 'New', options: ['New', 'Active', 'Archived'] }
      ]
    };

    setObjects(prev => [...prev, newObj]);
    setSelectedObjectId(id);

    // Save to remote Database if active
    if (dbConfig && dbConfig.provider !== 'localStorage') {
      cloudSaveObject(dbConfig, newObj)
        .then(() => {
          addLog({
            id: `cloud-obj-save-${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: 'info',
            message: `[Cloud DB Sync] Synchronized metadata object "${newObj.label}" (${newObj.id}) with live active DB.`,
            payload: `DB Engine: ${dbConfig.provider.toUpperCase()}`
          });
        })
        .catch(err => {
          addLog({
            id: `cloud-obj-err-${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: 'info',
            message: `[Cloud DB error] Failed syncing schema object "${newObj.id}":`,
            payload: err.message || err
          });
        });
    }
    
    // Log Postgres Simulation
    const timestamp = new Date().toISOString();
    addLog({
      id: `sql-create-table-${Date.now()}`,
      timestamp,
      type: 'sql',
      message: `[PostgreSQL Schema Engine] Executed Table Creation for Custom CRM Object: "${objLabel}"`,
      sqlQuery: `CREATE TABLE IF NOT EXISTS public.${id} (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  data JSONB NOT NULL DEFAULT '{}'::jsonb,\n  created_at TIMESTAMPTZ DEFAULT NOW(),\n  updated_at TIMESTAMPTZ DEFAULT NOW()\n);\n\n-- Create indices for performant lookups inside the JSONB structure\nCREATE INDEX idx_${id.replace('__c', '')}_data ON public.${id} USING gin (data);`
    });

    addLog({
      id: `log-create-obj-${Date.now()}`,
      timestamp,
      type: 'info',
      message: `[Metadata Engine] Registered major capability container object: "${objLabel}" (${id})`,
    });

    // Reset Form
    setObjLabel('');
    setObjLabelPlural('');
    setObjIcon('Cpu');
    setShowObjectModal(false);
  };

  // Handle Custom Field Creation
  const handleCreateField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('[Metadata Security Block] Unauthorized Operation: Only System Administrators are permitted to define custom fields on schema tables.');
      return;
    }
    if (!fieldLabel) return;

    const baseName = fieldLabel.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
    const name = selectedObject.isCustom ? `${baseName}__c` : baseName;
    const id = name;

    // Check Duplicate
    if (selectedObject.fields.some(f => f.id === id)) {
      alert('This field name already exists on this object!');
      return;
    }

    const optionsList = fieldOptions.split(',').map(o => o.trim()).filter(Boolean);

    const newField: CRMField = {
      id,
      name,
      label: fieldLabel,
      type: fieldType,
      required: false,
      ...(fieldType === 'picklist' && { options: optionsList.length ? optionsList : ['Option A', 'Option B'] }),
      ...(fieldType === 'formula' && { formula: fieldFormula }),
      ...(fieldType === 'lookup' && { relatedTo: fieldRelatedTo })
    };

    const updatedObj = {
      ...selectedObject,
      fields: [...selectedObject.fields, newField]
    };

    setObjects(prev => prev.map(obj => {
      if (obj.id === selectedObject.id) {
        return updatedObj;
      }
      return obj;
    }));

    if (dbConfig && dbConfig.provider !== 'localStorage') {
      cloudSaveObject(dbConfig, updatedObj)
        .then(() => {
          addLog({
            id: `cloud-fld-save-${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: 'info',
            message: `[Cloud DB Sync] Saved updated structural fields for "${selectedObject.label}" to live DB.`,
            payload: `Injected field index: ${id}`
          });
        })
        .catch(err => {
          addLog({
            id: `cloud-obj-err-${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: 'info',
            message: `[Cloud DB Error] Failed to upload field dictionary updates to live DB:`,
            payload: err.message || err
          });
        });
    }

    // Log Event
    const timestamp = new Date().toISOString();
    addLog({
      id: `sql-alter-table-${Date.now()}`,
      timestamp,
      type: 'sql',
      message: `[PostgreSQL Schema Engine] Appending Field Metacard to "${selectedObject.id}" JSONB Schema`,
      sqlQuery: `-- Simulating virtual JSONB dynamic field declaration \nALTER TABLE public.${selectedObject.id} \nADD CONSTRAINT check_${selectedObject.id.replace('__c', '')}_${id} \nCHECK (jsonb_typeof(data -> '${id}') IS NOT NULL OR data -> '${id}' IS NULL);\n\nCOMMENT ON COLUMN public.${selectedObject.id}.data IS 'Contains dynamic virtual path details. Field path definition: ${JSON.stringify(newField)}';`
    });

    addLog({
      id: `log-field-create-${Date.now()}`,
      timestamp,
      type: 'info',
      message: `[Metadata Manager] Configured new field "${fieldLabel}" (${fieldType}) on object "${selectedObject.label}"`
    });

    // Reset Field Form
    setFieldLabel('');
    setFieldType('text');
    setFieldOptions('');
    setFieldFormula('');
    setFieldRelatedTo('accounts');
    setShowFieldForm(false);
  };

  // Handle Field Deletion safely
  const handleDeleteField = (fieldId: string) => {
    if (fieldId === 'name' || fieldId === 'status') {
      alert('Standard identifier fields cannot be deleted.');
      return;
    }

    const updatedObj = {
      ...selectedObject,
      fields: selectedObject.fields.filter(f => f.id !== fieldId)
    };

    setObjects(prev => prev.map(obj => {
      if (obj.id === selectedObject.id) {
        return updatedObj;
      }
      return obj;
    }));

    if (dbConfig && dbConfig.provider !== 'localStorage') {
      cloudSaveObject(dbConfig, updatedObj)
        .then(() => {
          addLog({
            id: `cloud-fld-del-${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: 'info',
            message: `[Cloud DB Sync] Deleted field "${fieldId}" from remote custom metadata "${selectedObject.id}".`
          });
        })
        .catch(err => {
          console.error('[Cloud DB Sync error]', err);
        });
    }

    const timestamp = new Date().toISOString();
    addLog({
      id: `log-field-delete-${Date.now()}`,
      timestamp,
      type: 'info',
      message: `[Metadata Manager] Removed field "${fieldId}" from Object "${selectedObject.label}"`
    });
  };

  // ERD Diagram Math Helper Coordinates
  const getERDCoordinates = () => {
    // Generate static visual coordinates for objects to render boxes in beautiful order
    const coords: Record<string, { x: number; y: number }> = {
      accounts: { x: 320, y: 180 },
      contacts: { x: 50, y: 300 },
      opportunities: { x: 590, y: 50 },
      leads: { x: 50, y: 50 },
      tasks: { x: 590, y: 300 },
      equipments__c: { x: 320, y: 430 }
    };

    // If there are custom user objects, spread them nicely in coordinates
    let index = 0;
    objects.forEach(obj => {
      if (!(obj.id in coords)) {
        coords[obj.id] = {
          x: 220 + (index % 2) * 200,
          y: 50 + (Math.floor(index / 2) * 120) // Fit nicely
        };
        index++;
      }
    });

    return coords;
  };

  const erdCoords = getERDCoordinates();

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-slate-50 overflow-hidden" id="schema-builder-root">
      
      {/* Objects Panel Sidebar */}
      <div className="w-56 border-r border-slate-200 bg-white flex flex-col shrink-0 h-full">
        <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">Relational Stores</span>
            <h3 className="text-xs font-bold text-slate-850">Models list</h3>
          </div>
          <button
            onClick={() => {
              if (!isAdmin) {
                alert('[Metadata Security Block] Unauthorized: Custom object definitions are restricted to System Administrators.');
                return;
              }
              setShowObjectModal(true);
            }}
            className={`p-1 px-1.5 rounded text-[10px] uppercase font-bold tracking-tight flex items-center space-x-1 transition cursor-pointer border ${
              isAdmin 
                ? 'bg-indigo-650 hover:bg-indigo-600 border-indigo-600 text-white' 
                : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
            }`}
          >
            {isAdmin ? <Icons.Plus className="h-3 w-3" /> : <Icons.Lock className="h-3 w-3" />}
            <span>Create</span>
          </button>
        </div>

        {/* Object selection list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {objects.map(obj => {
            const IconComponent = (Icons as any)[obj.icon] || Icons.HelpCircle;
            const isSelected = obj.id === selectedObjectId;

            return (
              <button
                key={obj.id}
                onClick={() => { setSelectedObjectId(obj.id); setShowFieldForm(false); }}
                className={`w-full text-left flex items-center space-x-2 p-2 rounded transition ${
                  isSelected
                    ? 'bg-slate-105 text-slate-900 border-l-[3px] border-indigo-650 font-bold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-[3px] border-transparent'
                }`}
              >
                <div className={`p-1 rounded ${isSelected ? 'bg-indigo-650 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <IconComponent className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold truncate leading-none text-slate-800">{obj.label}</span>
                    <span className={`text-[8px] px-1 rounded font-bold uppercase leading-none ${
                      obj.isCustom ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400'
                    }`}>
                      {obj.isCustom ? 'Custom' : 'Std'}
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-450 block truncate leading-none mt-0.5">
                    {obj.fields.length} attributes
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Builder Panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Sub-header navigation tabs */}
        <div className="bg-white border-b border-slate-200 px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="p-2 bg-slate-900 text-white rounded">
              {React.createElement((Icons as any)[selectedObject.icon] || Icons.Cpu, { className: 'h-4 w-4' })}
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h2 className="text-xs font-bold text-slate-900 tracking-tight">{selectedObject.label} Table Structure</h2>
                <span className="text-[9px] font-mono text-slate-400">({selectedObject.id})</span>
              </div>
              <p className="text-slate-500 text-[10px] leading-none">Database storage format: JSONB dynamic document attributes</p>
            </div>
          </div>

          <div className="flex bg-slate-100 p-0.5 rounded border border-slate-200 shrink-0 self-start sm:self-auto h-7 items-center">
            <button
              onClick={() => setActiveSubTab('fields')}
              className={`p-1 px-3 rounded text-[10px] font-bold flex items-center space-x-1 transition leading-none ${
                activeSubTab === 'fields'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icons.Settings className="h-3 w-3" />
              <span>Attributes</span>
            </button>
            <button
              onClick={() => setActiveSubTab('erd')}
              className={`p-1 px-3 rounded text-[10px] font-bold flex items-center space-x-1 transition leading-none ${
                activeSubTab === 'erd'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icons.Workflow className="h-3 w-3" />
              <span>ERD Lookups</span>
            </button>
          </div>
        </div>

        {/* Dynamic Builder Area */}
        <div className="flex-1 overflow-y-auto p-3">
          {!isAdmin && (
            <div className="mb-3 bg-amber-50 border border-amber-200 rounded p-2.5 text-[10px] text-amber-700 flex items-start gap-1.5 font-medium shadow-xs">
              <Icons.ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-slate-900 mb-0.5">Metadata Security Shield Active</strong>
                You are currently impersonating <span className="font-bold text-indigo-700">"{currentUser.name}"</span> who belongs to a standard read-only profile. Schema metadata modification controls, custom field attributes extensions, and DB object definitions are locked.
              </div>
            </div>
          )}
          {activeSubTab === 'fields' ? (
            <div className="space-y-3">
              
              {/* Field creation card or field manager list */}
              <div className="bg-white border border-slate-205 rounded shadow-sm overflow-hidden">
                <div className="p-3 border-b border-slate-150 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Schema Attributes</h4>
                    <p className="text-slate-400 text-[10px]">Virtual properties index fields defined on relational records</p>
                  </div>
                  <button
                    onClick={() => {
                      if (!isAdmin) {
                        alert('[Metadata Security Block] Unauthorized: Adding custom attributes is restricted to System Administrators.');
                        return;
                      }
                      setShowFieldForm(!showFieldForm);
                    }}
                    className={`px-2.5 py-1 rounded text-[10px] uppercase font-bold tracking-wider flex items-center space-x-1 transition cursor-pointer border h-7 ${
                      isAdmin 
                        ? 'bg-indigo-650 hover:bg-indigo-600 border-indigo-600 text-white' 
                        : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                    }`}
                  >
                    {isAdmin ? <Icons.Plus className="h-3 w-3" /> : <Icons.Lock className="h-3 w-3" />}
                    <span>Create Field</span>
                  </button>
                </div>

                {/* Inline Field Form */}
                {showFieldForm && (
                  <form onSubmit={handleCreateField} className="p-3 bg-slate-50 border-b border-slate-205 grid grid-cols-1 md:grid-cols-4 gap-3 animate-fadeIn">
                    <div className="md:col-span-1 space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Field Label</label>
                      <input
                        type="text"
                        required
                        value={fieldLabel}
                        onChange={e => setFieldLabel(e.target.value)}
                        placeholder="e.g. Sales Credit"
                        className="w-full bg-white border border-slate-250 rounded px-2 py-1 text-[11px] focus:ring-1 focus:ring-slate-700 outline-none h-7"
                      />
                    </div>

                    <div className="md:col-span-1 space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Data Type</label>
                      <select
                        value={fieldType}
                        onChange={e => setFieldType(e.target.value as CRMFieldType)}
                        className="w-full bg-white border border-slate-250 rounded px-2 py-1 text-[11px] focus:ring-1 focus:ring-slate-700 outline-none h-7"
                      >
                        <option value="text">Text (varchar)</option>
                        <option value="number">Number (float)</option>
                        <option value="email">Email</option>
                        <option value="picklist">Picklist (ENUM select)</option>
                        <option value="formula">Calculated Formula</option>
                        <option value="lookup">Lookup Relationship</option>
                      </select>
                    </div>

                    {/* Conditional types options */}
                    {fieldType === 'picklist' && (
                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase">ENUM Options (Comma separated)</label>
                        <input
                          type="text"
                          required
                           value={fieldOptions}
                          onChange={e => setFieldOptions(e.target.value)}
                          placeholder="High, Medium, Low, Critical"
                          className="w-full bg-white border border-slate-250 rounded px-2 py-1 text-[11px] focus:ring-1 focus:ring-slate-700 outline-none h-7"
                        />
                      </div>
                    )}

                    {fieldType === 'formula' && (
                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase font-bold flex items-center justify-between">
                          <span>Formula calculation string</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={fieldFormula}
                          onChange={e => setFieldFormula(e.target.value)}
                          placeholder="e.g. {revenue} * 0.15"
                          className="w-full bg-white border border-slate-250 rounded px-2 py-1 text-[11px] focus:ring-1 focus:ring-slate-700 outline-none h-7 font-mono text-amber-700"
                        />
                      </div>
                    )}

                    {fieldType === 'lookup' && (
                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase">Target Object Lookup</label>
                        <select
                          value={fieldRelatedTo}
                          onChange={e => setFieldRelatedTo(e.target.value)}
                          className="w-full bg-white border border-slate-250 rounded px-2 py-1 text-[11px] focus:ring-1 focus:ring-slate-700 outline-none h-7"
                        >
                          {objects.map(o => (
                            <option key={o.id} value={o.id}>{o.label} ({o.id})</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {!['picklist', 'formula', 'lookup'].includes(fieldType) && (
                      <div className="md:col-span-2 flex items-end">
                        <span className="text-[10px] text-slate-400 mb-1">Standard JSONB key value casting applied.</span>
                      </div>
                    )}

                    <div className="md:col-span-4 flex justify-end space-x-1.5 pt-2 border-t border-slate-205">
                      <button
                        type="button"
                        onClick={() => setShowFieldForm(false)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 bg-indigo-650 hover:bg-indigo-600 text-white rounded text-[10px] uppercase font-bold tracking-wider cursor-pointer border border-indigo-600"
                      >
                        Save Attribute
                      </button>
                    </div>
                  </form>
                )}

                {/* Fields Table */}
                <div className="divide-y divide-slate-100 overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[9px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                        <th className="p-2 pl-3">Label / Name</th>
                        <th className="p-2">JSONB Key</th>
                        <th className="p-2">Cast Data Type</th>
                        <th className="p-2">Attributes / Parameters</th>
                        <th className="p-2 pr-3 text-right">Operations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 text-[11px]">
                      {selectedObject.fields.map(field => (
                        <tr key={field.id} className="hover:bg-slate-50/55">
                          <td className="p-2 pl-3">
                            <div className="font-bold text-slate-900 flex items-center space-x-1">
                              <span>{field.label}</span>
                              {field.required && (
                                <span className="text-rose-500" title="Required">*</span>
                              )}
                            </div>
                          </td>
                          <td className="p-2 font-mono text-[10px] text-slate-500">
                            {field.name}
                          </td>
                          <td className="p-2">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase leading-none border ${
                              field.type === 'lookup' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                              field.type === 'formula' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                              field.type === 'picklist' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                              'bg-slate-50 text-slate-600 border-slate-150'
                            }`}>
                              {field.type}
                            </span>
                          </td>
                          <td className="p-2 text-slate-500">
                            {field.type === 'picklist' && (
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {field.options?.map((opt, i) => (
                                  <span key={i} className="text-[9px] bg-slate-100 rounded px-1.5 font-semibold text-slate-600 border border-slate-150">{opt}</span>
                                ))}
                              </div>
                            )}
                            {field.type === 'formula' && (
                              <div className="flex items-center space-x-1 text-amber-700 font-mono text-[10px] bg-amber-50/40 p-0.5 px-1.5 rounded border border-amber-200">
                                <Icons.Cpu className="h-3 w-3 shrink-0" />
                                <span className="font-bold">{field.formula}</span>
                              </div>
                            )}
                            {field.type === 'lookup' && (
                              <div className="flex items-center space-x-1 text-indigo-700 font-semibold text-[10px] bg-indigo-50/40 p-0.5 px-1.5 rounded border border-indigo-150">
                                <Icons.ArrowRight className="h-3 w-3 shrink-0" />
                                <span>Ref table: &quot;{field.relatedTo}&quot;</span>
                              </div>
                            )}
                            {!['picklist', 'formula', 'lookup'].includes(field.type) && (
                              <span className="text-[10px] text-slate-400">Default parsing</span>
                            )}
                          </td>
                          <td className="p-2 pr-3 text-right">
                            {['name', 'status'].includes(field.id) ? (
                              <span className="text-[9px] text-slate-400 font-bold italic">Primary</span>
                            ) : (
                              <button
                                onClick={() => handleDeleteField(field.id)}
                                className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 p-1 rounded transition"
                                title="Delete Custom Attribute"
                              >
                                <Icons.Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-2 px-3 bg-slate-50/50 border-t border-slate-150 text-[10px] text-slate-400 font-semibold flex items-center space-x-1">
                  <Icons.Info className="h-3 w-3 text-slate-400" />
                  <span>The primary identifier `{selectedObject.fields[0]?.id}` serves as the lookup key mapping throughout related indices.</span>
                </div>
              </div>
            </div>
          ) : (
            /* Visual ERD Schema Layout using mathematical lines connecting nodes */
            <div className="bg-slate-900 border border-slate-800 rounded p-3 min-h-[480px] h-[calc(100vh-11rem)] overflow-y-auto overflow-x-auto relative shadow-inner">
              <div className="absolute inset-x-0 bottom-2 text-center pointer-events-none z-10 text-[9px] text-slate-500 font-semibold">
                <span>Inter-entity Lookup relationships drawn instantly from active schema metadata</span>
              </div>

              {/* Render SVG wires */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 min-w-[700px] min-h-[440px]">
                <defs>
                  <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#10B981" />
                  </marker>
                  <marker id="arrow-selected" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#6366F1" />
                  </marker>
                </defs>

                {objects.map(obj => {
                  const sourceCoord = erdCoords[obj.id] || { x: 50, y: 50 };

                  return obj.fields.map(f => {
                    if (f.type === 'lookup' && f.relatedTo && f.relatedTo in erdCoords) {
                      const targetCoord = erdCoords[f.relatedTo];
                      
                      const startX = sourceCoord.x + 80;
                      const startY = sourceCoord.y + 40;
                      const endX = targetCoord.x + 80;
                      const endY = targetCoord.y + 40;

                      const isCurrentSelected = obj.id === selectedObjectId || f.relatedTo === selectedObjectId;
                      const controlX = (startX + endX) / 2;
                      const controlY = (startY + endY) / 2 + (startX < endX ? 25 : -25);

                      return (
                        <g key={`${obj.id}-${f.id}`}>
                          <path
                            d={`M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`}
                            fill="none"
                            stroke={isCurrentSelected ? '#6366F1' : '#475569'}
                            strokeWidth={isCurrentSelected ? '2' : '1'}
                            strokeDasharray={isCurrentSelected ? 'none' : '3, 3'}
                            markerEnd={isCurrentSelected ? 'url(#arrow-selected)' : 'url(#arrow)'}
                            className="transition-all duration-300"
                          />
                          <foreignObject x={controlX - 50} y={controlY - 8} width="100" height="15" className="pointer-events-none">
                            <span className="text-[7px] bg-slate-950/90 text-slate-400 font-mono px-1 rounded inline-block text-center w-full truncate border border-slate-850">
                              {f.label}
                            </span>
                          </foreignObject>
                        </g>
                      );
                    }
                    return null;
                  });
                })}
              </svg>

              {/* Draw Object blocks */}
              <div className="absolute inset-0 pointer-events-none z-10 min-w-[700px] min-h-[440px]">
                {objects.map(obj => {
                  const coords = erdCoords[obj.id] || { x: 50, y: 50 };
                  const isSelected = obj.id === selectedObjectId;
                  const Icon = (Icons as any)[obj.icon] || Icons.Cpu;

                  return (
                    <div
                      key={obj.id}
                      onClick={() => setSelectedObjectId(obj.id)}
                      className={`absolute pointer-events-auto w-40 p-2 bg-slate-950 border rounded select-none cursor-pointer transition-all duration-300 shadow-xl ${
                        isSelected
                          ? 'border-indigo-500 shadow-indigo-550/10 ring-1 ring-indigo-500/20'
                          : 'border-slate-800 hover:border-slate-700'
                      }`}
                      style={{ left: `${coords.x}px`, top: `${coords.y}px` }}
                    >
                      <div className="flex items-center justify-between border-b border-slate-850 pb-1 mb-1.5">
                        <div className="flex items-center space-x-1.5 min-w-0">
                          <div className={`p-0.5 rounded border text-[11px] shrink-0 ${isSelected ? 'text-indigo-400 border-indigo-500/20 bg-slate-900' : 'text-slate-400 border-slate-850 bg-slate-900'}`}>
                            <Icon className="h-3 w-3" />
                          </div>
                          <span className="text-[9px] font-extrabold text-slate-100 uppercase truncate leading-none">{obj.label}</span>
                        </div>
                        <span className="text-[7px] text-slate-500 uppercase font-mono">{obj.isCustom ? '__c' : 'std'}</span>
                      </div>
                      
                      {/* summary fields list */}
                      <div className="space-y-0.5">
                        {obj.fields.map(f => (
                          <div key={f.id} className="flex justify-between items-center text-[8px] text-slate-400 leading-none py-0.5">
                            <span className="truncate max-w-[90px]">{f.label}</span>
                            <span className="text-[7px] font-mono text-slate-500">{f.type === 'lookup' ? 'id' : f.type}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Object creation Modal Backdrop */}
      {showObjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs">
          <form onSubmit={handleCreateObject} className="bg-white rounded w-full max-w-sm p-4 border border-slate-200 shadow-2xl relative">
            <h4 className="text-xs font-extrabold text-slate-905 border-b border-slate-100 pb-1.5 mb-2 flex items-center justify-between">
              <span>NEW CRM METADATA TABLE</span>
              <button type="button" onClick={() => setShowObjectModal(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
            </h4>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase">Singular Name (Label)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shipment"
                  value={objLabel}
                  onChange={e => {
                    setObjLabel(e.target.value);
                    if (!objLabelPlural) setObjLabelPlural(e.target.value + 's');
                  }}
                  className="w-full border border-slate-250 rounded px-2 py-1 text-[11px] outline-none h-7 focus:ring-1 focus:ring-slate-700"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase">Plural Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shipments"
                  value={objLabelPlural}
                  onChange={e => setObjLabelPlural(e.target.value)}
                  className="w-full border border-slate-250 rounded px-2 py-1 text-[11px] outline-none h-7 focus:ring-1 focus:ring-slate-700"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase">Interface Icon Mapping</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {iconOptions.map(iconStr => {
                    const IconComp = (Icons as any)[iconStr] || Icons.Cpu;
                    const isSelected = objIcon === iconStr;

                    return (
                      <button
                        type="button"
                        key={iconStr}
                        onClick={() => setObjIcon(iconStr)}
                        className={`p-1.5 bg-slate-50 hover:bg-slate-100 border rounded flex items-center justify-center transition cursor-pointer ${
                          isSelected
                            ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50'
                            : 'border-slate-200 text-slate-500'
                        }`}
                      >
                        <IconComp className="h-3.5 w-3.5" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 mt-4 border-t border-slate-150">
              <button
                type="button"
                onClick={() => setShowObjectModal(false)}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 bg-indigo-650 hover:bg-indigo-600 text-white text-[10px] uppercase font-bold tracking-wide rounded cursor-pointer border border-indigo-600"
              >
                Create DB
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
