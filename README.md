# Damage Mapper 🚨

> **Explainable Disaster Triage & Responder Operations Dashboard**  
> *Built for a 48-Hour CSE Hackathon*

Damage Mapper transforms raw, unstructured citizen disaster reports (photos, multilingual descriptions, GPS / map pins) into an **explainable, ranked incident queue** on an interactive operations map for First Responders and Disaster Coordinators.

---

## ⚡ Tech Stack

- **Frontend**: React 19 + Vite + TypeScript, Tailwind CSS, TanStack Query (3.5s polling interval), Leaflet (`react-leaflet`), `vite-plugin-pwa`, `idb` (offline IndexedDB report queue).
  - Routes: `/report` (mobile-first Citizen PWA), `/console` (desktop Responder Operations Dashboard), `/r/:token` (Citizen tracking & follow-up).
- **Backend**: Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2, PostGIS / PostgreSQL (`docker-compose.yml`), with zero-config SQLite spatial fallback for instant local offline presentations.
  - Asynchronous AI triage with FastAPI `BackgroundTasks` (no Redis/Celery required).
- **AI Engine**: Official `google-genai` Python SDK. The multimodal model is configured strictly via the `GEMINI_MODEL` environment variable (never hardcoded, defaults to `gemini-3.8-flash`). AI results are cached by image perceptual hash (`imagehash`).
- **Prioritization & Rules Engine**: Declarative `rules.yaml` specifying weights, disaster categories, thresholds, and life-safety overrides without any hardcoded logic.

---

## 🌟 Key Features

1. **Mobile-Friendly Citizen Report Portal (`/report`)**:
   - Camera upload or file selection.
   - Multilingual description (automatically translated to English, preserving original text).
   - High-precision automatic device GPS or manual Leaflet pin picker.
   - "Reporting for someone else" toggle with optional victim contact details.
   - Offline queuing via IndexedDB (`idb`) for low-connectivity disaster zones.
2. **Explainable AI Triage & Verification**:
   - **Two Independent Scores**: **PRIORITY** (how urgent, 0–100) and **CONFIDENCE** (how well verified, 0.0–1.0).
   - **Crucial Safety Invariant**: A missing photo **lowers confidence, NEVER priority**!
   - **Safety Overrides**: Critical triggers like `"person trapped"`, `"fire near homes"`, and `"structural collapse"` automatically force Priority to **CRITICAL** (score $\ge 92$) even on a single unverified report.
   - Plain English **"Why this rank"** explanation generated for every incident.
3. **Automated Deduplication & Merging**:
   - Spatially groups reports within 250m and a 6-hour window.
   - Compares image perceptual hash Hamming distance using `imagehash`.
   - Combines hazards, calculates corroboration count, and preserves human-readable reasons (e.g., *"Merged report #2: 45m away within 12 min, matching hazard 'flood'"*).
4. **Incomplete Report Follow-Up (`/r/{token}`)**:
   - Incomplete or text-only reports are **never discarded**; they are tagged `unverified` with status `needs_information`.
   - Citizens receive a tracking link `/r/{token}` allowing them to supply a missing photo or map pin later.
5. **Secure Control Room & Administrative Dashboard (`/console`)**:
   - Protected by cryptographic HMAC-SHA256 bearer tokens.
   - Requires administrative authentication via dedicated `/login` page.
   - Default Control Room credentials: `admin` / `ares-admin-2026` (configurable via `ARES_ADMIN_USERNAME` & `ARES_ADMIN_PASSWORD`).
   - Unauthenticated attempts to access `/console` are automatically redirected to `/login`.
   - Leaflet interactive map with priority-colored pins and pulsating animation for CRITICAL hazards.
   - Review actions: Confirm, Correct Severity (1–5), Correct Hazard, Mark False, Mark Duplicate, Assign Team, and Manual Merge.
   - Full chronological **Audit Log** tracking every operator decision.
   - Logout button in Header clears active administrative session.
6. **Privacy & Security**:
   - Public reporting interface (`/report`) and tracking (`/r/{token}`) remain **100% accessible without authentication**.
   - EXIF GPS is extracted, then **all metadata is stripped** from stored images using Pillow.
   - Hashed client sender identifiers (SHA-256 with salt) for privacy-preserving duplicate-sender detection.

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- Python 3.11+
- Node.js 18+ & npm

### 2. Backend Setup & Run

```bash
# In project root
python -m venv backend/.venv

# Windows Powershell
.\backend\.venv\Scripts\Activate.ps1
# Mac / Linux
# source backend/.venv/bin/activate

pip install -r backend/requirements.txt

# (Optional) Set your Gemini API key & model
$env:GEMINI_API_KEY="your-api-key-here"
$env:GEMINI_MODEL="gemini-3.8-flash"

# Start FastAPI backend
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

*Note: If PostgreSQL / Docker is not running, the backend seamlessly falls back to local SQLite with spatial distance, auto-seeding realistic demo incidents!*

### 3. Frontend Setup & Run

```bash
# In another terminal:
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser:
- **Operations Console**: [http://localhost:5173/console](http://localhost:5173/console)
- **Citizen Report Portal**: [http://localhost:5173/report](http://localhost:5173/report)
- **Demo Follow-Up Tracking**: [http://localhost:5173/r/demo-track-token-101](http://localhost:5173/r/demo-track-token-101)

---

## 🧪 Hackathon Demo Checklist

1. **View the Priority Queue**: Open `/console`. Notice how incidents are ranked by urgency. See Incident #1 (Flood with trapped occupants) and Incident #2 (Urban Fire spreading near homes) escalated to **CRITICAL** due to safety override phrases.
2. **Inspect Explainability**: Click any incident to open the **Rescuer Review Panel**. Read the plain `"Why this rank"` line and observe the photo with overlay bounding boxes.
3. **Verify Safety Invariant**: Observe Incident #4 (Guindy Lowland Settlement). It has no photo attached: notice that its **Confidence is LOW (0.28)**, but its **Priority remains HIGH (72/100)** because lives are at risk!
4. **Test Citizen Portal**: Click *"Citizen Portal"* in the header, upload a photo or describe an incident in any language (e.g. Hindi, Tamil, or Spanish). Drop a pin or click *"Use My Current Phone Location"*. Submit and receive your `/r/{token}` tracking link.
5. **Follow-Up Incomplete Report**: Open `/r/demo-track-token-101` and upload a verifying photo to see status change from `needs_information` to `verified`.
6. **Role Actions & Audit Trail**: Switch role to *Coordinator* in the header. Try out manual merge or team assignment, then click *"Audit Trail Log"* to show judges the tamper-evident record.
