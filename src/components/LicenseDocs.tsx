/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import * as Icons from 'lucide-react';

export default function LicenseDocs() {
  return (
    <div className="space-y-3 p-3 max-w-4xl mx-auto animate-fadeIn" id="license-docs-root">
      
      {/* Title */}
      <div className="space-y-0.5">
        <div className="flex items-center space-x-1.5">
          <Icons.BookOpen className="h-4 w-4 text-indigo-600" />
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">Open-Source Core Strategy & Legals</h2>
        </div>
        <p className="text-slate-500 text-[10px]">How to architect and license metadata-driven B2B systems legally and safely.</p>
      </div>

      {/* AGPLv3 Strategy Card */}
      <div className="bg-white border border-slate-205 rounded p-3 space-y-2">
        <div className="flex items-center space-x-1.5 text-slate-805 font-bold text-xs">
          <Icons.ShieldAlert className="h-3.5 w-3.5 text-indigo-650" />
          <span>The AGPLv3 &quot;Copyleft&quot; License Armor</span>
        </div>
        <p className="text-[11px] text-slate-600 leading-normal">
          Large cloud hosting platforms can fork open-source databases, package them inside a paid proprietary layer, and monetize them without contributing edits back. AGPLv3 prevents this scenario.
        </p>
        <div className="p-2 bg-slate-50 rounded border border-slate-200 text-[10px] space-y-1">
          <p className="font-bold text-slate-800 uppercase text-[9px] tracking-wide">Why AGPLv3 is the ultimate shield for a B2B SaaS platform:</p>
          <ul className="list-disc pl-4 space-y-1 text-slate-600">
            <li><strong>Trigger on Network Access:</strong> Standard GPLv3 only mandates releasing source code if distributing compiled binaries. Since SaaS apps are hosted, AGPLv3 closes this loophole on network access.</li>
            <li><strong>Enforces Contribution:</strong> Anyone offering customized copies as a cloud CRM solution must publish their complete modified codebase under the same license terms.</li>
          </ul>
        </div>
      </div>

      {/* Precedents table */}
      <div className="bg-white border border-slate-205 rounded shadow-sm overflow-hidden">
        <div className="p-2 px-3 bg-slate-50 border-b border-slate-150">
          <h4 className="text-xs font-bold text-slate-900">Studying Open-Source Precedents</h4>
          <p className="text-slate-450 text-[10px]">These platforms successfully conquered various facets of metadata CRM design:</p>
        </div>
        <div className="divide-y divide-slate-150 text-[11px]">
          <div className="p-2 px-3 grid grid-cols-1 md:grid-cols-3 gap-1">
            <span className="font-bold text-slate-800">Supabase & PocketBase</span>
            <span className="md:col-span-2 text-slate-605 leading-normal">
              Demonstrated how to expose immediate client-safe REST and GraphQL APIs over relational schemas, packaging authentication and tables.
            </span>
          </div>

          <div className="p-2 px-3 grid grid-cols-1 md:grid-cols-3 gap-1 col-span-1">
            <span className="font-bold text-slate-800">NocoDB & Baserow</span>
            <span className="md:col-span-2 text-slate-605 leading-normal">
              These &quot;Airtable alternatives&quot; cracked custom grid managers, showing how non-technical operators map and filter columns.
            </span>
          </div>

          <div className="p-2 px-3 grid grid-cols-1 md:grid-cols-3 gap-1">
            <span className="font-bold text-slate-800">Activepieces & n8n</span>
            <span className="md:col-span-2 text-slate-605 leading-normal">
              Established standard node-based workflow configurations, showing how visual nodes compile into background queues.
            </span>
          </div>
        </div>
      </div>

      {/* Legal boundary strategy */}
      <div className="bg-slate-900 border border-slate-800 rounded p-3 text-white space-y-2">
        <div className="flex items-center space-x-2 font-bold text-slate-205 text-xs">
          <Icons.Award className="h-4 w-4 text-emerald-400" />
          <span>Bypassing Intellectual Property Disputes</span>
        </div>
        <p className="text-[10px] text-slate-400 leading-normal">
          Defend against trademark litigation by implementing strict architectural separation of concerns:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div className="space-y-1 bg-slate-950 p-2.5 rounded border border-slate-800 text-[10px]">
            <div className="text-emerald-400 font-bold uppercase text-[9px] tracking-wider">🚫 Avoid Apex or SOQL Language</div>
            <p className="text-slate-400 leading-normal">
              Implementing proprietary query syntaxes introduces litigation risks. Instead, utilize standard JavaScript scripts for calculated variables, and conventional JSON API parameters.
            </p>
          </div>

          <div className="space-y-1 bg-slate-950 p-2.5 rounded border border-slate-800 text-[10px]">
            <div className="text-emerald-400 font-bold uppercase text-[9px] tracking-wider">🚫 Independent UI Customizations</div>
            <p className="text-slate-400 leading-normal">
              Avoid importing Lightning stylesheet tokens or trademark assets. Build an optimized, high-density professional theme (such as this template) to maintain full creative freedom.
            </p>
          </div>
        </div>
      </div>

      {/* Database Performance Tips */}
      <div className="bg-white border border-slate-205 rounded p-3 space-y-1.5">
        <div className="flex items-center space-x-1.5 text-slate-800 font-bold text-xs">
          <Icons.Sliders className="h-3.5 w-3.5 text-indigo-650" />
          <span>Dynamic PostgreSQL JSONB Optimization</span>
        </div>
        <p className="text-[11px] text-slate-600 leading-normal">
          Frequent RELATIONAL structure alterations under high concurrent queues cause heavy transaction locks. Package customizable properties within a single indexed <strong>JSONB document block</strong>. This enables seamless dynamic schemas while keeping index reads lightning-fast using database <strong>GIN index lookups</strong>.
        </p>
      </div>

    </div>
  );
}
