# Product Intelligence VPL

A self-initiated productivity and data tool I built to automate the parts of my job that were eating up time — product research, spec tracking, and vendor comparisons — while learning the tools that actually power modern software: React, AI APIs, and cloud databases.

I work in retail tech sales and manage vendor product lists (VPL) as a Category Supervisor. This is my attempt to bring real data workflows to a role that typically runs on spreadsheets and gut instinct.

Try it here - **[Live Demo → bestbuy-vpl.vercel.app](https://bestbuy-vpl.vercel.app/)**

---

## What Problem This Solves

As a VPL supervisor, I regularly need to:
- Compare specs across 5–10 competing products to advise customers and make stocking recommendations
- Track which products meet criteria for specific promotions or vendor programs
- Stay current on specs for new wearables, health devices, and smart home gear

Doing this manually means juggling Best Buy's internal tools, manufacturer websites, and spec sheets. This tool centralizes it all and uses AI to fill in the gaps automatically.

---

## Features

### Product Comparison Engine
Side-by-side spec comparison table for up to 5 products simultaneously. Specs are organized by category (Display, Hardware, Connectivity, Health, etc.) with collapsible sections and a pinnable reference/benchmark product.

![Compare View](compare%20view.png)

### AI-Powered Spec Extraction
Built on the **Claude Haiku API** with live web search — when a product's spec fields are empty, one click auto-fills them by pulling from the web and parsing structured data. Falls back to Claude's training knowledge if search is unavailable. Cuts per-product research time from ~10 minutes to seconds.

### Live Database (Supabase)
All products and specs are stored in a PostgreSQL database via Supabase with real-time sync. Changes made on one device appear instantly on another — no refresh needed.

### Product Management
Full CRUD for products and specs. The add/edit form covers 14 wearable-specific spec fields and supports manual overrides for anything the AI gets wrong.

### Cost Controls
A settings toggle disables API calls when I'm browsing and don't need AI — so I'm not burning tokens on every page load.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS |
| AI / Spec Extraction | Anthropic Claude Haiku 4.5 (with web search) |
| Database | Supabase (PostgreSQL + Realtime) |
| Backend | Node.js serverless functions (Vercel) |
| Deployment | Vercel |

---

## Architecture

```
src/
├── components/
│   ├── SelectView      # Product browser + multi-select
│   ├── CompareView     # Spec comparison table
│   ├── ProductForm     # Add/edit + AI auto-fill
│   └── SettingsModal   # API cost controls
api/
├── fetch-specs.js      # Claude + web search → structured JSON specs
└── batch-check.js      # Batch spec validation across products
```

API calls go through serverless functions so the Anthropic key never touches the client.

---

## Why I Built This

I'm not a developer by title — I'm in sales. But I've always been the person on my team who figures out how to make the job smarter. This project started as a personal tool and turned into a full-stack app I actually use at work.

Building it taught me:
- How to design and query a relational database schema
- How to integrate and prompt LLMs for structured data extraction
- How to ship a React app with real-time state and a backend API
- How to think about cost and latency tradeoffs when using paid AI APIs

It's an ongoing project. I add features when I hit a real problem at work.

---

## Roadmap

- [ ] Vendor sell-through rate tracking (pull from internal reports)
- [ ] Promotion eligibility checker (match products against promo spec criteria)
- [ ] Price history logging
- [ ] Export to PDF for vendor meetings

---

## Setup

```bash
npm install
```

Create a `.env` file (see `.env.example`):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
ANTHROPIC_API_KEY=...
```

```bash
npm run dev
```
