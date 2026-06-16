/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import { Workflow, WorkflowNode, WorkflowEdge, CRMObject, SystemLog, User, Role } from '../types';
import { DBConfig, cloudSaveWorkflow } from '../utils/dbAdapters';

interface WorkflowBuilderProps {
  workflows: Workflow[];
  setWorkflows: React.Dispatch<React.SetStateAction<Workflow[]>>;
  objects: CRMObject[];
  addLog: (log: SystemLog) => void;
  currentUser: User;
  roles: Role[];
  dbConfig?: DBConfig;
}

export default function WorkflowBuilder({ workflows, setWorkflows, objects, addLog, currentUser, roles, dbConfig }: WorkflowBuilderProps) {
  const userRole = roles?.find(r => r.id === currentUser?.roleId);
  const isAdmin = userRole ? userRole.isAdmin : true;

  // Real-time workflow cloud synchronizer helper
  const syncWf = (updatedWf: Workflow) => {
    if (dbConfig && dbConfig.provider !== 'localStorage') {
      cloudSaveWorkflow(dbConfig, updatedWf)
        .then(() => {
          addLog({
            id: `cloud-wf-sync-${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: 'info',
            message: `[Cloud DB Sync] Saved "${updatedWf.name}" workflow pipeline parameters directly to active remote DB.`
          });
        })
        .catch(err => {
          console.error('[Cloud Sync Error] syncWf:', err);
        });
    }
  };

  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('wf1');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('node-trigger');

  const selectedWorkflow = workflows.find(wf => wf.id === selectedWorkflowId) || workflows[0];

  // Selected Node configuration
  const selectedNode = selectedWorkflow.nodes.find(n => n.id === selectedNodeId);

  // Toggle active flow state
  const handleToggleActive = () => {
    if (!isAdmin) {
      alert('[Workflow Security Block] Unauthorized: Toggling workflow active state is restricted to System Administrators.');
      return;
    }
    const nextState = !selectedWorkflow.isActive;
    const updated = {
      ...selectedWorkflow,
      isActive: nextState
    };
    setWorkflows(prev => prev.map(wf => {
      if (wf.id === selectedWorkflow.id) {
        addLog({
          id: `wf-toggle-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'info',
          message: `[Workflow Engine] Set Flow '${wf.name}' Status = ${nextState ? 'ACTIVE' : 'INACTIVE'}`
        });
        return updated;
      }
      return wf;
    }));
    syncWf(updated);
  };

  // Node parameter updater
  const handleUpdateNodeConfig = (nodeId: string, updatedConfig: any) => {
    if (!isAdmin) {
      alert('[Workflow Security Block] Unauthorized: Modifying workflow node parameters is restricted to System Administrators.');
      return;
    }
    const updated = {
      ...selectedWorkflow,
      nodes: selectedWorkflow.nodes.map(n => n.id === nodeId ? { ...n, config: { ...n.config, ...updatedConfig } } : n)
    };
    setWorkflows(prev => prev.map(wf => {
      if (wf.id === selectedWorkflow.id) {
        return updated;
      }
      return wf;
    }));
    syncWf(updated);
  };

  // Quick-append a new Action node to the visual chain
  const handleAddActionNode = () => {
    if (!isAdmin) {
      alert('[Workflow Security Block] Unauthorized: Adding workflow execution nodes is restricted to System Administrators.');
      return;
    }
    // Generate fresh unique ID
    const newNodeId = `node-act-new-${Math.random().toString(36).substr(2, 5)}`;
    
    // Find the current last action node (which has no target edge, or we append to the bottom of the list)
    // To make it easy and predictable for users, find where of the edges there are no matches, or just general topological append
    const currentActionNodes = selectedWorkflow.nodes.filter(n => n.type === 'action');
    const lastNode = currentActionNodes[currentActionNodes.length - 1] || selectedWorkflow.nodes[0];

    const newNode: WorkflowNode = {
      id: newNodeId,
      type: 'action',
      label: 'Action: New Log Event',
      description: 'Custom added event execution step',
      position: { x: lastNode.position.x, y: lastNode.position.y + 110 },
      config: {
        type: 'log_event',
        logMessage: 'Database sub-routine triggered: Step complete.'
      }
    };

    const newEdge: WorkflowEdge = {
      id: `edge-new-${Math.random().toString(36).substr(2, 5)}`,
      source: lastNode.id,
      target: newNodeId
    };

    const updated = {
      ...selectedWorkflow,
      nodes: [...selectedWorkflow.nodes, newNode],
      edges: [...selectedWorkflow.edges, newEdge]
    };

    setWorkflows(prev => prev.map(wf => {
      if (wf.id === selectedWorkflow.id) {
        return updated;
      }
      return wf;
    }));

    setSelectedNodeId(newNodeId);
    syncWf(updated);

    addLog({
      id: `wf-node-add-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'info',
      message: `[Workflow Engine] Appended Node '${newNode.label}' to active execution script '${selectedWorkflow.name}'`
    });
  };

  // Delete last action node
  const handleDeleteNode = (nodeId: string) => {
    if (!isAdmin) {
      alert('[Workflow Security Block] Unauthorized: Deleting workflow execution nodes is restricted to System Administrators.');
      return;
    }
    if (nodeId === 'node-trigger') {
      alert('The root Trigger Node cannot be deleted.');
      return;
    }

    const updated = {
      ...selectedWorkflow,
      nodes: selectedWorkflow.nodes.filter(n => n.id !== nodeId),
      edges: selectedWorkflow.edges.filter(e => e.source !== nodeId && e.target !== nodeId)
    };

    setWorkflows(prev => prev.map(wf => {
      if (wf.id === selectedWorkflow.id) {
        return updated;
      }
      return wf;
    }));

    setSelectedNodeId('node-trigger');
    syncWf(updated);
    addLog({
      id: `wf-node-del-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'info',
      message: `[Workflow Engine] Removed node '${nodeId}' from visual chain.`
    });
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-slate-50 overflow-hidden" id="workflow-builder-root">
      
      {/* Workflows Select Drawer */}
      <div className="w-52 border-r border-slate-200 bg-white flex flex-col shrink-0 h-full">
        <div className="p-3 border-b border-slate-200 bg-slate-50/50">
          <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">Automation Rules</span>
          <h3 className="text-xs font-bold text-slate-800">Visual Flows</h3>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {workflows.map(wf => (
            <button
              key={wf.id}
              onClick={() => { setSelectedWorkflowId(wf.id); setSelectedNodeId('node-trigger'); }}
              className={`w-full text-left p-2 rounded transition border ${
                wf.id === selectedWorkflowId
                  ? 'bg-slate-900 text-white border-slate-950 shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold truncate leading-none">{wf.name}</span>
                <span className={`text-[8px] font-bold uppercase px-1 rounded leading-none shrink-0 ${
                  wf.isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-slate-200 text-slate-500'
                }`}>
                  {wf.isActive ? 'Active' : 'Draft'}
                </span>
              </div>
              <p className={`text-[9px] leading-none ${wf.id === selectedWorkflowId ? 'text-slate-400': 'text-slate-505'}`}>
                Target: <span className="font-mono font-bold uppercase">{wf.objectId}</span>
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Visual Canvas Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* Header toolbar */}
        <div className="bg-white border-b border-slate-200 px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
          <div className="space-y-0.5">
            <h2 className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
              <Icons.Workflow className="h-3.5 w-3.5 text-indigo-500" />
              <span>{selectedWorkflow.name}</span>
            </h2>
            <p className="text-slate-500 text-[10px] truncate max-w-xl">{selectedWorkflow.description}</p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* Active Toggle Switch */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded border border-slate-200 h-7">
              <span className="text-[9px] font-bold text-slate-550 uppercase px-1.5">Flow Status</span>
              <button
                onClick={handleToggleActive}
                className={`p-1 px-2.5 rounded text-[10px] font-extrabold flex items-center space-x-1 transition cursor-pointer leading-none h-5 ${
                  selectedWorkflow.isActive
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-200 text-slate-705'
                }`}
              >
                {selectedWorkflow.isActive ? <Icons.Check className="h-3 w-3" /> : null}
                <span>{selectedWorkflow.isActive ? 'ACTIVE' : 'DRAFT'}</span>
              </button>
            </div>
          </div>
        </div>

        {!isAdmin && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-[10px] text-amber-750 flex items-start gap-1 font-medium shrink-0 shadow-inner">
            <Icons.ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900 mr-2">Workflow Security Active</strong>
              You are impersonating <span className="font-bold text-indigo-700">"{currentUser.name}"</span>. Active workflow toggling, node structure customization, and parameter inspector edits are read-only.
            </div>
          </div>
        )}

        {/* Visual node flowchart layout */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Scrollable Visual Workspace */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-950 flex flex-col items-center select-none min-h-[400px]">
            <div className="relative w-full max-w-sm flex flex-col items-center space-y-10 z-10" id="flow-node-chain">
              
              {/* Dynamic Connecting Lines */}
              <div className="absolute inset-x-0 top-0 bottom-0 flex justify-center z-0 pointer-events-none">
                <div className="w-0.5 bg-slate-800 h-full border-dashed" />
              </div>

              {selectedWorkflow.nodes.map((node, idx) => {
                const isSelected = node.id === selectedNodeId;
                const isTrigger = node.type === 'trigger';
                
                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`relative z-10 w-64 p-2.5 bg-slate-900 border text-white rounded cursor-pointer transition-all duration-300 ${
                      isSelected
                        ? 'border-indigo-400 ring-1 ring-indigo-550 shadow-xl'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5 mb-1.5">
                      <div className="flex items-center space-x-1.5">
                        <div className={`p-0.5 rounded ${isTrigger ? 'bg-indigo-500/10 text-indigo-400': 'bg-emerald-500/10 text-emerald-400'}`}>
                          {isTrigger ? <Icons.Play className="h-3 w-3" /> : <Icons.Settings className="h-3 w-3" />}
                        </div>
                        <span className="text-[8px] uppercase tracking-wider font-bold text-slate-400">
                          {isTrigger ? 'Trigger': 'Action Block'}
                        </span>
                      </div>
                      
                      {/* Delete node option */}
                      {!isTrigger && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteNode(node.id); }}
                          className="text-slate-500 hover:text-rose-450 p-0.5 rounded hover:bg-slate-800 transition"
                          title="Delete Action step"
                        >
                          <Icons.Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    <h4 className="text-[11px] font-bold text-slate-100">{node.label}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">{node.description}</p>
                    
                    {/* Badge details depending on dynamic config */}
                    <div className="mt-2 text-[9px] font-mono text-slate-300 bg-slate-950/70 p-1 px-1.5 rounded border border-slate-800 truncate">
                      {isTrigger ? (
                        <span>IF {node.config.fieldId || 'Value'} {node.config.operator} {node.config.value}</span>
                      ) : (
                        <span>Type: {node.config.type}</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Action Quick-Add Button at bottom */}
              <button
                onClick={() => {
                  if (!isAdmin) {
                    alert('[Workflow Security Block] Unauthorized: Adding workflow execution steps is restricted to System Administrators.');
                    return;
                  }
                  handleAddActionNode();
                }}
                className={`relative z-10 p-1.5 rounded-full shadow-lg transition cursor-pointer border ${
                  isAdmin 
                    ? 'bg-indigo-650 hover:bg-indigo-600 border-indigo-600 text-white' 
                    : 'bg-slate-850 hover:bg-slate-800 border-slate-750 text-slate-400'
                }`}
                title="Append execution node step"
              >
                {isAdmin ? <Icons.Plus className="h-4 w-4" /> : <Icons.Lock className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Node attributes Editing Inspector sidebar */}
          <div className="w-56 border-l border-slate-200 bg-white flex flex-col shrink-0 h-full overflow-y-auto">
            <div className="p-3 border-b border-slate-200 flex items-center space-x-1.5 bg-slate-50/50">
              <Icons.Sliders className="h-3.5 w-3.5 text-slate-600" />
              <h3 className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">Node Inspector</h3>
            </div>

            {selectedNode ? (
              <div className="p-3 space-y-4">
                <div>
                  <h4 className="text-[11px] font-bold text-slate-900">{selectedNode.label}</h4>
                  <p className="text-[10px] text-slate-450 mt-0.5 leading-normal">{selectedNode.description}</p>
                </div>

                <fieldset disabled={!isAdmin} className="pt-2 border-t border-slate-150 space-y-3 border-none p-0 m-0 block">
                  {selectedNode.type === 'trigger' ? (
                    /* Trigger configuration details */
                    <div className="space-y-3 text-[11px]">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase">Trigger Event</label>
                        <select
                          value={selectedNode.config.type}
                          onChange={e => handleUpdateNodeConfig(selectedNode.id, { type: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-250 rounded px-2 py-1 text-[11px] outline-none h-7"
                        >
                          <option value="create">When Record is Created</option>
                          <option value="update">When Record is Updated</option>
                          <option value="all">Any Transaction</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase">Evaluated Field</label>
                        <select
                          value={selectedNode.config.fieldId || ''}
                          onChange={e => handleUpdateNodeConfig(selectedNode.id, { fieldId: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-250 rounded px-2 py-1 text-[11px] outline-none h-7"
                        >
                          <option value="">-- Always fire --</option>
                          {objects
                            .find(o => o.id === selectedWorkflow.objectId)
                            ?.fields.map(f => (
                              <option key={f.id} value={f.id}>{f.label} ({f.id})</option>
                            ))
                          }
                        </select>
                      </div>

                      {selectedNode.config.fieldId && (
                        <>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase">Operator</label>
                            <select
                              value={selectedNode.config.operator}
                              onChange={e => handleUpdateNodeConfig(selectedNode.id, { operator: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-255 rounded px-2 py-1 text-[11px] h-7"
                            >
                              <option value="equals">Equals</option>
                              <option value="changed_to">Changed To</option>
                              <option value="greater_than">Greater Than (&gt;)</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-550 uppercase">Value Target</label>
                            <input
                              type="text"
                              value={selectedNode.config.value || ''}
                              onChange={e => handleUpdateNodeConfig(selectedNode.id, { value: e.target.value })}
                              placeholder="e.g. Qualified"
                              className="w-full border border-slate-255 rounded px-2 py-1 text-[11px] focus:ring-1 focus:ring-slate-700 uppercase outline-none h-7"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    /* Action Configurations */
                    <div className="space-y-3 text-[11px]">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase">Action Execution Type</label>
                        <select
                          value={selectedNode.config.type}
                          onChange={e => handleUpdateNodeConfig(selectedNode.id, { type: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-250 rounded px-2 py-1 text-[11px] outline-none h-7"
                        >
                          <option value="log_event">Log System Console event</option>
                          <option value="create_task">Insert Automated CRM Task</option>
                          <option value="send_email">Dispatch SMTP Notification</option>
                        </select>
                      </div>

                      {selectedNode.config.type === 'log_event' && (
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-500 uppercase">Custom Log Message</label>
                          <textarea
                            required
                            rows={3}
                            value={selectedNode.config.logMessage || ''}
                            onChange={e => handleUpdateNodeConfig(selectedNode.id, { logMessage: e.target.value })}
                            placeholder="Type a log message to display in system logs..."
                            className="w-full border border-slate-250 rounded p-2 text-[11px] outline-none focus:ring-1 focus:ring-slate-700 leading-normal"
                          />
                        </div>
                      )}

                      {selectedNode.config.type === 'create_task' && (
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase">Task Subject</label>
                            <input
                              type="text"
                              required
                              value={selectedNode.config.taskSubject || ''}
                              onChange={e => handleUpdateNodeConfig(selectedNode.id, { taskSubject: e.target.value })}
                              placeholder="Complete client intake call"
                              className="w-full border border-slate-250 rounded px-2 py-1 text-[11px] outline-none h-7"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase">Task Priority</label>
                            <select
                              value={selectedNode.config.taskPriority || 'Normal'}
                              onChange={e => handleUpdateNodeConfig(selectedNode.id, { taskPriority: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-250 rounded px-2 py-1 text-[11px] outline-none h-7"
                            >
                              <option value="Low">Low</option>
                              <option value="Normal">Normal</option>
                              <option value="High">High</option>
                              <option value="Critical">Critical</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {selectedNode.config.type === 'send_email' && (
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase">Recipient Address</label>
                            <input
                              type="email"
                              required
                              value={selectedNode.config.emailTo || ''}
                              onChange={e => handleUpdateNodeConfig(selectedNode.id, { emailTo: e.target.value })}
                              placeholder="sales-ops@company.local"
                              className="w-full border border-slate-250 rounded px-2 py-1 text-[11px] outline-none h-7"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase">SMTP Subject line</label>
                            <input
                              type="text"
                              required
                              value={selectedNode.config.emailSubject || ''}
                              onChange={e => handleUpdateNodeConfig(selectedNode.id, { emailSubject: e.target.value })}
                              placeholder="Alert: Lead Qualification success"
                              className="w-full border border-slate-250 rounded px-2 py-1 text-[11px] outline-none h-7"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </fieldset>

                <div className="pt-2 border-t border-slate-100 italic text-[9px] text-slate-400">
                  <span>Changes made in Node Inspector apply to execution state instantly.</span>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-slate-400">
                <Icons.Sliders className="h-4 w-4 mx-auto mb-1 text-slate-300" />
                <span>Select a workflow node on the canvas to inspect variables.</span>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
