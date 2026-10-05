# PAOA — Personal AI Operating Assistant

> *"An AI that knows how I normally live and helps me decide what to do next."*

[![Live PWA](https://img.shields.io/badge/Live%20PWA-paoa--ai.vercel.app-00F0FF.svg?style=flat&logo=vercel)](https://paoa-ai.vercel.app)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live-blue.svg?logo=github)](https://adityasing9.github.io/PAOA/)
[![Android Release](https://img.shields.io/badge/Android%20APK-v1.0.0-3DDC84.svg?style=flat&logo=android)](https://github.com/adityasing9/PAOA/releases)
[![AI Engine](https://img.shields.io/badge/AI-Gemini%202.0%20Flash%20(Free)-6366F1.svg)](https://aistudio.google.com)
[![Operating Cost](https://img.shields.io/badge/Cost-₹0%20Zero--Cost-brightgreen.svg)](#zero-cost-guarantee)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](./LICENSE)

PAOA (Personal AI Operating Assistant) is a **local-first, zero-cost AI companion, dynamic scheduler, and productivity manager**. Available both as a high-performance **Progressive Web App (PWA)** installable on any phone or laptop, and as a **native Android application**.

Unlike simple to-do lists, calendar apps, or generic cloud chatbots, PAOA learns your personal daily rhythm, respects your social life, adapts dynamically when your day changes, plans conflict-free schedules, and answers your most critical question with explainable logic:

> **"What should I do now?"**

---

## ⚡ Live Deployments & Downloads

| Platform | Access Link | Description |
| :--- | :--- | :--- |
| 🌐 **Live Web App (PWA)** | **[paoa-ai.vercel.app](https://paoa-ai.vercel.app)** | Runs in any browser on phone/PC. 1-tap **"Add to Home Screen"** to install like a native app with zero download warnings. |
| 📱 **Android Debug APK** | **[Download APK v1.0.0](https://github.com/adityasing9/PAOA/releases/download/v1.0.0/app-debug.apk)** | Native Android build with Room SQLite, background alarms, and offline speech recognition. |
| 📦 **GitHub Releases** | **[PAOA Releases](https://github.com/adityasing9/PAOA/releases)** | Automated CI/CD builds compiled on every push. |
| 📄 **GitHub Pages Mirror** | **[adityasing9.github.io/PAOA](https://adityasing9.github.io/PAOA/)** | Static PWA mirror hosted directly on GitHub Pages. |

---

## 🌟 Core Superpowers

### 1. 🤖 Dual-Brain AI (Free Gemini 2.0 Flash + Offline Fallback)
- **₹0 Operating Cost**: Uses Google AI Studio's 100% free Gemini 2.0 Flash / 1.5 Flash tier (no credit card or billing required).
- **True Conversational Intelligence**: Multi-turn dialogue memory. Say *"split it"*, *"move that earlier"*, or *"why did you place that there?"*.
- **Direct Action Execution**: The AI reasons conversationally and outputs structured scheduling actions (`SCHEDULE_TASK`, `RESCHEDULE_TASK`, `DELETE_TASK`, `COMPLETE_TASK`, `SET_UNAVAILABLE`, `UPDATE_PREFERENCE`).
- **Offline Rule Fallback**: When offline or without an API key, the deterministic pattern engine handles commands and scheduling without crashing.

### 2. 📅 Visual Day Timeline & Dynamic Scheduler
- **Visual Schedule (7:00 AM – 11:30 PM)**: Interactive color-coded timeline with a **live glowing time tracker**.
- **Human-Centric Optimization**: Optimizes for realistic completion rather than packing every second with unrealistic blocks.
- **Dynamic Rescheduling**: Life happens (*"I'm going out with friends from 5 to 8"*). PAOA automatically marks the block unavailable, protects hard deadlines, moves flexible items, and explains its rationale.
- **Buffer Rules**: Enforces user-configurable rest buffers (default: 15 mins) before and after deep work blocks.
- **Explainable Decisions**: Tap any block to read why it was scheduled (e.g. *"Placed during your peak focus window (17:00 - 20:00) with a 15-minute rest buffer"*).

### 3. 🎙️ Natural Voice Interaction
- **PWA (Web Speech API)**: Tap the microphone to talk with animated live sound waves; responses are read back using natural Text-to-Speech with 1-tap mute control.
- **Android**: Native `SpeechRecognizer` and `TextToSpeech` with offline pack support.

### 4. 🪞 Digital Twin & Personal Memory
- Remembers wake/sleep routines, peak focus hours, average session lengths, and procrastination patterns.
- Completely transparent: Inspect and edit your memory facts in **"What I Know About You"**.
- One-tap updates: Say *"I don't like studying in the morning anymore"* to adapt future schedule placements.

### 5. 🔒 Complete Privacy & Data Sovereignty
- 100% local persistence (`localStorage` / IndexedDB on PWA, encrypted SQLite Room on Android).
- Zero third-party telemetry, trackers, or hidden backends.
- **Export Data (JSON)** and **Purge All Data** buttons available at any time.

---

## 🗂️ Project Structure

```
PAOA/
├── pwa/                         # Progressive Web App (React 18 + Vite + TypeScript + Tailwind CSS v4)
│   ├── src/
│   │   ├── components/          # AssistantView, ScheduleView, TasksView, DigitalTwinView, Navbar
│   │   ├── services/            # gemini.ts, scheduler.ts, speech.ts, storage.ts
│   │   └── types/               # Task, ScheduleBlock, DigitalTwinProfile, ChatMessage
│   ├── public/                  # manifest.json, sw.js (Service Worker), icon.svg
│   └── package.json
│
├── app/                         # Native Android Application (Kotlin + Jetpack Compose Material 3)
│   ├── src/main/java/com/paoa/
│   │   ├── core/ai/             # GeminiClient, DeterministicCommandEngine, IntentRouter
│   │   ├── core/scheduler/      # SmartSchedulingEngine, DynamicRescheduler
│   │   ├── core/reminders/      # AlarmScheduler, NotificationCoordinator
│   │   ├── data/local/          # PAOADatabase, Room DAOs, SQLite Entities
│   │   └── ui/screens/          # Assistant, Calendar, Home, Insights, Settings
│   └── build.gradle.kts
│
└── .github/workflows/           # CI/CD Workflows
    ├── build-apk.yml            # Compiles and publishes Android APK to GitHub Releases
    └── deploy-pwa.yml           # Automatically builds and deploys PWA to GitHub Pages
```

---

## 🚀 Running the PWA Locally

### Prerequisites
- [Node.js](https://nodejs.org/) v18+ and `npm`

### Quick Start
```bash
# Clone the repository
git clone https://github.com/adityasing9/PAOA.git
cd PAOA/pwa

# Install dependencies
npm install

# Start development server
npm run dev -- --host
```

Open `http://localhost:5173/` in your browser. On your mobile phone connected to the same Wi-Fi, open the displayed network address (e.g. `http://192.168.x.x:5173/`) and tap **"Add to Home Screen"**!

---

## 📱 Building the Android App

### Prerequisites
- **JDK 17+** (e.g. OpenJDK 17)
- **Android SDK** API 34 (Android 14) / Min SDK 26

### Quick Start
```bash
# Build debug APK
./gradlew assembleDebug

# Run unit test suite (30 automated tests)
./gradlew testDebugUnitTest

# Install directly on connected device (ADB)
./gradlew installDebug
```

The compiled APK will be located at `app/build/outputs/apk/debug/app-debug.apk`.

---

## 💡 How to Connect Your Free Gemini AI Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey) and sign in with your Google account.
2. Tap **"Create API key"** and copy the generated key. (It is 100% free with no credit card required).
3. Open PAOA:
   - On the PWA: Open the **Digital Twin** tab, paste your key, and tap **"Save & Test"**.
   - On Android: Open the **Settings** screen, paste your key, and tap **"Save & Test"**.
4. You will see `✓ Connected to Gemini 2.0 Flash` activate immediately!

---

## 📄 License

Distributed under the MIT License. Free and open source for personal sovereignty.
