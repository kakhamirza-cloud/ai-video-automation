---
name: competitor-swot
description: Build a SWOT (strengths, weaknesses, opportunities, threats) for one or more competitors using web search.
user-invocable: true
---

# Competitor SWOT analysis

Use this skill when the user wants **SWOT analysis** for specific competitors (or "top competitors in [niche]"). Complements competitor-research-concept by going deeper on individual players.

## Workflow

### 1. Identify competitors

- If the user names competitors, use those.
- If they only give a niche (e.g. "project management tools"), use **web_search** first: "[niche] top competitors", "[niche] main players", then pick 2–4 to analyze.

### 2. Research each competitor

- For each competitor, use **web_search** to find:
  - **Strengths**: brand, product strengths, market position, resources.
  - **Weaknesses**: complaints, limitations, gaps, negative reviews or press.
  - **Opportunities**: growth areas, new markets, trends that favor them.
  - **Threats**: competition, regulation, substitutes, risks.
- Queries like: "[competitor] strengths weaknesses", "[competitor] review", "[competitor] market position", "[competitor] 2025 strategy" (or current year).

### 3. Present SWOT

- For each competitor, output a clear **SWOT table or list** (Strengths, Weaknesses, Opportunities, Threats).
- Add 2–4 bullets per quadrant. Keep it factual and from search; do not invent.
- Optionally add a one-line "Summary" or "Positioning" per competitor.
- If the user also wants concepts or differentiation ideas, suggest using **competitor-research-concept** next.

## Tools to use

- **web_search**: required for every competitor. Use it before writing any SWOT.
- Base everything on search results; do not invent strengths/weaknesses.

## Example user prompts

- "Do a SWOT analysis for [Company A] and [Company B]."
- "SWOT for the main competitors in [industry]."
- "What are the strengths and weaknesses of [competitor]? Include opportunities and threats."
- "Compare [Competitor 1] vs [Competitor 2] with a SWOT each."
