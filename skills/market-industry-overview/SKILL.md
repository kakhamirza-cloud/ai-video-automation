---
name: market-industry-overview
description: Research market size, key players, and trends for an industry or niche (general business).
user-invocable: true
---

# Market and industry overview

Use this skill when the user wants a **high-level view of a market or industry**: size, main players, growth, and trends. Good for general business research before diving into competitors or concepts.

## Workflow

### 1. Define scope

- Clarify **industry, niche, or region** (e.g. "SaaS for small retailers", "plant-based food in Europe").
- If the user is vague, suggest a scope and confirm.

### 2. Research with web search

- Use **web_search** to find:
  - **Market size** (TAM/SAM/SOM if available; otherwise "market size [industry]", "[industry] market value").
  - **Key players** (top companies, brands, or products in the space).
  - **Trends** ("[industry] trends 2025", "[niche] growth", "emerging [industry]").
  - **Segments or categories** (e.g. by customer type, geography, product tier).
- Run 3–5 focused searches. Prefer recent sources (last 1–2 years).

### 3. Synthesize and present

- Summarize in a short **overview**: market size (with source or "estimates"), top 5–7 players, 2–4 main trends, and any notable segments.
- Use bullets or a short table. Cite that findings are from search; do not invent numbers.
- If the user might want deeper competitor or concept work next, say so and suggest the **competitor-research-concept** skill.

## Tools to use

- **web_search**: required. Use it for all market and industry data.
- Base everything on search results; do not invent market figures or company names.

## Example user prompts

- "Give me an overview of the [industry] market: size, main players, and trends."
- "What's the market like for [niche]? Who are the big players?"
- "Research the [region] market for [product type] and summarize."
- "Size of the [industry] market and key trends."
