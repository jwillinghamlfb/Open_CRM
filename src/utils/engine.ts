/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CRMObject, CRMRecord, CRMField, Workflow, SystemLog, WorkflowNode } from '../types';

/**
 * Safely evaluates local custom formula fields inside a record utilizing its existing JSONB data context.
 * Example formula: "{purchase_cost} * 0.12" or "{hourly_rate} * 8"
 */
export function evaluateFormula(formula: string, data: Record<string, any>): number {
  try {
    // Regex to match variable fields inside curly braces e.g., {purchase_cost}
    const variableRegex = /\{([a-zA-Z0-9_]+)\}/g;
    let sanitizedFormula = formula;
    let match;

    while ((match = variableRegex.exec(formula)) !== null) {
      const fieldName = match[1];
      const fieldValue = data[fieldName] !== undefined ? Number(data[fieldName]) : 0;
      sanitizedFormula = sanitizedFormula.replace(match[0], isNaN(fieldValue) ? '0' : String(fieldValue));
    }

    // Evaluate mathematical expression safely (only allows math operators, digits, spaces, decimals)
    if (/^[0-9+\-*/().\s]+$/.test(sanitizedFormula)) {
      // Use Function constructor instead of eval to evaluate safe arithmetic expression
      const result = new Function(`return (${sanitizedFormula})`)();
      return Number(Number(result).toFixed(2));
    }
    return 0;
  } catch (error) {
    console.error('Formula evaluation error:', error);
    return 0;
  }
}

/**
 * Evaluates all formulas for a given record.
 */
export function processRecordFormulas(record: CRMRecord, fields: CRMField[]): CRMRecord {
  const updatedData = { ...record.data };
  let hasChanges = false;

  fields.forEach(field => {
    if (field.type === 'formula' && field.formula) {
      const calculated = evaluateFormula(field.formula, updatedData);
      if (updatedData[field.id] !== calculated) {
        updatedData[field.id] = calculated;
        hasChanges = true;
      }
    }
  });

  if (hasChanges) {
    return {
      ...record,
      data: updatedData
    };
  }
  return record;
}

/**
 * Generates automated Postgres logs mimicking raw structural query operations
 */
export function generateInsertSQLLog(record: CRMRecord): string {
  const jsonbData = JSON.stringify(record.data);
  return `INSERT INTO records (id, object_id, data, created_at, updated_at) \nVALUES ('${record.id}', '${record.objectId}', '${jsonbData}'::jsonb, '${record.createdAt}', '${record.updatedAt}');`;
}

export function generateUpdateSQLLog(record: CRMRecord, updatedFields: Record<string, any>): string {
  const sets = Object.entries(updatedFields)
    .map(([key, val]) => `jsonb_set(data, '{${key}}', '${JSON.stringify(val)}'::jsonb)`)
    .join('\n  , ');
  
  return `UPDATE records \nSET data = ${sets || 'data'},\n    updated_at = NOW() \nWHERE id = '${record.id}' AND object_id = '${record.objectId}';`;
}

export function generateDeleteSQLLog(id: string, objectId: string): string {
  return `DELETE FROM records \nWHERE id = '${id}' AND object_id = '${objectId}';`;
}

/**
 * Evaluates triggers and schedules actions through our simulated event-driven queue.
 */
export function executeWorkflowAutomation(
  triggerEvent: 'create' | 'update',
  oldRecord: CRMRecord | null,
  newRecord: CRMRecord,
  allObjects: CRMObject[],
  allRecords: CRMRecord[],
  allWorkflows: Workflow[],
  onTriggerFired: (logs: SystemLog[], newlyCreatedRecords: CRMRecord[]) => void
) {
  // Find active workflows associated with this object
  const relevantWorkflows = allWorkflows.filter(
    wf => wf.isActive && wf.objectId === newRecord.objectId
  );

  if (relevantWorkflows.length === 0) return;

  const logs: SystemLog[] = [];
  const generatedRecords: CRMRecord[] = [];

  relevantWorkflows.forEach(wf => {
    // Locate the trigger node
    const triggerNode = wf.nodes.find(n => n.type === 'trigger');
    if (!triggerNode) return;

    const config = triggerNode.config;
    let isFired = false;

    // Check action event level (create vs update match)
    if (config.type === 'all' || config.type === triggerEvent) {
      if (config.operator === 'always' || !config.fieldId) {
        isFired = true;
      } else {
        const fieldId = config.fieldId;
        const targetVal = config.value;
        const currentVal = newRecord.data[fieldId];
        const prevVal = oldRecord ? oldRecord.data[fieldId] : undefined;

        if (config.operator === 'equals') {
          // Fire if the value is what we want
          if (currentVal === targetVal) {
            // If it is an update, only fire if it transitioned to this value to prevent duplicate tasks
            if (triggerEvent === 'update') {
              isFired = prevVal !== targetVal;
            } else {
              isFired = true;
            }
          }
        } else if (config.operator === 'changed_to') {
          isFired = currentVal === targetVal && prevVal !== targetVal;
        } else if (config.operator === 'greater_than') {
          isFired = Number(currentVal) > Number(targetVal) && (oldRecord === null || !(Number(prevVal) > Number(targetVal)));
        }
      }
    }

    if (!isFired) return;

    // Flow was triggered! Start trigger execution path simulation
    const timestamp = new Date().toISOString();
    const triggerLabel = triggerNode.label || 'Trigger Point';

    // 1. Log flow startup
    logs.push({
      id: `log-wf-start-${Date.now()}-${Math.random()}`,
      timestamp,
      type: 'queue',
      message: `[BullMQ Message Broker] Received trigger event for Record:${newRecord.id} on Object:${newRecord.objectId}. Enqueuing Job: '${wf.name}'`,
      payload: JSON.stringify({ workflowId: wf.id, recordId: newRecord.id, triggerType: triggerEvent })
    });

    logs.push({
      id: `log-wf-exec-${Date.now()}-${Math.random()}`,
      timestamp,
      type: 'workflow',
      message: `[Workflow Engine] Executing Flow: '${wf.name}' (Trigger met: ${triggerLabel})`,
      payload: `Record state: ${JSON.stringify(newRecord.data)}`
    });

    // Solve execution graph top down. We trace connected action nodes starting from trigger
    // Let's find nodes connected directly or sequentially
    const flowNodes = getTopologicalSortedNodes(wf);
    // Filter out trigger node as we already evaluated it
    const actionNodes = flowNodes.filter(n => n.type === 'action');

    actionNodes.forEach(node => {
      const nodeConfig = node.config;
      const nodeTime = new Date().toISOString();

      if (nodeConfig.type === 'log_event') {
        logs.push({
          id: `log-act-log-${Date.now()}-${Math.random()}`,
          timestamp: nodeTime,
          type: 'action',
          message: `[Event Worker: ${node.label}] ${nodeConfig.logMessage || 'Custom Event Logged.'}`,
          payload: `Executed task in context of lead/record ID: ${newRecord.id}`
        });
      } else if (nodeConfig.type === 'send_email') {
        logs.push({
          id: `log-act-email-${Date.now()}-${Math.random()}`,
          timestamp: nodeTime,
          type: 'action',
          message: `[SMTP SMTP-Out] Automated Email sent to <${nodeConfig.emailTo || 'system@crm.org'}> with subject: "${nodeConfig.emailSubject || 'Alert'}"`,
          payload: `BODY COMPLIANCE ATTACHMENT:\n---\n${nodeConfig.emailBody || '(No Body)'}\n---\nSMTP Envelope: Delivered successfully.`
        });
      } else if (nodeConfig.type === 'create_task') {
        // Build a dynamic related Task record automatically!
        const taskId = `task-auto-${Math.random().toString(36).substr(2, 9)}`;
        const taskData: Record<string, any> = {
          subject: nodeConfig.taskSubject || 'Automated Alignment Task',
          priority: nodeConfig.taskPriority || 'Normal',
          status: 'Not Started',
          description: nodeConfig.taskDescription || 'Automated system task generated by workflow trigger.'
        };

        // If the record we triggered on was an Account or has lookups, associate the task!
        if (newRecord.objectId === 'accounts') {
          taskData.account_id = newRecord.id;
        } else if (newRecord.objectId === 'contacts') {
          taskData.contact_id = newRecord.id;
          // Look up if Contact has account_id to associate account too
          if (newRecord.data.account_id) {
            taskData.account_id = newRecord.data.account_id;
          }
        } else if (newRecord.objectId === 'leads') {
          // If a Lead is qualified, standard behavior is link to description
          taskData.description = `${taskData.description} - Associated Company: ${newRecord.data.company} (Lead Context: ${newRecord.data.first_name} ${newRecord.data.last_name})`;
        }

        const newTaskRecord: CRMRecord = {
          id: taskId,
          objectId: 'tasks',
          data: taskData,
          createdAt: nodeTime,
          updatedAt: nodeTime
        };

        generatedRecords.push(newTaskRecord);

        logs.push({
          id: `log-act-task-${Date.now()}-${Math.random()}`,
          timestamp: nodeTime,
          type: 'action',
          message: `[Database Worker: ${node.label}] Created related Task Record: "${newTaskRecord.data.subject}"`,
          payload: `CRM Record auto-mapped fields: ${JSON.stringify(taskData)}`
        });

        // Trigger dynamic Postgres mock INSERT SQL log for task creation
        logs.push({
          id: `log-act-task-sql-${Date.now()}-${Math.random()}`,
          timestamp: nodeTime,
          type: 'sql',
          message: `[PostgreSQL] Executing SQL to persist automated Task record`,
          sqlQuery: generateInsertSQLLog(newTaskRecord)
        });
      } else if (nodeConfig.type === 'update_field') {
        const fieldId = nodeConfig.updateFieldId;
        const rawValue = nodeConfig.updateValue;
        if (fieldId) {
          // Perform in-place update on the triggering record's data structure
          newRecord.data[fieldId] = rawValue;
          newRecord.updatedAt = nodeTime;

          // Push the updated record to outputs so that the database state updates
          const alreadyGeneratedIdx = generatedRecords.findIndex(r => r.id === newRecord.id);
          if (alreadyGeneratedIdx > -1) {
            generatedRecords[alreadyGeneratedIdx] = { ...newRecord };
          } else {
            generatedRecords.push({ ...newRecord });
          }

          logs.push({
            id: `log-act-update-field-${Date.now()}-${Math.random()}`,
            timestamp: nodeTime,
            type: 'action',
            message: `[Database Worker: ${node.label}] Automated field update on record ${newRecord.id}: set ${fieldId} = "${rawValue}"`,
            payload: `Fields updated: { ${fieldId}: "${rawValue}" }`
          });

          logs.push({
            id: `log-act-update-sql-${Date.now()}-${Math.random()}`,
            timestamp: nodeTime,
            type: 'sql',
            message: `[PostgreSQL] Executing SQL to persist automated Field Update`,
            sqlQuery: generateUpdateSQLLog(newRecord, { [fieldId]: rawValue })
          });
        }
      }
    });

    logs.push({
      id: `log-wf-end-exec-${Date.now()}-${Math.random()}`,
      timestamp: new Date().toISOString(),
      type: 'queue',
      message: `[Workflow Engine] Completed Flow Job execution: '${wf.name}' with ${actionNodes.length} action nodes processed successfully.`,
    });
  });

  if (logs.length > 0 || generatedRecords.length > 0) {
    onTriggerFired(logs, generatedRecords);
  }
}

/**
 * Returns simple sorted array of nodes. For our flow chart, it returns order
 * trigger -> next nodes based on edges
 */
function getTopologicalSortedNodes(wf: Workflow): WorkflowNode[] {
  const triggerNode = wf.nodes.find(n => n.type === 'trigger');
  if (!triggerNode) return wf.nodes;

  const result: WorkflowNode[] = [triggerNode];
  const visited = new Set<string>([triggerNode.id]);

  let currentId = triggerNode.id;
  while (true) {
    // Find outbound edges from currentId
    const nextEdge = wf.edges.find(e => e.source === currentId);
    if (!nextEdge) break;

    const targetNode = wf.nodes.find(n => n.id === nextEdge.target);
    if (!targetNode || visited.has(targetNode.id)) break;

    result.push(targetNode);
    visited.add(targetNode.id);
    currentId = targetNode.id;
  }

  // Append any disconnected orphan nodes just in case so they don't get lost
  wf.nodes.forEach(n => {
    if (!visited.has(n.id)) {
      result.push(n);
    }
  });

  return result;
}
