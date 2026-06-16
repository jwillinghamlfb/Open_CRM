/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import * as Icons from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  unresolvedLogsCount: number;
}

export default function Sidebar({ currentTab, setCurrentTab, unresolvedLogsCount }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'TrendingUp' },
    { id: 'records', label: 'Leads & Records', icon: 'Database' },
    { id: 'schema', label: 'Schema Manager', icon: 'Layers' },
    { id: 'workflows', label: 'Workflow Builder', icon: 'Workflow' },
    { id: 'security', label: 'Role Security Tower', icon: 'ShieldAlert' },
    { id: 'database', label: 'Cloud DB Portal', icon: 'CloudLightning' },
    { id: 'console', label: 'System Console', icon: 'Terminal', badge: unresolvedLogsCount },
    { id: 'license', label: 'Legal Strategy', icon: 'BookOpen' }
  ];

  return (
    <aside className="w-56 bg-slate-900 border-r border-slate-800 text-slate-100 flex flex-col shrink-0 h-screen overflow-y-auto" id="sidebar-root">
      {/* Brand Header */}
      <div className="p-4 flex items-center gap-2 border-b border-slate-800">
        <div className="w-8 h-8 bg-indigo-500 rounded flex items-center justify-center font-bold text-white shadow-lg">
          M
        </div>
        <div>
          <span className="text-white font-semibold tracking-tight uppercase text-xs block leading-none">Metastash</span>
          <span className="text-slate-450 text-[9px] leading-none uppercase tracking-widest font-semibold block mt-0.5">OpenCRM v0.9</span>
        </div>
      </div>

      {/* Navigation Groups */}
      <div className="p-4 flex-1 space-y-1">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
          Core Objects
        </p>
        <ul className="space-y-1">
          {menuItems.slice(0, 2).map(item => {
            const IconComponent = (Icons as any)[item.icon] || Icons.HelpCircle;
            const isActive = currentTab === item.id;

            return (
              <li key={item.id}>
                <button
                  id={`nav-tab-${item.id}`}
                  onClick={() => setCurrentTab(item.id)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded text-xs transition-colors cursor-pointer border-none text-left ${
                    isActive
                      ? 'bg-slate-800 text-white font-medium'
                      : 'hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <IconComponent className="h-3.5 w-3.5 opacity-70 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-6 mb-3">
          Builder Studio
        </p>
        <ul className="space-y-1">
          {menuItems.slice(2).map(item => {
            const IconComponent = (Icons as any)[item.icon] || Icons.HelpCircle;
            const isActive = currentTab === item.id;

            return (
              <li key={item.id}>
                <button
                  id={`nav-tab-${item.id}`}
                  onClick={() => setCurrentTab(item.id)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded text-xs transition-colors cursor-pointer border-none text-left ${
                    isActive
                      ? 'bg-slate-800 text-white font-medium'
                      : 'hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <IconComponent className="h-3.5 w-3.5 opacity-70 shrink-0" />
                  <span className="truncate flex-1">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 bg-indigo-650 text-white text-[9px] rounded-full font-extrabold">
                      {item.badge}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Footer System Status */}
      <div className="p-4 border-t border-slate-850 bg-slate-950/40 space-y-1.5">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-slate-400 font-semibold tracking-wide uppercase">PG-JSONB Engine:</span>
          <div className="flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-400 font-bold">ACTIVE</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-slate-400 font-semibold tracking-wide uppercase">BullMQ Broker:</span>
          <div className="flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-indigo-400 font-bold">READY</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
