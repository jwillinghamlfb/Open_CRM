/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import { SystemLog } from '../types';

interface SystemConsoleProps {
  logs: SystemLog[];
  setLogs: React.Dispatch<React.SetStateAction<SystemLog[]>>;
  triggerDemoRun: () => void;
}

export default function SystemConsole({ logs, setLogs, triggerDemoRun }: SystemConsoleProps) {
  const [filterType, setFilterType] = useState<'all' | 'sql' | 'queue' | 'workflow' | 'action'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Sift logs
  const filteredLogs = logs.filter(log => {
    const matchesType = filterType === 'all' || log.type === filterType;
    const matchesSearch = !searchQuery || 
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (log.sqlQuery && log.sqlQuery.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.payload && log.payload.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  // Color mappings for log rows
  const getLogColors = (type: SystemLog['type']) => {
    switch (type) {
      case 'sql':
        return {
          bg: 'bg-teal-500/10 hover:bg-teal-500/15 border-teal-500/20',
          badge: 'bg-teal-500/25 text-teal-350 border-teal-500/30',
          textColor: 'text-teal-200'
        };
      case 'queue':
        return {
          bg: 'bg-indigo-500/10 hover:bg-indigo-500/15 border-indigo-500/20',
          badge: 'bg-indigo-505/25 text-indigo-350 border-indigo-500/30',
          textColor: 'text-indigo-200'
        };
      case 'workflow':
        return {
          bg: 'bg-amber-500/10 hover:bg-amber-500/15 border-amber-500/20',
          badge: 'bg-amber-505/25 text-amber-350 border-amber-500/30',
          textColor: 'text-amber-250'
        };
      case 'action':
        return {
          bg: 'bg-emerald-500/10 hover:bg-emerald-500/15 border-emerald-500/20',
          badge: 'bg-emerald-505/25 text-emerald-350 border-emerald-500/30',
          textColor: 'text-emerald-250'
        };
      default:
        return {
          bg: 'bg-slate-500/5 hover:bg-slate-500/10 border-slate-500/10',
          badge: 'bg-slate-500/20 text-slate-300 border-slate-500/20',
          textColor: 'text-slate-300'
        };
    }
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-slate-950 overflow-hidden" id="system-console-root">
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Terminal Header Panel */}
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex flex-col lg:flex-row lg:items-center justify-between gap-2 shrink-0">
          <div className="flex items-center space-x-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <div className="p-1 px-1.5 bg-slate-950 rounded text-emerald-400 border border-slate-850">
              <Icons.Terminal className="h-3.5 w-3.5" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-200">System Transaction Log Shell</h2>
              <p className="text-slate-500 text-[10px] leading-visible">Live execution pipeline: Postgres JSONB & BullMQ job nodes</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={triggerDemoRun}
              className="p-1 px-2.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded text-[10px] font-bold uppercase tracking-tight flex items-center space-x-1.5 transition cursor-pointer border border-indigo-600 h-7"
              title="Runs background database insertions to trigger a live automated workflow chain"
            >
              <Icons.Zap className="h-3 w-3 text-amber-300" />
              <span>Simulate Bulk Operations</span>
            </button>
            <button
              onClick={() => {
                setLogs([{
                  id: `clear-${Date.now()}`,
                  timestamp: new Date().toISOString(),
                  type: 'info',
                  message: '[System Shell] Transaction history log buffer cleared.'
                }]);
              }}
              className="p-1 px-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded text-[10px] font-bold uppercase tracking-tight flex items-center space-x-1 transition border border-slate-700 cursor-pointer h-7"
            >
              <Icons.Trash2 className="h-3 w-3" />
              <span>Flush Buffer</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar Section */}
        <div className="border-b border-slate-900 bg-slate-900/60 p-2 px-4 flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0">
          
          {/* Quick tabs filters */}
          <div className="flex bg-slate-950 p-0.5 rounded border border-slate-850 flex-wrap gap-0.5 items-center">
            {(['all', 'sql', 'queue', 'workflow', 'action'] as const).map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-2 py-1 rounded text-[9px] font-bold transition uppercase ${
                  filterType === type
                    ? 'bg-slate-850 text-slate-100 border border-slate-750'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {type === 'all' ? 'All Logs' : type === 'sql' ? 'Postgres Raw' : type}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="Grep terms in buffer logs..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full md:w-56 bg-slate-950 border border-slate-850 text-slate-200 rounded px-2.5 py-1 text-[11px] focus:ring-1 focus:ring-emerald-500 outline-none font-mono h-7"
          />
        </div>

        {/* Log rows scroll list */}
        <div className="flex-1 p-3 overflow-y-auto space-y-1.5 font-mono text-[11px] select-text">
          {filteredLogs.length === 0 ? (
            <div className="text-center p-6 text-slate-600 border border-dashed border-slate-850 rounded">
              <Icons.Terminal className="h-5 w-5 mx-auto mb-1 text-slate-800" />
              <span className="text-[10px]">Buffer is empty. Trigger active Kanban shifts or CRUD operations to view logs.</span>
            </div>
          ) : (
            filteredLogs.slice().reverse().map(log => {
              const theme = getLogColors(log.type);
              const dateStr = new Date(log.timestamp).toLocaleTimeString();

              return (
                <div
                  key={log.id}
                  className={`p-2 border rounded transition duration-200 animate-fadeIn ${theme.bg}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-white/5 mb-1.5">
                    <div className="flex items-center space-x-1.5">
                      <span className={`px-1 rounded border uppercase text-[8px] font-bold ${theme.badge}`}>
                        {log.type === 'sql' ? 'SQL EXPORT' : log.type}
                      </span>
                      <span className={`text-[10px] font-bold ${theme.textColor}`}>
                        {log.message}
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-550 font-semibold">{dateStr}</span>
                  </div>

                  {log.sqlQuery && (
                    <pre className="text-[10px] leading-normal text-teal-300 bg-slate-950/80 p-2 rounded border border-teal-500/10 overflow-x-auto whitespace-pre font-mono">
                      {log.sqlQuery}
                    </pre>
                  )}

                  {log.payload && (
                    <div className="text-[9px] leading-normal text-slate-450 bg-slate-950/40 p-1.5 px-2 rounded border border-slate-900 overflow-x-auto whitespace-pre">
                      <span className="text-slate-550 font-bold block mb-0.5 uppercase text-[8px]">PAYLOAD CONTEXT:</span>
                      {log.payload}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
