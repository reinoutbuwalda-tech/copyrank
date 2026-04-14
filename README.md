# CopyRank

AI-powered product listing analyzer for Bol.com and Amazon sellers.

Paste your product content (titel, beschrijving, bullets) of vul een URL/EAN in en krijg direct inzicht in je listingkwaliteit met concrete verbeteradviezen.

## Features

- **Titel analyse** - SEO-optimalisatie, leesbaarheid, zoektermen
- **Beschrijving evaluatie** - Structuur, volledigheid, overtuigingskracht
- **Bullet point scoring** - Aanwezigheid, specificatie, formaat
- **Benchmark vergelijking** - Hoe scoor je t.o.v. top-concurrenten?
- **Concrete verbeteradviezen** - Met prioriteit en voorbeelden

## Tech Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **OpenAI GPT-4o**

## Getting Started

1. **Kloon en installeer**
   ```bash
   cd copyrank
   npm install
   ```

2. **Omgevingsvariabelen**
   ```bash
   cp .env.example .env.local
   # Vul je OpenAI API key in
   ```

3. **Start de dev server**
   ```bash
   npm run dev
   ```

4. **Open** [http://localhost:3000](http://localhost:3000)

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Je OpenAI API key (verplicht) |
| `FIRECRAWL_API_KEY` | Voor automatisch URL's ophalen (optioneel) |

## Roadmap

- [ ] Firecrawl integratie voor automatisch URL's ophalen
- [ ] Bol.com / Amazon API integratie
- [ ] Historische scores bijhouden
- [ ] Batch analyse voor meerdere producten