# Orion — Intelligent Agent Platform

Orion is a hackathon-built, multi-agent AI experience designed to show how conversational AI can support real business workflows in a fast, practical, and visually polished way. Built during the MonaAI Hackathon, the project brings together a set of specialized agents that help with document review, HR operations, finance workflows, customer insights, marketing, and more.

The idea behind Orion was simple: turn a set of common enterprise tasks into intuitive AI agents that feel useful from the first interaction. Instead of building a single generic chatbot, the project explores how multiple purpose-built agents can work together to make complex workflows feel approachable.

## Why this project exists

This project was created as a rapid proof of concept for how AI could be embedded into everyday business processes. The focus was not on building a perfect production system, but on demonstrating that a strong product experience can be created quickly when the right ideas, prompts, and interfaces come together.

To be transparent, this was mostly vibe coded in the best possible sense: fast, experimental, AI-assisted, and product-first. The goal was to ship something compelling, useful, and visually coherent under hackathon constraints rather than over-engineer every detail from the start.

## What Orion does

Orion presents a collection of domain-specific agents, each tuned for a concrete workflow:

- Review and validate documents such as work permits or invoices
- Support HR and staffing processes such as shift replacement and interview preparation
- Detect fraud or inconsistencies in CVs and supporting documents
- Help with marketing and competitive analysis
- Generate customer and pricing insights from business context
- Protect sensitive workflows with prompt-injection-aware handling

The experience is built as a lightweight web app where users can select an agent, interact with it naturally, and upload files when needed.

## Agent overview

| # | Agent | Company | What it does |
|---|---|---|---|
| 1 | Work Permit Validation | Leistenschneider GmbH | Reviews work permits and residency-related documents |
| 2 | Invoice Processing | Globus Group | Extracts invoice details, routes them to the appropriate department, and summarizes the action needed |
| 3 | Shift Replacement | UKS Homburg | Helps identify suitable staff to cover open hospital shifts |
| 4 | CV Fraud Detection | Persowerk Deutschland GmbH | Checks CVs and certificates for inconsistencies and suspicious signals |
| 5 | Interview Questions | Kohlpharma GmbH | Generates tailored interview questions based on a role and CV |
| 6 | Marketing & Filmmaker | Allgäuer Latschenkiefer | Creates short-form video and social content concepts |
| 7 | Targeting Analytics | Allgäuer Latschenkiefer | Builds audience segments and timing signals for product targeting |
| 8 | Dynamic Pricing | Allgäuer Latschenkiefer | Recommends pricing adjustments based on contextual signals |
| 9 | Competitive Gap Analysis | Allgäuer Latschenkiefer | Maps whitespace opportunities against competitor positioning |
| 10 | Secure Email Agent | Rheinmetall AG | Verifies submitted documents while reducing prompt-injection risk |

## Tech stack

- Next.js 14 with the App Router
- TypeScript
- Tailwind CSS
- Google Gemini 2.5 Flash via the Google Generative AI SDK
- File upload support for PDFs, DOCX, and images
- Prompt-based workflows tailored per agent

## Getting started

### 1. Clone the project

```bash
git clone https://github.com/vantablack2443/monaai-hackathon.git
cd monaai-hackathon
npm install
```

### 2. Add your Gemini API key

Create a `.env.local` file in the project root:

```env
GEMINI_API_KEY=your_key_here
```

You can generate a key at [Google AI Studio](https://aistudio.google.com/app/apikey).

### 3. Run locally

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Notes

- The staff roster, product data, and schedules included in the demo are synthetic and intended for hackathon purposes.
- The Dr. Theiss-related agents are grouped together in the interface because they share a common brand context.
- This project is best understood as a strong prototype and demo experience rather than a finished enterprise product.

