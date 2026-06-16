/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CRMFieldType = 'text' | 'number' | 'email' | 'picklist' | 'formula' | 'lookup';

export interface CRMField {
  id: string;         // e.g. "email", "custom_field_c"
  name: string;       // e.g. "email", "amount_due__c"
  label: string;      // e.g. "Email Address", "Amount Due"
  type: CRMFieldType;
  required: boolean;
  defaultValue?: string | number | boolean;
  options?: string[]; // Used for picklist types
  formula?: string;   // Used for formula type, e.g., "{amount} * 1.2"
  relatedTo?: string; // Used for lookup type, stores the target objectId (e.g., "accounts")
}

export interface CRMObject {
  id: string;         // e.g. "accounts", "leads", "custom_equipment__c"
  label: string;      // e.g. "Account", "Lead", "Equipment"
  labelPlural: string; // e.g. "Accounts", "Leads", "Equipments"
  isCustom: boolean;
  fields: CRMField[];
  icon: string;       // Lucide icon key name
}

export interface CRMRecord {
  id: string;
  objectId: string;   // Maps to CRMObject.id
  data: Record<string, any>; // Dynamic structure (like JSONB dynamic column in postgres)
  createdAt: string;
  updatedAt: string;
}

export type WorkflowTriggerType = 'create' | 'update' | 'all';

export interface WorkflowTriggerConfig {
  objectId: string;
  type: WorkflowTriggerType;
  fieldId?: string;       // Optional condition field
  operator?: 'equals' | 'changed_to' | 'greater_than' | 'always';
  value?: string | number;
}

export type WorkflowActionType = 'create_task' | 'update_field' | 'send_email' | 'log_event';

export interface WorkflowActionConfig {
  type: WorkflowActionType;
  // Dynamic fields depending on action type
  taskSubject?: string;
  taskAssignTo?: string;
  updateFieldId?: string;
  updateValue?: string;
  emailTo?: string;
  emailSubject?: string;
  emailBody?: string;
  logMessage?: string;
}

export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'condition' | 'action';
  label: string;
  description: string;
  config: WorkflowTriggerConfig | WorkflowActionConfig | any;
  position: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  objectId: string; // Dynamic target Object CRM reference
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface SystemLog {
  id: string;
  timestamp: string;
  type: 'sql' | 'queue' | 'workflow' | 'action' | 'info';
  message: string;
  sqlQuery?: string; // Simulated SQL executing inside relational JSONB store
  payload?: string;  // Detailed log payload
}

export interface User {
  id: string;
  name: string;
  email: string;
  roleId: string;
}

export interface RolePermission {
  objectId: string;
  read: boolean;
  write: boolean;
  fieldPermissions: Record<string, 'write' | 'read' | 'none'>;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  isAdmin: boolean;
  allowTriggerAutomation: boolean;
  permissions: RolePermission[];
}
