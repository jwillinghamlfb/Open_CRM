/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  writeBatch,
  Firestore
} from 'firebase/firestore';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CRMObject, CRMRecord, Workflow } from '../types';

export type DBProvider = 'localStorage' | 'firestore' | 'supabase';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export interface DBConfig {
  provider: DBProvider;
  firebase: FirebaseConfig;
  supabase: SupabaseConfig;
}

const DEFAULT_CONFIG: DBConfig = {
  provider: 'localStorage',
  firebase: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  },
  supabase: {
    url: '',
    anonKey: ''
  }
};

// Retrieve configuration local storage
export function loadDBConfig(): DBConfig {
  try {
    const data = localStorage.getItem('metacrm_db_config');
    if (data) {
      const parsed = JSON.parse(data);
      return {
        provider: parsed.provider || 'localStorage',
        firebase: { ...DEFAULT_CONFIG.firebase, ...parsed.firebase },
        supabase: { ...DEFAULT_CONFIG.supabase, ...parsed.supabase }
      };
    }
  } catch (err) {
    console.error('Error reading db config:', err);
  }
  return DEFAULT_CONFIG;
}

// Persist database credentials local storage
export function saveDBConfig(config: DBConfig) {
  localStorage.setItem('metacrm_db_config', JSON.stringify(config));
}

// -----------------------------------------------------------------
// Lazy Initializers (ensures incomplete credentials never crash App)
// -----------------------------------------------------------------

let dbFirebaseApp: FirebaseApp | null = null;
let dbFirestore: Firestore | null = null;
let dbSupabaseClient: SupabaseClient | null = null;

export function getFirestoreInstance(config: FirebaseConfig): Firestore {
  if (!config.apiKey || !config.projectId) {
    throw new Error('Firebase configuration missing Api Key or Project ID.');
  }
  
  if (!dbFirestore) {
    if (getApps().length > 0) {
      dbFirebaseApp = getApp();
    } else {
      dbFirebaseApp = initializeApp(config);
    }
    dbFirestore = getFirestore(dbFirebaseApp);
  }
  return dbFirestore;
}

export function resetFirebase() {
  dbFirestore = null;
  dbFirebaseApp = null;
}

export function getSupabaseInstance(config: SupabaseConfig): SupabaseClient {
  if (!config.url || !config.anonKey) {
    throw new Error('Supabase URL or Secret Anonymous Key is missing.');
  }
  
  if (!dbSupabaseClient) {
    dbSupabaseClient = createClient(config.url, config.anonKey, {
      auth: { persistSession: false }
    });
  }
  return dbSupabaseClient;
}

export function resetSupabase() {
  dbSupabaseClient = null;
}

// -----------------------------------------------------------------
// Test connection API call verification
// -----------------------------------------------------------------

export async function testRemoteConnection(config: DBConfig): Promise<{ success: boolean; message: string }> {
  const provider = config.provider;
  if (provider === 'localStorage') {
    return { success: true, message: 'Local Offline Sandbox active. No remote configurations needed.' };
  }

  if (provider === 'firestore') {
    try {
      const db = getFirestoreInstance(config.firebase);
      // Try fetching or performing simple metadata reads to test
      const testCollection = collection(db, 'system_test');
      await getDocs(testCollection);
      return { success: true, message: 'Successfully connected and authenticated with Google Cloud Firestore!' };
    } catch (err: any) {
      resetFirebase();
      return { success: false, message: `Firestore Connection Failed: ${err.message || err}` };
    }
  }

  if (provider === 'supabase') {
    try {
      const sb = getSupabaseInstance(config.supabase);
      // Perform simple check on the object table
      const { data, error } = await sb.from('objects').select('id').limit(1);
      if (error) {
        // If it was just table missing, the connection established but SQL setup is needed.
        if (error.code === '42P01') {
          return { 
            success: true, 
            message: 'Connected to Supabase! Note: System tables (objects, records, workflows) were not found. Please click the "Execute SQL Script/Push Data" button above to run the schema builder.' 
          };
        }
        throw error;
      }
      return { success: true, message: 'Successfully connected to Supabase and located tables!' };
    } catch (err: any) {
      resetSupabase();
      return { success: false, message: `Supabase Connection Failed: ${err.message || err}` };
    }
  }

  return { success: false, message: 'Unknown database provider.' };
}

// -----------------------------------------------------------------
// Individual Entity Cloud Save/Delete Operations
// -----------------------------------------------------------------

export async function cloudSaveRecord(config: DBConfig, record: CRMRecord): Promise<void> {
  if (config.provider === 'firestore') {
    const db = getFirestoreInstance(config.firebase);
    const docRef = doc(db, 'records', record.id);
    await setDoc(docRef, record);
    return;
  }

  if (config.provider === 'supabase') {
    const sb = getSupabaseInstance(config.supabase);
    const { error } = await sb.from('records').upsert({
      id: record.id,
      object_id: record.objectId,
      data: record.data,
      created_at: record.createdAt,
      updated_at: record.updatedAt
    });
    if (error) throw error;
    return;
  }
}

export async function cloudDeleteRecord(config: DBConfig, id: string): Promise<void> {
  if (config.provider === 'firestore') {
    const db = getFirestoreInstance(config.firebase);
    const docRef = doc(db, 'records', id);
    await deleteDoc(docRef);
    return;
  }

  if (config.provider === 'supabase') {
    const sb = getSupabaseInstance(config.supabase);
    const { error } = await sb.from('records').delete().eq('id', id);
    if (error) throw error;
    return;
  }
}

export async function cloudSaveObject(config: DBConfig, obj: CRMObject): Promise<void> {
  if (config.provider === 'firestore') {
    const db = getFirestoreInstance(config.firebase);
    const docRef = doc(db, 'objects', obj.id);
    await setDoc(docRef, obj);
    return;
  }

  if (config.provider === 'supabase') {
    const sb = getSupabaseInstance(config.supabase);
    const { error } = await sb.from('objects').upsert({
      id: obj.id,
      label: obj.label,
      label_plural: obj.labelPlural,
      is_custom: obj.isCustom,
      fields: obj.fields,
      icon: obj.icon
    });
    if (error) throw error;
    return;
  }
}

export async function cloudSaveWorkflow(config: DBConfig, wf: Workflow): Promise<void> {
  if (config.provider === 'firestore') {
    const db = getFirestoreInstance(config.firebase);
    const docRef = doc(db, 'workflows', wf.id);
    await setDoc(docRef, wf);
    return;
  }

  if (config.provider === 'supabase') {
    const sb = getSupabaseInstance(config.supabase);
    const { error } = await sb.from('workflows').upsert({
      id: wf.id,
      name: wf.name,
      description: wf.description || '',
      is_active: wf.isActive,
      object_id: wf.objectId,
      nodes: wf.nodes,
      edges: wf.edges
    });
    if (error) throw error;
    return;
  }
}

// -----------------------------------------------------------------
// Bulk Push Migrations (Seeds the cloud with local model changes)
// -----------------------------------------------------------------

export async function cloudBulkPush(
  config: DBConfig,
  objects: CRMObject[],
  records: CRMRecord[],
  workflows: Workflow[]
): Promise<{ success: boolean; logs: string[] }> {
  const steps: string[] = [];

  if (config.provider === 'firestore') {
    const db = getFirestoreInstance(config.firebase);
    
    steps.push('Initializing Firestore bulk write sequence...');
    
    // Batch save Objects
    steps.push(`Pushing metadata objects (${objects.length} tables/schemas)...`);
    for (const obj of objects) {
      await setDoc(doc(db, 'objects', obj.id), obj);
    }

    // Batch save Workflows 
    steps.push(`Pushing automation workflows (${workflows.length} rules)...`);
    for (const wf of workflows) {
      await setDoc(doc(db, 'workflows', wf.id), wf);
    }

    // Batch save records (since batch limit is 500 in Firestore, we push in loops)
    steps.push(`Pushing records (${records.length} database entries)...`);
    for (const r of records) {
      await setDoc(doc(db, 'records', r.id), r);
    }

    steps.push('Firestore bulk push finished successfully!');
    return { success: true, logs: steps };
  }

  if (config.provider === 'supabase') {
    const sb = getSupabaseInstance(config.supabase);
    steps.push('Initializing Supabase PG dynamic payload insertions...');

    // Push objects
    steps.push(`Writing metadata dictionary definitions (${objects.length} schema tables)...`);
    const formattedObjects = objects.map(o => ({
      id: o.id,
      label: o.label,
      label_plural: o.labelPlural,
      is_custom: o.isCustom,
      fields: o.fields,
      icon: o.icon
    }));
    const objRes = await sb.from('objects').upsert(formattedObjects);
    if (objRes.error) throw new Error(`Supabase objects push error: ${objRes.error.message}`);

    // Push workflows
    steps.push(`Writing active workflow templates (${workflows.length} rules)...`);
    const formattedWorkflows = workflows.map(w => ({
      id: w.id,
      name: w.name,
      description: w.description || '',
      is_active: w.isActive,
      object_id: w.objectId,
      nodes: w.nodes,
      edges: w.edges
    }));
    const wfRes = await sb.from('workflows').upsert(formattedWorkflows);
    if (wfRes.error) throw new Error(`Supabase workflows push: ${wfRes.error.message}`);

    // Push records
    steps.push(`Seeding dynamic relational database logs (${records.length} records)...`);
    const formattedRecords = records.map(r => ({
      id: r.id,
      object_id: r.objectId,
      data: r.data,
      created_at: r.createdAt,
      updated_at: r.updatedAt
    }));
    const recRes = await sb.from('records').upsert(formattedRecords);
    if (recRes.error) throw new Error(`Supabase records push: ${recRes.error.message}`);

    steps.push('Supabase dynamic indexing operations complete!');
    return { success: true, logs: steps };
  }

  return { success: false, logs: ['Bypassed cloud syncing in local filesystem storage mode.'] };
}

// -----------------------------------------------------------------
// Bulk Pull Migrations (Downloads remote state into system state memory)
// -----------------------------------------------------------------

export async function cloudBulkPull(config: DBConfig): Promise<{
  objects: CRMObject[];
  records: CRMRecord[];
  workflows: Workflow[];
}> {
  if (config.provider === 'firestore') {
    const db = getFirestoreInstance(config.firebase);

    // Pull objects
    const objSnap = await getDocs(collection(db, 'objects'));
    const objects: CRMObject[] = [];
    objSnap.forEach(d => {
      objects.push(d.data() as CRMObject);
    });

    // Pull workflows
    const wfSnap = await getDocs(collection(db, 'workflows'));
    const workflows: Workflow[] = [];
    wfSnap.forEach(d => {
      workflows.push(d.data() as Workflow);
    });

    // Pull records
    const recSnap = await getDocs(collection(db, 'records'));
    const records: CRMRecord[] = [];
    recSnap.forEach(d => {
      records.push(d.data() as CRMRecord);
    });

    return { objects, records, workflows };
  }

  if (config.provider === 'supabase') {
    const sb = getSupabaseInstance(config.supabase);

    // Pull objects
    const { data: objData, error: objErr } = await sb.from('objects').select('*');
    if (objErr) throw objErr;
    const objects: CRMObject[] = (objData || []).map((o: any) => ({
      id: o.id,
      label: o.label,
      labelPlural: o.label_plural,
      isCustom: o.is_custom,
      fields: o.fields,
      icon: o.icon
    }));

    // Pull workflows
    const { data: wfData, error: wfErr } = await sb.from('workflows').select('*');
    if (wfErr) throw wfErr;
    const workflows: Workflow[] = (wfData || []).map((w: any) => ({
      id: w.id,
      name: w.name,
      description: w.description,
      isActive: w.is_active,
      objectId: w.object_id || 'accounts',
      nodes: w.nodes,
      edges: w.edges
    }));

    // Pull records
    const { data: recData, error: recErr } = await sb.from('records').select('*');
    if (recErr) throw recErr;
    const records: CRMRecord[] = (recData || []).map((r: any) => ({
      id: r.id,
      objectId: r.object_id,
      data: r.data,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));

    return { objects, records, workflows };
  }

  throw new Error('Fallback called on inactive remote provider.');
}
