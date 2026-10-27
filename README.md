# StudyLens ✦ AI-Powered Bachelor's Study Assistant

**StudyLens** is a Windows desktop application engineered for university students, coursework, lecture accompaniment, exam revision, coding practice, and mock interviews. Powered directly by the **official Google Gemini API (`@google/genai`)**, StudyLens indexes your syllabi, textbooks, lecture slides, and past papers into a local semantic knowledge base, prioritizing your course material with academic citations.

---

## 1. Architecture Overview

StudyLens uses an isolated multi-process Electron + React + TypeScript architecture with Windows security best practices (Context Isolation, Disabled Node Integration, encrypted DPAPI credentials):

```text
Windows Desktop App (StudyLens)
│
├── React 18 UI Layer (TailwindCSS, KaTeX LaTeX, Lucide Icons)
│   ├── Full Academic Dashboard (Sessions, Knowledge, Live, Quiz, Flashcards, Notes)
│   └── Floating Acrylic HUD Window (Translucent, Always-on-Top, Frameless)
│
├── Preload Security Bridge (contextBridge, typed StudyLensAPI, IPC events)
│
└── Electron Main Process (Node.js ES2022)
    ├── StorageService (Local encrypted persistence via Windows DPAPI safeStorage)
    ├── GeminiService (Official Google Gemini SDK: gemini-3.1-flash-lite, gemini-3.8-flash, gemini-embedding-001)
    ├── KnowledgeBaseService (Parsers: PDF, DOCX, TXT, MD, PPTX, Images, ZIP)
    │   ├── Structural Section & Heading Detector
    │   ├── Overlapping Chunk Generator
    │   └── Semantic Vector Retrieval & Cosine Similarity Engine (3072-dim)
    ├── Audio & Speech Pipeline (Windows Loopback / Mic Web Audio, VU meter, Gemini Multimodal Audio Transcription)
    ├── ScreenCaptureService (desktopCapturer for slide/code/equation vision analysis)
    └── Global Hotkeys Manager (Ctrl+Shift+Space for HUD, Ctrl+Shift+S for Screen Vision)
```

---

## 2. Key Features

### 📚 Course Knowledge Base
- Supports **PDF**, **DOCX**, **TXT**, **Markdown**, **PPTX** (PowerPoint slides), **Images**, and **ZIP** archives.
- Preserves document hierarchy (Units, Chapters, Sections, Page numbers).
- Ingests text into semantic chunks and creates 3072-dimensional vector embeddings (`gemini-embedding-001`).
- Implements cosine similarity search with local BM25 keyword fallback.

### 🎙️ Live Lecture Study Mode
- Receive audio from **Microphone**, **System Audio Loopback** (e.g., recorded lectures or Microsoft Teams), or **Both**.
- Real-time VU level visualizer and **Audio Diagnostic Test** screen.
- Real-time speech transcription via Google Gemini's native audio multimodal understanding.
- Automatic **Question and Statement Detection**: builds a rolling context window and triggers contextual study responses without spamming the AI.
- Privacy indicators:
  - `● AUDIO CAPTURE ACTIVE` (Pulsing green)
  - `● AI PROCESSING ACTIVE` (Pulsing purple)
  - One-click immediate STOP button.

### 💬 Academic Answer Formatting
StudyLens structures answers for university exams:
- **SHORT ANSWER**: Direct core answer.
- **WHY**: Theoretical intuition and principles.
- **EXAMPLE / PROOF**: Worked mathematical derivation or code.
- **FROM YOUR COURSE MATERIAL**: Direct citations and slide numbers from your uploaded files.
- **ADDITIONAL EXPLANATION**: Broader academic context when external knowledge is required.

Configurable Response Modes:
- `Study Answer`, `Explain`, `Detailed`, `Simple (ELI5)`, `Follow-up Questions`, `Sources Only`, `Teach Me`.

Configurable Lengths:
- `1-Sentence`, `Short`, `Medium`, `Detailed`.

### 🪟 Floating Translucent Acrylic Assistant
- Translucent frameless floating window designed to hover unobtrusively over Zoom, Teams, PDFs, or IDEs.
- Configurable **Opacity** (30% to 100%) and **Acrylic Blur**.
- **Always on Top** toggle.
- Summon instantly with global hotkey: `Ctrl + Shift + Space`.

### 📸 Screen Context & Vision Analysis
- Press `Ctrl + Shift + S` or click "Capture Screen Now" to grab any screen region.
- Sends visual diagrams, mathematical equations, code snippets, or lecture slides to Gemini vision alongside retrieved course notes.

### 🎓 Interactive "Teach Me" Tutor Mode
- Guided pedagogical 4-step sequence:
  1. Formal Concept Definition
  2. Intuitive Mental Model
  3. Worked Step-by-Step Example / Derivation
  4. Student Knowledge Check Question with instant evaluation & correction.

### 📝 University Quiz Generator
- Generate quizzes directly from uploaded documents.
- Supports Multiple Choice (MCQ), Short Answer, and True/False questions.
- Tracks score, explanations, and logs weak topics to the active study session.

### 🗂️ Interactive Spaced Flashcards
- Auto-generates flashcards from course documents.
- 3D interactive flip card display.
- Rate recall: `Easy`, `Medium`, `Difficult`.
- Filter difficult cards for targeted final exam revision.

### 📒 Academic Notes
- Built-in Markdown editor with live KaTeX mathematical formula rendering.
- Save any AI response from Chat or Live Mode into notes with one click.
- Tagging, checklists, and code formatting.

### 💰 Token Usage & Cost Awareness
- Live tracking of input tokens, output tokens, and total queries.
- Real-time estimated cost in USD ($0.XX) based on current Google Gemini pricing.

---

## 3. Installation & Setup

### Prerequisites
- **Node.js** v18+ or later (tested on v26)
- **Windows 10 / 11**

### Quick Start
```powershell
# 1. Navigate to the project directory
cd C:\Users\khanZ\.gemini\antigravity\scratch\studylens

# 2. Install dependencies (if not already installed)
npm.cmd install

# 3. Build the application
npm.cmd run build

# 4. Start the application
npm.cmd start
```

### Development Mode (with Hot Reloading)
```powershell
npm.cmd run dev
```

### Packaging Windows Installer / Portable Executable
```powershell
# Create unpacked directory
npm.cmd run package:dir

# Build Windows NSIS installer and portable .exe in the /release directory
npm.cmd run package:win
```

---

## 4. Google Gemini API Key Configuration

1. You can enter and test your Google Gemini API key during onboarding or anytime under **Settings > Google Gemini API Credentials & Models**. It is automatically encrypted on disk using Windows DPAPI encryption.
2. Alternatively, copy `.env.example` to `.env` and set `GEMINI_API_KEY=your_key_here`.
3. Supported models:
   - Text & Vision: `gemini-3.1-flash-lite` (Default, verified working), `gemini-3.8-flash`, `gemini-flash-latest`, `gemini-pro-latest`
   - Embeddings: `gemini-embedding-001` (3072-dim vector embeddings, verified working), `gemini-embedding-2`

---

## 5. Privacy & Security Boundary

- **Credential Safety**: The Google Gemini API key is encrypted using the Windows Data Protection API (DPAPI via Electron `safeStorage`) and stored strictly in the main process. It is never exposed to renderer scripts.
- **Audio Privacy**: Audio is processed in memory in temporary chunks for transcription and discarded immediately unless recording is explicitly enabled.
- **Academic Integrity**: StudyLens does not attempt to circumvent examination software, proctoring systems, or Microsoft Teams security. It clearly displays visual indicators when audio capture or AI processing is active.
- **Local Data Reset**: You can wipe all local databases, cached documents, and credentials at any time in **Settings > Clear All Local Study Data**.
