/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import * as Icons from 'lucide-react';
import { CRMObject, CRMRecord, Workflow } from '../types';

interface DashboardProps {
  objects: CRMObject[];
  records: CRMRecord[];
  workflows: Workflow[];
  setCurrentTab: (tab: string) => void;
}

export default function Dashboard({ objects, records, workflows, setCurrentTab }: DashboardProps) {
  // Calculate metrics based on live records state! This proves the engine is live and reactive.
  const totalAccounts = records.filter(r => r.objectId === 'accounts').length;
  const totalContacts = records.filter(r => r.objectId === 'contacts').length;
  const totalLeads = records.filter(r => r.objectId === 'leads').length;
  
  // Calculate pipeline value
  const oppRecords = records.filter(r => r.objectId === 'opportunities');
  const pipelineValue = oppRecords
    .filter(r => r.data.stage !== 'Closed Lost')
    .reduce((sum, r) => sum + (Number(r.data.amount) || 0), 0);

  // Custom objects count
  const customObjects = objects.filter(o => o.isCustom);
  const totalCustomRecords = records.filter(r => {
    const obj = objects.find(o => o.id === r.objectId);
    return obj?.isCustom;
  }).length;

  // Lead status aggregation for custom chart
  const leadStatusCounts = {
    New: 0,
    Contacting: 0,
    Nurturing: 0,
    Qualified: 0
  };
  records.filter(r => r.objectId === 'leads').forEach(r => {
    const status = r.data.status;
    if (status in leadStatusCounts) {
      leadStatusCounts[status as keyof typeof leadStatusCounts]++;
    }
  });

  // Opportunity Stage aggregation
  const oppStages = [
    { name: 'Prospecting', value: 0 },
    { name: 'Proposal', value: 0 },
    { name: 'Negotiation', value: 0 },
    { name: 'Closed Won', value: 0 }
  ];
  oppRecords.forEach(r => {
    const stage = r.data.stage || '';
    if (stage.includes('Prospecting')) oppStages[0].value += Number(r.data.amount) || 0;
    else if (stage.includes('Proposal')) oppStages[1].value += Number(r.data.amount) || 0;
    else if (stage.includes('Negotiation')) oppStages[2].value += Number(r.data.amount) || 0;
    else if (stage.includes('Closed Won')) oppStages[3].value += Number(r.data.amount) || 0;
  });

  const maxStageValue = Math.max(...oppStages.map(s => s.value), 100000);

  return (
    <div className="space-y-4 p-4 md:p-6 max-w-7xl mx-auto overflow-y-auto h-[calc(100vh-3.5rem)]" id="dashboard-root">
      {/* Welcome Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded p-4 relative overflow-hidden shadow-sm" id="dash-welcome">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <Icons.Sliders className="h-24 w-24 text-slate-100" />
        </div>
        <div className="relative z-10 max-w-3xl space-y-2">
          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded border border-emerald-500/20 uppercase tracking-widest">
            Enterprise Deployment LIVE
          </span>
          <h2 className="text-base font-bold text-slate-100 tracking-tight">
            Performant Postgres JSONB CRM Engine
          </h2>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Welcome to the open-source alternative to proprietary logins. Manage structures and trigger sequences dynamically using optimized PostgreSQL schema representations without vendor locks.
          </p>
          <div className="pt-2 flex flex-wrap gap-2">
            <button
              onClick={() => setCurrentTab('schema')}
              className="px-2.5 py-1 bg-indigo-650 hover:bg-indigo-600 text-white text-[10px] font-semibold rounded flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs border border-indigo-600"
            >
              <Icons.PlusSquare className="h-3 w-3" />
              <span>Design Custom Schema</span>
            </button>
            <button
              onClick={() => setCurrentTab('workflows')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold rounded flex items-center space-x-1.5 border border-slate-700 transition"
            >
              <Icons.Workflow className="h-3 w-3 text-emerald-450" />
              <span>Configure Flow Builders</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="dash-kpi-grid">
        {/* Metric 1 */}
        <div className="bg-white border border-slate-200 p-3 rounded shadow-xs hover:shadow-sm transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pipeline Value</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded">
              <Icons.Briefcase className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-xl font-bold text-slate-900">
              ${pipelineValue.toLocaleString()}
            </h3>
            <p className="text-slate-400 text-[10px] mt-0.5 flex items-center space-x-1">
              <span className="text-emerald-600 font-semibold inline-flex items-center">
                ↑ 12%
              </span>
              <span>vs last month</span>
            </p>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-slate-200 p-3 rounded shadow-xs hover:shadow-sm transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active Customers</span>
            <div className="p-1.5 bg-sky-50 text-sky-600 rounded">
              <Icons.Building2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-xl font-bold text-slate-900">{totalAccounts}</h3>
            <p className="text-slate-400 text-[10px] mt-0.5">
              <span>{totalContacts} contacts mapped</span>
            </p>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-slate-200 p-3 rounded shadow-xs hover:shadow-sm transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active Leads</span>
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded">
              <Icons.Target className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-xl font-bold text-slate-900">{totalLeads}</h3>
            <p className="text-slate-400 text-[10px] mt-0.5 flex items-center space-x-1">
              <span className="text-indigo-600 font-semibold">{leadStatusCounts.Qualified} Qualified</span>
            </p>
          </div>
        </div>

        {/* Metric 4 (Design HTML Highlight style) */}
        <div className="bg-indigo-50/50 border border-indigo-100 p-3 rounded shadow-xs hover:shadow-sm transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">System Health</span>
            <div className="p-1.5 bg-indigo-100 text-indigo-605 rounded">
              <Icons.Cpu className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-xl font-extrabold text-indigo-900">Optimal</h3>
            <p className="text-indigo-500 text-[10px] mt-0.5 font-semibold">
              <span>Metadata engine active</span>
            </p>
          </div>
        </div>
      </div>

      {/* Visual Analytics Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" id="dash-charts">
        {/* Chart A: Opportunity Sales Funnel */}
        <div className="bg-white border border-slate-200 rounded p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-xs font-extrabold text-slate-900">Opportunity Stage Volume ($)</h4>
              <p className="text-slate-500 text-[10px]">Sum of values grouped dynamically by stages</p>
            </div>
            <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 font-semibold">Live Formulas</span>
          </div>

          <div className="space-y-4">
            {oppStages.map((stage, i) => {
              const percentage = Math.min((stage.value / maxStageValue) * 100, 100);
              const barColors = [
                'bg-slate-300',
                'bg-indigo-300',
                'bg-indigo-500',
                'bg-indigo-700'
              ];
              return (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-[11px] font-medium">
                    <span className="text-slate-600">{stage.name}</span>
                    <span className="text-slate-900 font-semibold">${stage.value.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded overflow-hidden flex">
                    <div
                      className={`h-full ${barColors[i] || 'bg-slate-400'} rounded transition-all duration-1000`}
                      style={{ width: `${Math.max(percentage, 4)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span>Evaluating {oppRecords.length} opportunity rows</span>
            <button
              onClick={() => setCurrentTab('records')}
              className="text-indigo-600 hover:text-indigo-705 inline-flex items-center space-x-1 font-bold cursor-pointer"
            >
              <span>View Data</span>
              <Icons.ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Chart B: Inbound Funnel Curve */}
        <div className="bg-white border border-slate-200 rounded p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-xs font-extrabold text-slate-900">Lead Conversion Curve</h4>
              <p className="text-slate-500 text-[10px]">Prospect metrics across validation stages</p>
            </div>
            <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-250 font-semibold">JSONB Rows</span>
          </div>

          <div className="flex items-end justify-between h-36 px-2 pt-4 relative border-b border-slate-200">
            {/* Visual background lines */}
            <div className="absolute inset-x-0 top-1/4 border-t border-slate-100 border-dashed" />
            <div className="absolute inset-x-0 top-2/4 border-t border-slate-100 border-dashed" />
            <div className="absolute inset-x-0 top-3/4 border-t border-slate-100 border-dashed" />

            {Object.entries(leadStatusCounts).map(([status, count]) => {
              const percentage = totalLeads ? (count / totalLeads) * 100 : 0;
              return (
                <div key={status} className="flex flex-col items-center flex-1 space-y-2 z-10">
                  <div className="text-[10px] font-bold text-slate-900 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 leading-none">
                    {count}
                  </div>
                  <div className="w-8 bg-indigo-100 hover:bg-indigo-150 rounded-t transition-all duration-700 relative group" style={{ height: `${Math.max(percentage * 0.65, 8)}px` }}>
                    <div className="absolute inset-x-0 bottom-0 bg-indigo-500 h-[4px] rounded-t group-hover:h-full transition-all duration-300" />
                  </div>
                  <span className="text-[9px] text-slate-500 font-semibold whitespace-nowrap overflow-hidden text-ellipsis max-w-[64px]">
                    {status}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-1 flex items-center justify-between text-[10px] text-slate-400">
            <span>Aggregate: {totalLeads} prospects total</span>
            <span className="text-indigo-650 font-bold">Calculation OK</span>
          </div>
        </div>
      </div>

      {/* App Mechanics Section */}
      <div className="bg-slate-50 rounded p-4 border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4" id="dash-mechanics">
        <div className="space-y-1">
          <div className="flex items-center space-x-1.5 text-slate-700 font-extrabold">
            <Icons.Database className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-xs">Schema Base</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Schema configurations are defined as simple objects containing type fields. No DB alterations are required.
          </p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center space-x-1.5 text-slate-700 font-extrabold">
            <Icons.Layers className="h-3.5 w-3.5 text-sky-500" />
            <span className="text-xs">JSONB Store</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Records are saved in PostgreSQL columns. Lookup connections enable lightning fast relational queries.
          </p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center space-x-1.5 text-slate-700 font-extrabold">
            <Icons.Workflow className="h-3.5 w-3.5 text-indigo-500" />
            <span className="text-xs">Trigger Loops</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Triggers monitor modified database states and enqueue jobs in workers automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
