/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { INITIAL_OBJECTS, INITIAL_RECORDS, INITIAL_WORKFLOWS, INITIAL_ROLES, INITIAL_USERS } from './data/initialData';
import { CRMObject, CRMRecord, Workflow, SystemLog, User, Role } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import SchemaBuilder from './components/SchemaBuilder';
import RecordExplorer from './components/RecordExplorer';
import WorkflowBuilder from './components/WorkflowBuilder';
import RbacManager from './components/RbacManager';
import SystemConsole from './components/SystemConsole';
import LicenseDocs from './components/LicenseDocs';
import DatabasePortal from './components/DatabasePortal';
import { processRecordFormulas, executeWorkflowAutomation } from './utils/engine';
import { loadDBConfig, cloudBulkPull, DBConfig } from './utils/dbAdapters';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  
  // Primary Databases state
  const [dbConfig, setDbConfig] = useState<DBConfig>(() => loadDBConfig());
  const [objects, setObjects] = useState<CRMObject[]>(() => INITIAL_OBJECTS);
  const [records, setRecords] = useState<CRMRecord[]>(() => INITIAL_RECORDS);
  const [workflows, setWorkflows] = useState<Workflow[]>(() => INITIAL_WORKFLOWS);

  // RBAC & Users Security Context State
  const [roles, setRoles] = useState<Role[]>(() => INITIAL_ROLES);
  const [users, setUsers] = useState<User[]>(() => INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<User>(() => INITIAL_USERS[0]);
  
  // Realtime System logs state
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [unresolvedLogsCount, setUnresolvedLogsCount] = useState<number>(0);

  // Initialize System Logs with startup sequence to match principal standards
  useEffect(() => {
    const timestamp = new Date().toISOString();
    const bootLogs: SystemLog[] = [
      {
        id: `boot-1`,
        timestamp,
        type: 'info',
        message: '[System Core] Metastash Core v0.9 stable-release initializing...',
        payload: 'Platform major capability: SERVER_SIDE_GEMINI_API ready.'
      },
      {
        id: `boot-2`,
        timestamp,
        type: 'sql',
        message: '[PostgreSQL] Scanning system schemas and lookups...',
        sqlQuery: `SELECT table_name, column_name, data_type \nFROM information_schema.columns \nWHERE table_schema = 'public' AND table_name IN ('accounts', 'contacts', 'leads', 'opportunities', 'tasks', 'equipments__c');`
      },
      {
        id: `boot-3`,
        timestamp,
        type: 'queue',
        message: '[BullMQ] Job Scheduler listening on Redis backend. Event queues clear.',
        payload: 'Active listeners: Lead Qualification Flow, Asset Maintenance Guard.'
      }
    ];

    setLogs(bootLogs);
    // Evaluate initial formulas for record integrity (e.g. Opportunities expected revenue)
    setRecords(prev => prev.map(rec => {
      const obj = INITIAL_OBJECTS.find(o => o.id === rec.objectId);
      if (obj) {
        return processRecordFormulas(rec, obj.fields);
      }
      return rec;
    }));
  }, []);

  // Fetch from active Cloud DB on boot/refresh if credentials exist
  useEffect(() => {
    async function initializeRemoteDatabaseConnection() {
      if (dbConfig.provider === 'localStorage') return;

      const dateStr = new Date().toISOString();
      addLog({
        id: `init-sync-try-${Date.now()}`,
        timestamp: dateStr,
        type: 'info',
        message: `[Database Gateway] Shifting connection pipeline to remote provider: ${dbConfig.provider.toUpperCase()}...`,
        payload: 'Verifying active database instances and pulling metadata definitions.'
      });

      try {
        const fetched = await cloudBulkPull(dbConfig);
        
        if (fetched.objects && fetched.objects.length > 0) {
          setObjects(fetched.objects);
        }
        if (fetched.records && fetched.records.length > 0) {
          setRecords(fetched.records);
        }
        if (fetched.workflows && fetched.workflows.length > 0) {
          setWorkflows(fetched.workflows);
        }

        addLog({
          id: `init-sync-ok-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'info',
          message: `[Database Gateway] Live synchronized seamlessly with ${dbConfig.provider.toUpperCase()}! loaded ${fetched.records.length} records.`,
          payload: `Integration handshake fully validated. Sync lock acquired.`
        });
      } catch (err: any) {
        console.error('Initial DB synchronization fail:', err);
        addLog({
          id: `init-sync-fail-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'info',
          message: `[Database Gateway] Remote provider (${dbConfig.provider.toUpperCase()}) was unreachable. Operating on dynamic offline fallbacks.`,
          payload: err.message || err
        });
      }
    }
    initializeRemoteDatabaseConnection();
  }, [dbConfig.provider]);

  // Sync tab pivots to clear new notifications logs badge
  useEffect(() => {
    if (currentTab === 'console') {
      setUnresolvedLogsCount(0);
    }
  }, [currentTab]);

  // Append a single log helper
  const addLog = (newLog: SystemLog) => {
    setLogs(prev => [...prev, newLog]);
    if (currentTab !== 'console') {
      setUnresolvedLogsCount(prev => prev + 1);
    }
  };

  // Append multiple logs helper
  const addLogsBatch = (newLogs: SystemLog[]) => {
    setLogs(prev => [...prev, ...newLogs]);
    if (currentTab !== 'console') {
      setUnresolvedLogsCount(prev => prev + newLogs.length);
    }
  };

  // Simulate Bulk Demo Operations (The showcase trigger waterfall)
  const triggerDemoRun = () => {
    const timestamp = new Date().toISOString();
    
    // Select an un-qualified Lead to promote
    const targetLead = records.find(r => r.objectId === 'leads' && r.data.status !== 'Qualified');
    const leadToPromote = targetLead || records.find(r => r.objectId === 'leads');

    if (!leadToPromote) {
      addLog({
        id: `demo-warn-${Date.now()}`,
        timestamp,
        type: 'info',
        message: '[System Shell] Simulation aborted: No qualifying leads to operate on. Please create a Lead record first.'
      });
      return;
    }

    addLog({
      id: `demo-start-${Date.now()}`,
      timestamp,
      type: 'info',
      message: `[Demonstration Trigger] Starting Bulk pipeline process. Modifying status of Lead record ${leadToPromote.id} to "Qualified"`,
      payload: `Initiated by developer simulation suite.`
    });

    // Create a deep copy and update status to qualified
    const oldRec = { ...leadToPromote };
    const leadFields = objects.find(o => o.id === 'leads')?.fields || [];
    
    let updatedLead: CRMRecord = {
      ...leadToPromote,
      data: {
        ...leadToPromote.data,
        status: 'Qualified',
        rating: 'Hot'
      },
      updatedAt: timestamp
    };

    // Calculate Formula
    updatedLead = processRecordFormulas(updatedLead, leadFields);

    // Save update in active records state
    setRecords(prev => prev.map(r => r.id === updatedLead.id ? updatedLead : r));

    // Log the UPDATE SQL
    addLog({
      id: `demo-sql-${Date.now()}`,
      timestamp,
      type: 'sql',
      message: `[PostgreSQL] Promoting Lead CRM record status inside dynamic JSONB column`,
      sqlQuery: `-- Simulating postgres update \nUPDATE leads \nSET data = jsonb_set(jsonb_set(data, '{status}', '"Qualified"'::jsonb), '{rating}', '"Hot"'::jsonb),\n    updated_at = NOW() \nWHERE id = '${leadToPromote.id}';`
    });

    // Queue trigger pipeline evaluations
    executeWorkflowAutomation(
      'update',
      oldRec,
      updatedLead,
      objects,
      records,
      workflows,
      (wfLogs, wfRecords) => {
        // Render staggering delay to make it feel super tactical!
        setTimeout(() => {
          addLogsBatch(wfLogs);
          if (wfRecords.length > 0) {
            setRecords(prev => [...prev, ...wfRecords]);
          }
        }, 300);
      }
    );

    // Swap view to console to show off logs
    setCurrentTab('console');
  };

  // Render proper tab views
  const renderTabContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <Dashboard
            objects={objects}
            records={records}
            workflows={workflows}
            setCurrentTab={setCurrentTab}
          />
        );
      case 'schema':
        return (
          <SchemaBuilder
            objects={objects}
            setObjects={setObjects}
            addLog={addLog}
            currentUser={currentUser}
            roles={roles}
            dbConfig={dbConfig}
          />
        );
      case 'records':
        return (
          <RecordExplorer
            objects={objects}
            records={records}
            setRecords={setRecords}
            workflows={workflows}
            addLog={addLog}
            addLogsBatch={addLogsBatch}
            currentUser={currentUser}
            roles={roles}
            dbConfig={dbConfig}
          />
        );
      case 'workflows':
        return (
          <WorkflowBuilder
            workflows={workflows}
            setWorkflows={setWorkflows}
            objects={objects}
            addLog={addLog}
            currentUser={currentUser}
            roles={roles}
            dbConfig={dbConfig}
          />
        );
      case 'security':
        return (
          <RbacManager
            roles={roles}
            setRoles={setRoles}
            users={users}
            setUsers={setUsers}
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
            objects={objects}
            addLog={addLog}
          />
        );
      case 'database':
        return (
          <DatabasePortal
            dbConfig={dbConfig}
            setDbConfig={setDbConfig}
            objects={objects}
            setObjects={setObjects}
            records={records}
            setRecords={setRecords}
            workflows={workflows}
            setWorkflows={setWorkflows}
            addLog={addLog}
          />
        );
      case 'console':
        return (
          <SystemConsole
            logs={logs}
            setLogs={setLogs}
            triggerDemoRun={triggerDemoRun}
          />
        );
      case 'license':
        return <LicenseDocs />;
      default:
        return (
          <div className="p-8 text-center text-slate-500">
            Select a core operations board on the panel.
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-600 antialiased selection:bg-emerald-500/10 selection:text-emerald-500">
      
      {/* Primary Sidebar Rail */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        unresolvedLogsCount={unresolvedLogsCount}
      />

      {/* Main Panel Content Box */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0" id="metastash-workspace-stage">
        
        {/* Workspace global quick info header */}
        <header className="h-14 bg-white border-b border-slate-200 shrink-0 px-6 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-400">
            <span>METASTASH METADATA ENGINE</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-800 uppercase tracking-widest">{currentTab}</span>
          </div>

          <div className="flex items-center space-x-3 text-[10px]">
            <span className="text-xs text-slate-500 font-medium">Ingress: <strong className="font-mono text-slate-700">Port 3000</strong></span>
            <div className="h-3 w-[1px] bg-slate-200" />
            <div className={`flex items-center space-x-1.5 p-1 px-2.5 rounded border ${
              dbConfig.provider === 'localStorage'
                ? 'text-slate-500 bg-slate-50 border-slate-200'
                : dbConfig.provider === 'firestore'
                ? 'text-amber-755 bg-amber-50 border-amber-200 font-semibold'
                : 'text-emerald-755 bg-emerald-50 border-emerald-200 font-semibold'
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${
                dbConfig.provider === 'localStorage'
                  ? 'bg-slate-400'
                  : dbConfig.provider === 'firestore'
                  ? 'bg-amber-500 animate-pulse'
                  : 'bg-emerald-500 animate-pulse'
              }`} />
              <span>
                {dbConfig.provider === 'localStorage' && 'Offline Sandbox'}
                {dbConfig.provider === 'firestore' && 'Firestore Active'}
                {dbConfig.provider === 'supabase' && 'Supabase Active'}
              </span>
            </div>
          </div>
        </header>

        {/* Scrollable Panel Stages (rendered via Framer Motion AnimatePresence transitions) */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTab}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15, ease: 'easeInOut' }}
              className="h-full w-full overflow-hidden"
            >
              {renderTabContent()}
            </motion.div>
          </AnimatePresence>
        </div>

      </main>

    </div>
  );
}
