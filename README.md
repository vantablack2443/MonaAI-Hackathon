# Orion — Intelligent Agent Platform

A multi-agent AI platform built for the MonaAI Hackathon. Each agent is purpose-built for a specific business workflow at a real Saarland company, powered by Google Gemini 2.5 Flash.

## Agents

| # | Agent | Company | What it does |
|---|---|---|---|
| 1 | Work Permit Validation | Leistenschneider GmbH | Validates work permits and residence documents |
| 2 | Invoice Processing | Globus Group | Reads invoices, extracts fields, routes to department |
| 3 | Shift Replacement | UKS Homburg | Finds eligible staff to cover open hospital shifts |
| 4 | CV Fraud Detection | Persowerk Deutschland GmbH | Verifies CVs and certificates, detects fake companies |
| 5 | Interview Questions | Kohlpharma GmbH | Generates tailored interview questions per role and CV |
| 6 | Marketing & Filmmaker | Allgäuer Latschenkiefer | Creates short-form video reel concepts for TikTok/Instagram |
| 7 | Targeting Analytics | Allgäuer Latschenkiefer | Builds audience segments and timing signals per SKU |
| 8 | Dynamic Pricing | Allgäuer Latschenkiefer | Recommends price adjustments based on weather, events, supply signals |
| 9 | Competitive Gap Analysis | Allgäuer Latschenkiefer | Maps white-space opportunities against 10 competitors |
| 10 | Secure Email Agent | Rheinmetall AG | Verifies applicant documents with prompt-injection protection |

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **AI:** Google Gemini 2.5 Flash via `@google/generative-ai`
- **Features:** File upload (PDF, DOCX, PNG), Google Search grounding, per-agent temperature control

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/vantablack2443/monaai-hackathon.git
cd monaai-hackathon
npm install
```

### 2. Add your Gemini API key

Create a `.env.local` file in the project root:

```
GEMINI_API_KEY=your_key_here
```

Get a key at [Google AI Studio](https://aistudio.google.com/app/apikey).

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Security

The Secure Email Agent (Rheinmetall) implements three layers of prompt-injection protection:

1. **Pre-scan** — 15 regex patterns check all input for injection attempts before anything reaches Gemini
2. **Structural separation** — documents are passed as binary data parts, not embedded in the prompt
3. **Output validation** — responses are rejected if they don't match the expected checklist schema

## CV Fraud Detection

The CV Fraud agent uses **Google Search grounding** — Gemini actively searches the web to verify whether each employer actually exists before rating the CV. Unverifiable companies raise the risk score to Medium.

## Notes

- Staff roster, product data, and schedules are **synthetic demo data** for hackathon purposes
- Dr. Theiss agents (6–9) are grouped under one sidebar entry as they share a brand
