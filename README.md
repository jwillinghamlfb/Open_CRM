# Metastash Open-CRM 🚀

Metastash is a dynamic, high-fidelity, open-source metadata-driven CRM engine. Engineered with a Postgres-first mentality and fully compliant with Salesforce custom object semantics, Metastash empowers organizations to design database schemas, configure visual automation pipelines, orchestrate secure Role-Based Access Control (RBAC), and instantly toggle underlying storage adapters between local browser memory, **Google Cloud Firestore**, and **Supabase PostgreSQL**.

---

## Key Architectural Capabilities

### 1. 📂 Schema Builder (Salesforce Semantic Engines)
*   **Dynamic Custom Objects**: Declare tables on the fly. Custom models automatically compile with the `__c` relational suffix.
*   **Virtual Properties Indexing**: Extend existing attributes dynamically. Add standard fields, checkboxes, lookup relationships, and rich formula properties.
*   **Simulated PostgreSQL Console**: Every metadata adjustment and custom table installation emits real-world PostgreSQL relational logs in the system drawer to bridge the gap between abstract design and physical layout.

### 2. 🗃️ Fluid Records Explorer (Hybrid JSONB Layout)
*   **Dynamic Form Rendering**: Forms recalibrate on the fly to support newly added schema attributes, relationships, and data formats.
*   **Interactive Kanban Boards**: Drag-and-drop cards to modify dynamic metadata properties (e.g., Lead Status, Deal Category) instantaneously.
*   **Formula Calculations**: Automatically computes derived values natively inside the CRM application.

### 3. 🕸️ Visual Workflow Automation Pipeline
*   **Visual Logic Builder**: Define action sequences (e.g., database fields correction, automated email triggers, instant logging) starting from dynamic triggers.
*   **Formula Updates & Triggers**: Automatically execute workflow calculations and chain effects whenever dynamic conditions are met on accounts, contacts, or opportunities.

### 4. 🛡️ Role-Based Access Control (RBAC Tower)
*   **Pre-configured Profiles**: Synced with five granular roles ranging from *System Administrator* (unrestricted permissions) to *Standard Read-Only User*.
*   **Metadata Security Shields**: Access controls prevent non-administrators from tampering with workflow pipelines, altering database fields, or executing sensitive admin scripts.

### 5. 🔌 Dual-Cloud Database Portability Portal
*   **Local Offline Sandbox**: Cached directly in standard browser `localStorage` for responsive, zero-configuration local sandboxing.
*   **Google Cloud Firestore NoSQL**: Fully integrated client adapter to sync metadata dictionaries and CRM records directly into Firestore collections.
*   **Supabase PostgreSQL (Hybrid JSONB)**: Map dynamic, custom schemas to relational PG tables using indexed JSONB payloads and standard foreign key configurations.
*   **Bidirectional Sync Hub**: Connect remote servers, run diagnostic link validations, push local states to seed databases, or fetch remote cloud datasets directly.

---

## 🛠️ Installation & Setup

### Prerequisites
*   [Node.js](https://nodejs.org/) (Version **18.0.0** or higher is highly recommended)
*   [npm](https://www.npmjs.com/) (Standard package manager)

### Quick Start (Local Run)

1.  **Clone or extract the repository** to your local environment.
2.  **Navigate into the project root**:
    ```bash
    cd metastash-crm
    ```
3.  **Install dependencies**:
    ```bash
    npm install
    ```
4.  **Start the local development server**:
    ```bash
    npm run dev
    ```
5.  **Open your browser** and navigate to:
    ```
    http://localhost:3000
    ```

---

## ⚙️ Build System & Deployment

### Production Compilation
To compile the files for production distribution:
```bash
npm run build
```
This bundles the Vite application into optimized, static files located in the `dist/` directory, ready to be hosted on Netlify, Vercel, Firebase Hosting, Cloud Run, or custom servers.

### Serving Production Output
If you want to view and test the verified production build locally:
```bash
npm run preview
```

---

## 🔌 Dual DB Integration Guides

Manage your storage backends on the **Cloud DB Portal** tab. Below is the quick reference setup for administrators and engineers:

### A. Google Cloud Firestore Setup
1.  Go to the [Firebase Developer Console](https://console.firebase.google.com/).
2.  **Create a fresh Firebase Project** and register a new **Web App** to generate parameters.
3.  Choose **Firestore Database** from the build panel, select **Create Database**, and select your target region.
4.  Copy the API values into the Metastash **Cloud DB Portal** form:
    *   `apiKey`
    *   `authDomain`
    *   `projectId`
    *   `storageBucket`
    *   `messagingSenderId`
    *   `appId`
5.  Click **"Activate DB Provider"**, verify with **"Test Connect"**, and click **"Push Current State"** to seed Firestore instantly.

### B. Supabase PostgreSQL Setup
1.  Sign in to [Supabase](https://supabase.com/).
2.  **Provision a PostgreSQL database instance** (takes roughly ~15 seconds).
3.  Navigate to your **SQL Editor** in Supabase, create a **New query**, paste the SQL script below, and click **Run**:

```sql
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

-- Indexes for lightning-fast JSONB queries
CREATE INDEX IF NOT EXISTS idx_records_object_id ON records(object_id);
CREATE INDEX IF NOT EXISTS idx_records_data_jsonb ON records USING gin (data);
```

4.  Go to your Supabase **Project Settings** > **API** tab and copy your project's **URL** and `anon public` key.
5.  Add these keys in Metastash **Cloud DB Portal**, click **"Activate DB Provider"**, and press **"Push Current State"** to establish real-time relational persistence.

---

## ⚖️ Governance & Licensing (AGPLv3)

Metastash Open-CRM is governed and distributed under the terms of the **GNU Affero General Public License v3 (AGPLv3)**. 

### What this means for users and organizations:
*   **Freedom to Run and Modify**: You are free to download, inspect, host, modify, and integrate Metastash within your internal operations completely free of charge.
*   **SaaS Network Copyleft Parity**: Under Section 13 of the AGPLv3, if you run a modified version of this software as a SaaS product or host it for users over a network, you **MUST** make the complete source code of your modified version available to your network users under the same license.
*   **Share Alike**: Any modifications, expansions, or custom modules derived from this software must remain open source under the AGPLv3 if distributed or deployed.

For the full legal details of this governance structure, please refer to the licensing documentation located in the **Legal Strategy (AGPLv3 Agreement)** tab inside the app console.

---

*Designed and engineered with passion. Open access, zero compromises.* 🛡️
