/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { loadDBConfig, saveDBConfig, testRemoteConnection, cloudBulkPush, cloudBulkPull, DBConfig, DBProvider } from '../utils/dbAdapters';
import { CRMObject, CRMRecord, Workflow, SystemLog } from '../types';

interface DatabasePortalProps {
  dbConfig: DBConfig;
  setDbConfig: (config: DBConfig) => void;
  objects: CRMObject[];
  setObjects: React.Dispatch<React.SetStateAction<CRMObject[]>>;
  records: CRMRecord[];
  setRecords: React.Dispatch<React.SetStateAction<CRMRecord[]>>;
  workflows: Workflow[];
  setWorkflows: React.Dispatch<React.SetStateAction<Workflow[]>>;
  addLog: (log: SystemLog) => void;
}

export default function DatabasePortal({
  dbConfig,
  setDbConfig,
  objects,
  setObjects,
  records,
  setRecords,
  workflows,
  setWorkflows,
  addLog
}: DatabasePortalProps) {
  // Credentials Form state
  const [provider, setProvider] = useState<DBProvider>(dbConfig.provider);
  const [fbApiKey, setFbApiKey] = useState(dbConfig.firebase.apiKey);
  const [fbAuthDomain, setFbAuthDomain] = useState(dbConfig.firebase.authDomain);
  const [fbProjectId, setFbProjectId] = useState(dbConfig.firebase.projectId);
  const [fbStorageBucket, setFbStorageBucket] = useState(dbConfig.firebase.storageBucket);
  const [fbMessagingSenderId, setFbMessagingSenderId] = useState(dbConfig.firebase.messagingSenderId);
  const [fbAppId, setFbAppId] = useState(dbConfig.firebase.appId);

  const [sbUrl, setSbUrl] = useState(dbConfig.supabase.url);
  const [sbAnonKey, setSbAnonKey] = useState(dbConfig.supabase.anonKey);

  // Status and Testing Logs
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [activeManualTab, setActiveManualTab] = useState<'firestore' | 'supabase'>('supabase');

  useEffect(() => {
    // Keep internal states aligned when parent prop shifts
    setProvider(dbConfig.provider);
    setFbApiKey(dbConfig.firebase.apiKey);
    setFbAuthDomain(dbConfig.firebase.authDomain);
    setFbProjectId(dbConfig.firebase.projectId);
    setFbStorageBucket(dbConfig.firebase.storageBucket);
    setFbMessagingSenderId(dbConfig.firebase.messagingSenderId);
    setFbAppId(dbConfig.firebase.appId);
    setSbUrl(dbConfig.supabase.url);
    setSbAnonKey(dbConfig.supabase.anonKey);
  }, [dbConfig]);

  const handleSaveConfig = () => {
    const updated: DBConfig = {
      provider,
      firebase: {
        apiKey: fbApiKey,
        authDomain: fbAuthDomain,
        projectId: fbProjectId,
        storageBucket: fbStorageBucket,
        messagingSenderId: fbMessagingSenderId,
        appId: fbAppId
      },
      supabase: {
        url: sbUrl,
        anonKey: sbAnonKey
      }
    };

    saveDBConfig(updated);
    setDbConfig(updated);
    
    // Clear status
    setTestResult(null);

    addLog({
      id: `db-save-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'action',
      message: `[Database Config] Updated Active DB Provider to "${provider.toUpperCase()}"`,
      payload: `Credentials initialized. Re-routing runtime storage engines.`
    });
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    const tempConfig: DBConfig = {
      provider,
      firebase: {
        apiKey: fbApiKey,
        authDomain: fbAuthDomain,
        projectId: fbProjectId,
        storageBucket: fbStorageBucket,
        messagingSenderId: fbMessagingSenderId,
        appId: fbAppId
      },
      supabase: {
        url: sbUrl,
        anonKey: sbAnonKey
      }
    };

    try {
      const result = await testRemoteConnection(tempConfig);
      setTestResult(result);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'An unexpected error occurred while verifying connection.'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handlePushToCloud = async () => {
    if (!window.confirm('Are you sure you want to push current workspace assets? This will batch write/overwrite objects, workflows, and records in your active database.')) {
      return;
    }

    setIsSyncing(true);
    setSyncLogs(['Initiating workspace backup snapshot...']);

    const currentConfig: DBConfig = {
      provider,
      firebase: {
        apiKey: fbApiKey,
        authDomain: fbAuthDomain,
        projectId: fbProjectId,
        storageBucket: fbStorageBucket,
        messagingSenderId: fbMessagingSenderId,
        appId: fbAppId
      },
      supabase: {
        url: sbUrl,
        anonKey: sbAnonKey
      }
    };

    try {
      const res = await cloudBulkPush(currentConfig, objects, records, workflows);
      setSyncLogs(prev => [...prev, ...res.logs, '✨ Success! Migration complete.']);
      
      addLog({
        id: `db-push-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'queue',
        message: `[Cloud DB Sync] Pushed ${records.length} records and ${objects.length} system objects to remote database.`,
        payload: `Engine sync completed on provider: ${provider.toUpperCase()}`
      });
    } catch (err: any) {
      setSyncLogs(prev => [...prev, `❌ Error during cloud transmission: ${err.message || err}`]);
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullFromCloud = async () => {
    if (!window.confirm('WARNING: Fetching cloud database records will replace your active local sandbox memory completely. Proceed?')) {
      return;
    }

    setIsSyncing(true);
    setSyncLogs(['Connecting to remote backend service...']);

    const currentConfig: DBConfig = {
      provider,
      firebase: {
        apiKey: fbApiKey,
        authDomain: fbAuthDomain,
        projectId: fbProjectId,
        storageBucket: fbStorageBucket,
        messagingSenderId: fbMessagingSenderId,
        appId: fbAppId
      },
      supabase: {
        url: sbUrl,
        anonKey: sbAnonKey
      }
    };

    try {
      setSyncLogs(prev => [...prev, `Attempting download from: ${provider.toUpperCase()}...`]);
      const res = await cloudBulkPull(currentConfig);
      
      // Update local states
      if (res.objects.length > 0) setObjects(res.objects);
      if (res.records.length > 0) setRecords(res.records);
      if (res.workflows.length > 0) setWorkflows(res.workflows);

      setSyncLogs(prev => [
        ...prev,
        `✓ Fetched metadata: ${res.objects.length} tables/objects`,
        `✓ Fetched schemas: ${res.workflows.length} workflow pipelines`,
        `✓ Fetched records: ${res.records.length} dynamic entries`,
        '✨ Success! Local environment state initialized with remote database.'
      ]);

      addLog({
        id: `db-pull-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'info',
        message: `[Cloud DB Sync] Loaded database snap from remote cloud. Synced ${res.records.length} records.`,
        payload: `Overwrite completed for environment context.`
      });
    } catch (err: any) {
      setSyncLogs(prev => [...prev, `❌ Remote fetch failed: ${err.message || err}`]);
    } finally {
      setIsSyncing(false);
    }
  };

  const supabaseSqlScript = `/**
 * METASTASH OPEN-CRM PostgreSQL Schema Definition
 * Execute this query inside your Supabase SQL Editor
 */

-- 1. Metadata Schema Definitions Table (Salesforce Custom Objects)
CREATE TABLE IF NOT EXISTS objects (
  id VARCHAR(255) PRIMARY KEY,
  label VARCHAR(255) NOT NULL,
  label_plural VARCHAR(255) NOT NULL,
  is_custom BOOLEAN DEFAULT false,
  fields JSONB NOT NULL,
  icon VARCHAR(255)
);

-- 2. CRM Dynamic Records (Postgres Hybrid JSONB Relational Engine)
CREATE TABLE IF NOT EXISTS records (
  id VARCHAR(255) PRIMARY KEY,
  object_id VARCHAR(255) NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Automation Pipelines and Rules
CREATE TABLE IF NOT EXISTS workflows (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  nodes JSONB NOT NULL,
  edges JSONB NOT NULL
);

-- Indexes for lightning fast JSONB queries
CREATE INDEX IF NOT EXISTS idx_records_object_id ON records(object_id);
CREATE INDEX IF NOT EXISTS idx_records_data_jsonb ON records USING gin (data);`;

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden" id="db-portal-workspace">
      
      {/* Upper Controls Banner */}
      <section className="bg-slate-900 text-slate-100 p-4 shrink-0 border-b border-slate-950 shadow-inner">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h3 className="text-xs font-black tracking-widest text-indigo-400 flex items-center gap-1.5 uppercase mb-1">
              <Icons.CloudLightning className="w-4 h-4 text-indigo-400" />
              Dynamic DB Portability Suite
            </h3>
            <p className="text-[10px] text-slate-400 max-w-2xl">
              Switch database backends instantly. Work locally in memory or connect directly with live Firestore instances or relational Supabase PostgreSQL clusters. State transfers are managed natively in real-time.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-450 uppercase font-bold">Active Engine:</span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${
              provider === 'localStorage'
                ? 'bg-slate-800 text-slate-350 border-slate-700'
                : provider === 'firestore'
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}>
              {provider === 'localStorage' && 'Offline Local Storage'}
              {provider === 'firestore' && 'Google Firestore NoSQL'}
              {provider === 'supabase' && 'Supabase PostgreSQL'}
            </span>
          </div>
        </div>
      </section>

      {/* Main Container Dashboard split panels */}
      <section className="flex-1 flex overflow-hidden min-h-0">
        
        {/* Left Column: Database Selector & Credentials */}
        <div className="w-[450px] bg-white border-r border-slate-200 p-4 overflow-y-auto shrink-0 flex flex-col">
          
          <span className="text-[9px] font-extrabold tracking-wider text-slate-450 uppercase mb-3 block">
            Select DB Engine
          </span>

          <div className="grid grid-cols-3 gap-2 mb-4">
            {/* Local Storage option */}
            <button
              onClick={() => setProvider('localStorage')}
              className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                provider === 'localStorage'
                  ? 'bg-indigo-50/70 border-indigo-500 shadow-xs ring-1 ring-indigo-500/10'
                  : 'bg-white hover:bg-slate-50 border-slate-225'
              }`}
            >
              <Icons.Pocket className={`w-5 h-5 mb-1 ${provider === 'localStorage' ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span className="text-[10px] font-black text-slate-800 block">Offline</span>
              <span className="text-[8px] text-slate-400 font-semibold uppercase scale-90">LocalStorage</span>
            </button>

            {/* Firestore option */}
            <button
              onClick={() => setProvider('firestore')}
              className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                provider === 'firestore'
                  ? 'bg-amber-50/50 border-amber-500 shadow-xs ring-1 ring-amber-500/10'
                  : 'bg-white hover:bg-slate-50 border-slate-225'
              }`}
            >
              <Icons.Flame className={`w-5 h-5 mb-1 ${provider === 'firestore' ? 'text-amber-500' : 'text-slate-400'}`} />
              <span className="text-[10px] font-black text-slate-800 block">Firestore</span>
              <span className="text-[8px] text-slate-400 font-semibold uppercase scale-90">Google Cloud</span>
            </button>

            {/* Supabase option */}
            <button
              onClick={() => setProvider('supabase')}
              className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                provider === 'supabase'
                  ? 'bg-emerald-50/50 border-emerald-500 shadow-xs ring-1 ring-emerald-500/10'
                  : 'bg-white hover:bg-slate-50 border-slate-225'
              }`}
            >
              <Icons.Zap className={`w-5 h-5 mb-1 ${provider === 'supabase' ? 'text-emerald-500' : 'text-slate-400'}`} />
              <span className="text-[10px] font-black text-slate-800 block">Supabase</span>
              <span className="text-[8px] text-slate-400 font-semibold uppercase scale-90">PostgreSQL</span>
            </button>
          </div>

          {/* Conditional Credentials Input Panels */}
          <div className="flex-1 space-y-4">
            
            {provider === 'localStorage' && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                <Icons.HardDrive className="w-8 h-8 text-slate-400" />
                <h4 className="text-[11px] font-extrabold text-slate-800 uppercase tracking-tight">Offline Local Storage Engine</h4>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Requires zero remote credentials! Active CRM custom object dictionary and relational mock data are cached in your local browser sandbox context.
                </p>
                <div className="text-[9px] text-indigo-650 bg-indigo-50 border border-indigo-100 rounded p-2.5 font-semibold leading-relaxed">
                  📢 <strong>Setup Sandbox Seeding:</strong> Your system starts automatically with preloaded default CRM models. Switch to Firestore or Supabase if you want to deploy these schemas to actual cloud databases!
                </div>
              </div>
            )}

            {provider === 'firestore' && (
              <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-lg p-4">
                <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-tight flex items-center gap-1">
                  <Icons.Flame className="w-3.5 h-3.5 text-amber-500" />
                  Google Cloud Firestore Credentials
                </h4>
                
                <div className="space-y-2">
                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">API Key</label>
                    <input
                      type="password"
                      value={fbApiKey}
                      onChange={e => setFbApiKey(e.target.value)}
                      placeholder="AIzaSyA..."
                      className="w-full bg-white border border-slate-250 rounded px-2 py-1 text-[10px] outline-none h-7 font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Project ID</label>
                      <input
                        type="text"
                        value={fbProjectId}
                        onChange={e => setFbProjectId(e.target.value)}
                        placeholder="my-project-id"
                        className="w-full bg-white border border-slate-250 rounded px-2 py-1 text-[10px] outline-none h-7"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">App ID</label>
                      <input
                        type="text"
                        value={fbAppId}
                        onChange={e => setFbAppId(e.target.value)}
                        placeholder="1:123456:web:abcd"
                        className="w-full bg-white border border-slate-250 rounded px-2 py-1 text-[10px] outline-none h-7"
                      />
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Auth Domain</label>
                    <input
                      type="text"
                      value={fbAuthDomain}
                      onChange={e => setFbAuthDomain(e.target.value)}
                      placeholder="my-project-id.firebaseapp.com"
                      className="w-full bg-white border border-slate-225 rounded px-2 py-1 text-[10px] outline-none h-7"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Storage Bucket</label>
                      <input
                        type="text"
                        value={fbStorageBucket}
                        onChange={e => setFbStorageBucket(e.target.value)}
                        placeholder="my-project-id.appspot.com"
                        className="w-full bg-white border border-slate-225 rounded px-2 py-1 text-[10px] outline-none h-7"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Messaging Sender ID</label>
                      <input
                        type="text"
                        value={fbMessagingSenderId}
                        onChange={e => setFbMessagingSenderId(e.target.value)}
                        placeholder="12345678"
                        className="w-full bg-white border border-slate-225 rounded px-2 py-1 text-[10px] outline-none h-7"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {provider === 'supabase' && (
              <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-lg p-4">
                <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-tight flex items-center gap-1">
                  <Icons.Zap className="w-3.5 h-3.5 text-emerald-500" />
                  Supabase Backend Configuration
                </h4>

                <div className="space-y-2">
                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Supabase API URL</label>
                    <input
                      type="text"
                      value={sbUrl}
                      onChange={e => setSbUrl(e.target.value)}
                      placeholder="https://yourproject.supabase.co"
                      className="w-full bg-white border border-slate-250 rounded px-2 py-1 text-[10px] outline-none h-7 font-mono"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Anon / Public Key</label>
                    <input
                      type="password"
                      value={sbAnonKey}
                      onChange={e => setSbAnonKey(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsIn..."
                      className="w-full bg-white border border-slate-250 rounded px-2 py-1 text-[10px] outline-none h-7 font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Action Buttons: Save & Test */}
          <div className="pt-4 border-t border-slate-100 flex gap-2">
            <button
              onClick={handleSaveConfig}
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[10px] uppercase tracking-wider h-8 rounded shrink-0 transition flex items-center justify-center gap-1 cursor-pointer"
            >
              <Icons.Save className="w-3.5 h-3.5" />
              Activate DB Provider
            </button>

            <button
              onClick={handleTestConnection}
              disabled={isTesting || provider === 'localStorage'}
              className={`px-3 border text-slate-700 font-extrabold text-[10px] uppercase tracking-wider h-8 rounded shrink-0 transition flex items-center justify-center gap-1 ${
                provider === 'localStorage'
                  ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-white hover:bg-slate-50 border-slate-300 cursor-pointer'
              }`}
            >
              {isTesting ? (
                <Icons.RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Icons.Activity className="w-3.5 h-3.5" />
              )}
              Test Connect
            </button>
          </div>

          {/* Connection Test Results Alert */}
          {testResult && (
            <div className={`mt-3 p-3 rounded text-[10px] border flex items-start gap-1.5 ${
              testResult.success
                ? 'bg-emerald-50 border-emerald-250 text-emerald-800 font-semibold'
                : 'bg-rose-50 border-rose-250 text-rose-800'
            }`}>
              {testResult.success ? (
                <Icons.CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <Icons.AlertOctagon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div>
                <strong className="block text-[10px] uppercase font-bold mb-0.5">
                  {testResult.success ? 'CONECTION SUCCESSFUL' : 'INTEGRATION FAILURE'}
                </strong>
                {testResult.message}
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Database Synchronization & Documentation Guides */}
        <div className="flex-1 bg-slate-50 p-4 overflow-y-auto flex flex-col min-w-0">
          
          {/* Bidirectional DB Sync Panel (Available if remote database is active) */}
          {provider !== 'localStorage' && (
            <div className="bg-white border border-slate-225 rounded-lg p-4 mb-4 shadow-xs">
              <h4 className="text-[10px] font-black text-slate-800 tracking-wider uppercase mb-3 flex items-center gap-1">
                <Icons.RefreshCw className="w-4 h-4 text-slate-400" />
                Sandbox Cloud Migration Hub
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                {/* Seed/Push button */}
                <button
                  onClick={handlePushToCloud}
                  disabled={isSyncing}
                  className="p-3 text-left bg-gradient-to-br from-indigo-50/20 to-slate-50 border border-indigo-250 hover:bg-indigo-50/50 rounded-lg transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-1.5 mb-1 text-slate-900 font-bold text-xs group-hover:text-indigo-650">
                    <Icons.CloudUpload className="w-4 h-4 text-indigo-500" />
                    <span>Push Current State to Cloud</span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Seizes all objects, schemas, custom workflows, and crm records in your active browser and uploads them as the official database seed.
                  </p>
                </button>

                {/* Pull button */}
                <button
                  onClick={handlePullFromCloud}
                  disabled={isSyncing}
                  className="p-3 text-left bg-gradient-to-br from-emerald-50/10 to-slate-50 border border-emerald-250 hover:bg-emerald-50/30 rounded-lg transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-1.5 mb-1 text-slate-900 font-bold text-xs group-hover:text-emerald-700">
                    <Icons.CloudDownload className="w-4 h-4 text-emerald-500" />
                    <span>Fetch Cloud Data to Sandbox</span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Downloads remote table objects, workflow blueprints, and crm entries into your local environment, replacing your offline database.
                  </p>
                </button>
              </div>

              {/* Real-time sync logs block */}
              {syncLogs.length > 0 && (
                <div className="bg-slate-950 text-slate-300 p-2 text-[9px] rounded font-mono space-y-0.5 border border-slate-800 max-h-36 overflow-y-auto mb-1">
                  <div className="text-[8px] font-bold text-slate-500 border-b border-slate-900 pb-1 mb-1 flex items-center justify-between">
                    <span>MIGRATION DISPATCH OUTPUT</span>
                    <button onClick={() => setSyncLogs([])} className="hover:text-white uppercase">clear</button>
                  </div>
                  {syncLogs.map((logStr, idx) => (
                    <div key={idx} className="leading-relaxed">
                      <span className="text-slate-650 select-none mr-2">[{idx + 1}]</span>
                      {logStr}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Admin Setup Instruction Guides */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col flex-1 min-h-0 min-w-0">
            {/* Guide Tabs Header */}
            <div className="bg-slate-50 border-b border-slate-200 p-1 flex select-none">
              <button
                type="button"
                onClick={() => setActiveManualTab('supabase')}
                className={`flex-1 py-2 text-center text-[10px] font-black tracking-wider uppercase border rounded-md transition-all cursor-pointer ${
                  activeManualTab === 'supabase'
                    ? 'bg-white text-emerald-600 border-slate-200/80 shadow-xs'
                    : 'text-slate-450 hover:bg-slate-100 border-transparent'
                }`}
              >
                Supabase PG Relational setup manual
              </button>
              
              <button
                type="button"
                onClick={() => setActiveManualTab('firestore')}
                className={`flex-1 py-2 text-center text-[10px] font-black tracking-wider uppercase border rounded-md transition-all cursor-pointer ${
                  activeManualTab === 'firestore'
                    ? 'bg-white text-amber-600 border-slate-200/80 shadow-xs'
                    : 'text-slate-450 hover:bg-slate-100 border-transparent'
                }`}
              >
                Firebase Firestore setup manual
              </button>
            </div>

            {/* Inner Guide View Block */}
            <div className="p-4 flex-1 overflow-y-auto text-slate-600 text-xs leading-relaxed space-y-4">
              
              {activeManualTab === 'firestore' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Icons.Flame className="w-5 h-5 text-amber-500 shrink-0" />
                    <h5 className="font-extrabold text-[12px] text-slate-800 uppercase tracking-tight">Google Cloud Firestore Integration Guide</h5>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Google Cloud Firestore is a lightning-fast NoSQL Document Database. Documents are organized into collections. Schemas are dynamic and collections are created on write automatically without manual table declarations.
                  </p>

                  <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-2.5 text-[11px]">
                    <div className="flex items-start gap-2">
                      <span className="w-4 h-4 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-[9px] shrink-0">1</span>
                      <div>
                        <strong>Create a Firebase Project:</strong> Open the{' '}
                        <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-indigo-650 hover:underline font-semibold">Firebase Console</a>, click <strong>"Add Project"</strong>, and assign it a name (e.g., <code>metastash-crm</code>).
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <span className="w-4 h-4 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-[9px] shrink-0">2</span>
                      <div>
                        <strong>Create Cloud Firestore:</strong> In the sidebar menu, click <strong>"Build"</strong> &gt; <strong>"Firestore Database"</strong>. Click <strong>"Create Database"</strong> and choose "Start in Test Mode" or "Production Mode" in your target cloud region.
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <span className="w-4 h-4 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-[9px] shrink-0">3</span>
                      <div>
                        <strong>Register Web Application to fetch API Keys:</strong> Go to <strong>Project Settings (Gear icon)</strong> &gt; slide down to <strong>"Your Apps"</strong> and click the <strong>web icon (&lt;/&gt;)</strong>. Save and register. Firebase will output the API credential object block.
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <span className="w-4 h-4 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-[9px] shrink-0">4</span>
                      <div>
                        <strong>Activate Firestore:</strong> Copy the parameters into the credentials form on the left, click <strong>"Activate DB Provider"</strong>, and verify with <strong>"Test Connect"</strong>! Click <strong>"Push Current State"</strong> to generate Firestore documents automatically.
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded p-3 text-[10.5px] text-amber-800 leading-relaxed">
                    <strong>🛡️ Firestore Security Rules Recommendation:</strong> By default, if starting in Production Mode, configure the following rules in your Firebase Console Rules editor:
                    <pre className="font-mono text-[9px] bg-amber-950/5 p-1.5 rounded mt-1.5 border border-amber-250/50 block select-all">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // Guard with auth as required
    }
  }
}`}
                    </pre>
                  </div>
                </div>
              )}

              {activeManualTab === 'supabase' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Icons.Zap className="w-5 h-5 text-emerald-500 shrink-0" />
                    <h5 className="font-extrabold text-[12px] text-slate-800 uppercase tracking-tight">Supabase PostgreSQL Relational Schema Guide</h5>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Supabase provides state-of-the-art hosted PostgreSQL. To handle the dynamic CRM schema builder cleanly, Metastash utilizes custom tables with highly indexed <strong>JSONB payload columns</strong>.
                  </p>

                  <div className="bg-slate-50 border border-slate-201 rounded p-3 space-y-2.5 text-[11px] mb-2">
                    <div className="flex items-start gap-2">
                      <span className="w-4 h-4 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-[9px] shrink-0">1</span>
                      <div>
                        <strong>Launch a Supabase Project:</strong> Sign in to the{' '}
                        <a href="https://supabase.com/" target="_blank" rel="noreferrer" className="text-emerald-700 hover:underline font-semibold">Supabase Dashboard</a> and spin up a new database instance (takes ~15 seconds).
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <span className="w-4 h-4 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-[9px] shrink-0">2</span>
                      <div>
                        <strong>Initialize Schemas via SQL Editor:</strong> In your Supabase left panel, click <strong>"SQL Editor"</strong>, click <strong>"New query"</strong>, paste the Metastash relational table code (shown below), and click <strong>"Run"</strong>.
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <span className="w-4 h-4 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-[9px] shrink-0">3</span>
                      <div>
                        <strong>Extract API Connection details:</strong> Navigate to <strong>Project Settings</strong> &gt; <strong>"API"</strong>. Copy the <strong>Project URL</strong> and the <code>anon public</code> connection key.
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <span className="w-4 h-4 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-[9px] shrink-0">4</span>
                      <div>
                        <strong>Activate & Sync:</strong> Paste credentials on the left, click <strong>"Activate DB Provider"</strong>, verify connectivity with <strong>"Test Connect"</strong>, and press <strong>"Push Current State"</strong> to instantly populate live CRM tables!
                      </div>
                    </div>
                  </div>

                  {/* Copy SQL block */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-slate-500 uppercase font-mono">Supabase Setup Table SQL code</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(supabaseSqlScript);
                          alert('Copied Supabase SQL installation script to clipboard!');
                        }}
                        className="px-2 py-0.5 border border-slate-200 hover:bg-slate-50 rounded text-[9px] uppercase font-bold text-slate-700 select-all cursor-pointer flex items-center gap-1 leading-none"
                      >
                        <Icons.Copy className="w-3 h-3 text-slate-400" /> Copy SQL Script
                      </button>
                    </div>
                    
                    <pre className="font-mono text-[9px] bg-slate-900 text-slate-300 p-3 rounded-lg border border-slate-950 block overflow-x-auto max-h-56 leading-relaxed select-all">
                      {supabaseSqlScript}
                    </pre>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>

      </section>

    </div>
  );
}
