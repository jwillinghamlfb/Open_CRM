/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CRMObject, CRMRecord, Workflow, User, Role } from '../types';

export const INITIAL_OBJECTS: CRMObject[] = [
  {
    id: 'accounts',
    label: 'Account',
    labelPlural: 'Accounts',
    isCustom: false,
    icon: 'Building2',
    fields: [
      { id: 'name', name: 'name', label: 'Account Name', type: 'text', required: true },
      { id: 'industry', name: 'industry', label: 'Industry', type: 'picklist', required: false, options: ['Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Energy', 'Retail'] },
      { id: 'revenue', name: 'revenue', label: 'Annual Revenue ($)', type: 'number', required: false },
      { id: 'website', name: 'website', label: 'Website', type: 'text', required: false },
      { id: 'rating', name: 'rating', label: 'Account Tier', type: 'picklist', required: false, options: ['Enterprise', 'Mid-market', 'Growth', 'SMB'] }
    ]
  },
  {
    id: 'contacts',
    label: 'Contact',
    labelPlural: 'Contacts',
    isCustom: false,
    icon: 'Users',
    fields: [
      { id: 'first_name', name: 'first_name', label: 'First Name', type: 'text', required: true },
      { id: 'last_name', name: 'last_name', label: 'Last Name', type: 'text', required: true },
      { id: 'email', name: 'email', label: 'Email', type: 'email', required: true },
      { id: 'account_id', name: 'account_id', label: 'Account', type: 'lookup', required: false, relatedTo: 'accounts' },
      { id: 'title', name: 'title', label: 'Job Title', type: 'text', required: false },
      { id: 'phone', name: 'phone', label: 'Phone Number', type: 'text', required: false }
    ]
  },
  {
    id: 'leads',
    label: 'Lead',
    labelPlural: 'Leads',
    isCustom: false,
    icon: 'Target',
    fields: [
      { id: 'first_name', name: 'first_name', label: 'First Name', type: 'text', required: true },
      { id: 'last_name', name: 'last_name', label: 'Last Name', type: 'text', required: true },
      { id: 'company', name: 'company', label: 'Company', type: 'text', required: true },
      { id: 'email', name: 'email', label: 'Email', type: 'email', required: false },
      { id: 'status', name: 'status', label: 'Lead Status', type: 'picklist', required: true, defaultValue: 'New', options: ['New', 'Contacting', 'Nurturing', 'Qualified', 'Unqualified'] },
      { id: 'rating', name: 'rating', label: 'Rating', type: 'picklist', required: false, options: ['Cold', 'Warm', 'Hot'] }
    ]
  },
  {
    id: 'opportunities',
    label: 'Opportunity',
    labelPlural: 'Opportunities',
    isCustom: false,
    icon: 'Briefcase',
    fields: [
      { id: 'name', name: 'name', label: 'Opp Name', type: 'text', required: true },
      { id: 'account_id', name: 'account_id', label: 'Account', type: 'lookup', required: true, relatedTo: 'accounts' },
      { id: 'amount', name: 'amount', label: 'Deal Value ($)', type: 'number', required: true },
      { id: 'stage', name: 'stage', label: 'Stage', type: 'picklist', required: true, defaultValue: 'Prospecting', options: ['Prospecting', 'Proposal/Price Quote', 'Negotiation/Review', 'Closed Won', 'Closed Lost'] },
      { id: 'expected_revenue', name: 'expected_revenue', label: 'Weighted Value ($)', type: 'formula', required: false, formula: '{amount} * 0.85' }
    ]
  },
  {
    id: 'tasks',
    label: 'Task',
    labelPlural: 'Tasks',
    isCustom: false,
    icon: 'CheckSquare',
    fields: [
      { id: 'subject', name: 'subject', label: 'Subject', type: 'text', required: true },
      { id: 'priority', name: 'priority', label: 'Priority', type: 'picklist', required: true, defaultValue: 'Normal', options: ['Low', 'Normal', 'High', 'Critical'] },
      { id: 'status', name: 'status', label: 'Status', type: 'picklist', required: true, defaultValue: 'Not Started', options: ['Not Started', 'In Progress', 'Completed', 'Deferred'] },
      { id: 'contact_id', name: 'contact_id', label: 'Contact Lookup', type: 'lookup', required: false, relatedTo: 'contacts' },
      { id: 'account_id', name: 'account_id', label: 'Account Lookup', type: 'lookup', required: false, relatedTo: 'accounts' },
      { id: 'description', name: 'description', label: 'Description', type: 'text', required: false }
    ]
  },
  {
    id: 'equipments__c',
    label: 'Equipment Inventory',
    labelPlural: 'Equipment Assets',
    isCustom: true,
    icon: 'Cpu',
    fields: [
      { id: 'serial', name: 'serial', label: 'Asset Serial #', type: 'text', required: true },
      { id: 'model', name: 'model', label: 'Hardware Model', type: 'text', required: true },
      { id: 'status', name: 'status', label: 'Deployment Status', type: 'picklist', required: true, defaultValue: 'Available', options: ['Available', 'Deployed', 'Under Maintenance', 'Retired'] },
      { id: 'account_id', name: 'account_id', label: 'Assigned Client Account', type: 'lookup', required: false, relatedTo: 'accounts' },
      { id: 'purchase_cost', name: 'purchase_cost', label: 'Purchase Cost ($)', type: 'number', required: false },
      { id: 'estimated_lifespan', name: 'estimated_lifespan', label: 'Warranty (Years)', type: 'number', required: false },
      { id: 'asset_book_value', name: 'asset_book_value', label: 'Est. Annual Maintenance ($)', type: 'formula', required: false, formula: '{purchase_cost} * 0.12' }
    ]
  }
];

export const INITIAL_RECORDS: CRMRecord[] = [
  // Accounts
  {
    id: 'acc1',
    objectId: 'accounts',
    data: {
      name: 'Acme Cloud Solutions',
      industry: 'Technology',
      revenue: 12500000,
      website: 'https://acme-cloud.io',
      rating: 'Enterprise'
    },
    createdAt: '2026-04-12T10:00:00Z',
    updatedAt: '2026-06-12T14:30:00Z'
  },
  {
    id: 'acc2',
    objectId: 'accounts',
    data: {
      name: 'Stripe Payment Processing',
      industry: 'Finance',
      revenue: 85000000,
      website: 'https://stripe.com',
      rating: 'Enterprise'
    },
    createdAt: '2026-04-14T09:15:00Z',
    updatedAt: '2026-05-20T11:22:00Z'
  },
  {
    id: 'acc3',
    objectId: 'accounts',
    data: {
      name: 'Mayo Clinical Diagnostics',
      industry: 'Healthcare',
      revenue: 4500000,
      website: 'https://mayo-diag.org',
      rating: 'Mid-market'
    },
    createdAt: '2026-05-01T15:40:00Z',
    updatedAt: '2026-05-01T15:40:00Z'
  },
  {
    id: 'acc4',
    objectId: 'accounts',
    data: {
      name: 'Patriot Outdoors Inc.',
      industry: 'Retail',
      revenue: 850000,
      website: 'https://patriotoutdoors.com',
      rating: 'SMB'
    },
    createdAt: '2026-05-18T11:00:00Z',
    updatedAt: '2026-06-14T10:05:00Z'
  },

  // Contacts
  {
    id: 'con1',
    objectId: 'contacts',
    data: {
      first_name: 'Thomas',
      last_name: 'Mueller',
      email: 't.mueller@acme-cloud.io',
      account_id: 'acc1',
      title: 'VP of Platform Infrastructure',
      phone: '+1 (555) 234-5678'
    },
    createdAt: '2026-04-12T10:30:00Z',
    updatedAt: '2026-06-11T16:45:00Z'
  },
  {
    id: 'con2',
    objectId: 'contacts',
    data: {
      first_name: 'Sarah',
      last_name: 'Jenkins',
      email: 'sjenkins@stripe.com',
      account_id: 'acc2',
      title: 'Senior Procurement Director',
      phone: '+1 (555) 890-1234'
    },
    createdAt: '2026-04-14T09:40:00Z',
    updatedAt: '2026-04-15T12:00:00Z'
  },
  {
    id: 'con3',
    objectId: 'contacts',
    data: {
      first_name: 'Dr. Aaron',
      last_name: 'Finch',
      email: 'finch.a@mayo-diag.org',
      account_id: 'acc3',
      title: 'Chief IT Architect',
      phone: '+1 (555) 765-4321'
    },
    createdAt: '2026-05-01T16:00:00Z',
    updatedAt: '2026-05-01T16:00:00Z'
  },

  // Leads
  {
    id: 'lead1',
    objectId: 'leads',
    data: {
      first_name: 'Jack',
      last_name: 'Dorsey',
      company: 'Block Inc.',
      email: 'jack@block.xyz',
      status: 'New',
      rating: 'Warm'
    },
    createdAt: '2026-06-01T08:00:00Z',
    updatedAt: '2026-06-01T08:00:00Z'
  },
  {
    id: 'lead2',
    objectId: 'leads',
    data: {
      first_name: 'Melissa',
      last_name: 'Mayer',
      company: 'Lumi Labs',
      email: 'melissa@lumilabs.co',
      status: 'Contacting',
      rating: 'Warm'
    },
    createdAt: '2026-06-10T14:30:00Z',
    updatedAt: '2026-06-12T17:10:00Z'
  },
  {
    id: 'lead3',
    objectId: 'leads',
    data: {
      first_name: 'Elon',
      last_name: 'Musk',
      company: 'X Aerospace Corp',
      email: 'elon@x-aero.com',
      status: 'Qualified',
      rating: 'Hot'
    },
    createdAt: '2026-06-12T09:00:00Z',
    updatedAt: '2026-06-15T11:00:00Z'
  },

  // Opportunities
  {
    id: 'opp1',
    objectId: 'opportunities',
    data: {
      name: 'Acme Cloud Enterprise Suite Upgrade',
      account_id: 'acc1',
      amount: 120000,
      stage: 'Proposal/Price Quote',
      expected_revenue: 0 // Will be evaluated dynamically by formula engine
    },
    createdAt: '2026-04-20T11:00:00Z',
    updatedAt: '2026-06-10T14:00:00Z'
  },
  {
    id: 'opp2',
    objectId: 'opportunities',
    data: {
      name: 'Stripe Gateway APAC Phase II',
      account_id: 'acc2',
      amount: 450000,
      stage: 'Negotiation/Review',
      expected_revenue: 0
    },
    createdAt: '2026-04-25T13:20:00Z',
    updatedAt: '2026-06-14T09:10:00Z'
  },

  // Tasks
  {
    id: 'task1',
    objectId: 'tasks',
    data: {
      subject: 'Deliver Enterprise Security whitepaper',
      priority: 'High',
      status: 'In Progress',
      contact_id: 'con1',
      account_id: 'acc1',
      description: 'Make sure it highlights SOC2 compliance, ISO 27001, and HIPAA details.'
    },
    createdAt: '2026-06-12T15:00:00Z',
    updatedAt: '2026-06-13T10:00:00Z'
  },
  {
    id: 'task2',
    objectId: 'tasks',
    data: {
      subject: 'Review APAC localized contract markup',
      priority: 'Critical',
      status: 'Not Started',
      contact_id: 'con2',
      account_id: 'acc2',
      description: 'Waiting on comments from legal team in Singapore.'
    },
    createdAt: '2026-06-14T11:15:00Z',
    updatedAt: '2026-06-14T11:15:00Z'
  },

  // Equipment assets
  {
    id: 'equip1',
    objectId: 'equipments__c',
    data: {
      serial: 'SN-XF-89304-BLU',
      model: 'Enterprise G9 Blade Server - 128 Core',
      status: 'Deployed',
      account_id: 'acc1',
      purchase_cost: 32000,
      estimated_lifespan: 5,
      asset_book_value: 0
    },
    createdAt: '2026-05-10T09:00:00Z',
    updatedAt: '2026-06-01T15:45:00Z'
  },
  {
    id: 'equip2',
    objectId: 'equipments__c',
    data: {
      serial: 'SN-XF-29014-GND',
      model: 'Optical Calibration Station Tier 3',
      status: 'Under Maintenance',
      account_id: 'acc3',
      purchase_cost: 125000,
      estimated_lifespan: 3,
      asset_book_value: 0
    },
    createdAt: '2026-05-15T11:30:00Z',
    updatedAt: '2026-06-15T10:00:00Z'
  }
];

export const INITIAL_WORKFLOWS: Workflow[] = [
  {
    id: 'wf1',
    name: 'Lead Qualification Alert & Log',
    description: 'When a Lead is qualified, trigger a critical event queue to update opportunity likelihood, print standard log, and auto-create a Task.',
    isActive: true,
    objectId: 'leads',
    nodes: [
      {
        id: 'node-trigger',
        type: 'trigger',
        label: 'Trigger: Lead Status Qualified',
        description: 'Fires immediately when a lead is created/updated to "Qualified"',
        position: { x: 250, y: 50 },
        config: {
          objectId: 'leads',
          type: 'update',
          fieldId: 'status',
          operator: 'equals',
          value: 'Qualified'
        }
      },
      {
        id: 'node-log',
        type: 'action',
        label: 'Action: Queue System Event',
        description: 'Enqueue a PostgreSQL transactional logging event in the BullMQ task broker',
        position: { x: 250, y: 170 },
        config: {
          type: 'log_event',
          logMessage: 'Database trigger FIRED: Lead qualified! Submitting to routing system.'
        }
      },
      {
        id: 'node-create-task',
        type: 'action',
        label: 'Action: Create Follow-up Task',
        description: 'Automatically creates a follow-up Task called "Conduct Executive Welcome Callback"',
        position: { x: 250, y: 290 },
        config: {
          type: 'create_task',
          taskSubject: 'Conduct Executive Welcome Callback',
          taskAssignTo: 'Sales Engineering Team',
          taskPriority: 'High',
          taskDescription: 'Automated Flow Task: Lead was qualified. Arrange introductory alignment call.'
        }
      },
      {
        id: 'node-send-email',
        type: 'action',
        label: 'Action: Exec Portal Email Response',
        description: 'Send greeting notice back into communication node',
        position: { x: 250, y: 410 },
        config: {
          type: 'send_email',
          emailTo: 'executive-relations@enterprise-crm.local',
          emailSubject: 'CRITICAL ALERT: High-Value Prospect Qualified',
          emailBody: 'An executive lead has been updated to Qualified status. Action triggers completed.'
        }
      }
    ],
    edges: [
      { id: 'edge1', source: 'node-trigger', target: 'node-log' },
      { id: 'edge2', source: 'node-log', target: 'node-create-task' },
      { id: 'edge3', source: 'node-create-task', target: 'node-send-email' }
    ]
  },
  {
    id: 'wf2',
    name: 'Asset Maintenance Guard',
    description: 'Fires when equipment goes Under Maintenance to log safety compliance and create a technician task.',
    isActive: true,
    objectId: 'equipments__c',
    nodes: [
      {
        id: 'node-trigger-eq',
        type: 'trigger',
        label: 'Trigger: Equipment Maintenance Status',
        description: 'Fires when "Deployment Status" changes to "Under Maintenance"',
        position: { x: 250, y: 50 },
        config: {
          objectId: 'equipments__c',
          type: 'update',
          fieldId: 'status',
          operator: 'equals',
          value: 'Under Maintenance'
        }
      },
      {
        id: 'node-log-eq',
        type: 'action',
        label: 'Action: Log Compliance Entry',
        description: 'Write warning event into transaction database logs',
        position: { x: 250, y: 180 },
        config: {
          type: 'log_event',
          logMessage: 'SAFETY WARNING: Hardware equipment entered Under Maintenance phase. Warranties validated.'
        }
      },
      {
        id: 'node-task-eq',
        type: 'action',
        label: 'Action: Repair & Calibrate Unit',
        description: 'Dispatches technician standard task',
        position: { x: 250, y: 310 },
        config: {
          type: 'create_task',
          taskSubject: 'Urgent: Hardware Calibration & Physical Inspection',
          taskPriority: 'Critical',
          taskDescription: 'Flow Trigger Task: Conduct certified field check of offline safety assets.'
        }
      }
    ],
    edges: [
      { id: 'edgeeq1', source: 'node-trigger-eq', target: 'node-log-eq' },
      { id: 'edgeeq2', source: 'node-log-eq', target: 'node-task-eq' }
    ]
  }
];

export const INITIAL_ROLES: Role[] = [
  {
    id: 'admin',
    name: 'System Administrator',
    description: 'Full read/write master clearance across all metadata entities, relational datastores, and trigger automations.',
    isAdmin: true,
    allowTriggerAutomation: true,
    permissions: []
  },
  {
    id: 'sales_rep',
    name: 'Standard Sales Specialist',
    description: 'Authorized to read/write Leads, Contacts, Tasks and Opportunities, read-only on Accounts (with FLS locked on Annual Revenue & Tier), and forbidden from touching Equipment Assets.',
    isAdmin: false,
    allowTriggerAutomation: true,
    permissions: [
      {
        objectId: 'accounts',
        read: true,
        write: false,
        fieldPermissions: {
          name: 'write',
          industry: 'read',
          revenue: 'none',   // Secret financial data
          website: 'read',
          rating: 'read'     // Read-only
        }
      },
      {
        objectId: 'contacts',
        read: true,
        write: true,
        fieldPermissions: {
          first_name: 'write',
          last_name: 'write',
          email: 'write',
          account_id: 'write',
          title: 'write',
          phone: 'write'
        }
      },
      {
        objectId: 'leads',
        read: true,
        write: true,
        fieldPermissions: {
          first_name: 'write',
          last_name: 'write',
          company: 'write',
          email: 'write',
          status: 'write',
          rating: 'write'
        }
      },
      {
        objectId: 'opportunities',
        read: true,
        write: true,
        fieldPermissions: {
          name: 'write',
          account_id: 'write',
          amount: 'write',
          stage: 'write',
          expected_revenue: 'read' // Protected by formula
        }
      },
      {
        objectId: 'tasks',
        read: true,
        write: true,
        fieldPermissions: {
          subject: 'write',
          priority: 'write',
          status: 'write',
          contact_id: 'write',
          account_id: 'write',
          description: 'write'
        }
      },
      {
        objectId: 'equipments__c',
        read: false, // Sales reps are completely blind to technical hardware
        write: false,
        fieldPermissions: {}
      }
    ]
  },
  {
    id: 'support_agent',
    name: 'Customer Support Representative',
    description: 'Read-only access across Accounts, Contacts, and Equipment Assets. Entirely restricted from writing, modifying, or launching active automation loops.',
    isAdmin: false,
    allowTriggerAutomation: false,
    permissions: [
      {
        objectId: 'accounts',
        read: true,
        write: false,
        fieldPermissions: {
          name: 'read',
          industry: 'read',
          revenue: 'none',
          website: 'read',
          rating: 'read'
        }
      },
      {
        objectId: 'contacts',
        read: true,
        write: false,
        fieldPermissions: {
          first_name: 'read',
          last_name: 'read',
          email: 'read',
          account_id: 'read',
          title: 'read',
          phone: 'read'
        }
      },
      {
        objectId: 'leads',
        read: false,
        write: false,
        fieldPermissions: {}
      },
      {
        objectId: 'opportunities',
        read: false,
        write: false,
        fieldPermissions: {}
      },
      {
        objectId: 'tasks',
        read: true,
        write: false,
        fieldPermissions: {
          subject: 'read',
          priority: 'read',
          status: 'read',
          contact_id: 'read',
          account_id: 'read',
          description: 'read'
        }
      },
      {
        objectId: 'equipments__c',
        read: true,
        write: false,
        fieldPermissions: {
          serial: 'read',
          model: 'read',
          status: 'read',
          account_id: 'read',
          purchase_cost: 'none', // Locked pricing metadata
          estimated_lifespan: 'read',
          asset_book_value: 'read'
        }
      }
    ]
  }
];

export const INITIAL_USERS: User[] = [
  {
    id: 'u1',
    name: 'Marc Benioff (CEO/Admin)',
    email: 'm.benioff@metastash-crm.com',
    roleId: 'admin'
  },
  {
    id: 'u2',
    name: 'Alice Cooper (Senior Account Rep)',
    email: 'acooper@metastash-crm.com',
    roleId: 'sales_rep'
  },
  {
    id: 'u3',
    name: 'David Gilmour (Support Agent)',
    email: 'dgilmour@support.metastash.com',
    roleId: 'support_agent'
  }
];
