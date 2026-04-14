import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { tavily } from "@tavily/core";

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

const SYSTEM_PROMPT = `Je bent CopyRank — een expert in e-commerce product listing optimalisatie voor Bol.com en Amazon marketplaces.

Je analyseert productcontent en vergelijkt deze met top-presterende concurrenten in dezelfde categorie.

Geef altijd een gestructureerd JSON-antwoord met deze exacte keys:

{
  "scores": {
    "titel": 0-100,
    "beschrijving": 0-100,
    "bulletPoints": 0-100,
    "compleetheid": 0-100
  },
  "benchmark": {
    "gemiddeldeScore": 0-100,
    "topPerforming": "omschrijving wat top concurrenten doen"
  },
  "verbeteringen": [
    {
      "categorie": "Titel|Beschrijving|Bullets|SEO",
      "prioriteit": "hoog|gemiddeld|laag",
      "advies": "specifiek, uitvoerbaar advies",
      "voorbeeld": "optioneel voorbeeld tekst"
    }
  ],
  "conclusie": "kort bondig inzicht over de listing kwaliteit"
}

Focus bij analyse op:
- Titel: zoekmachineoptimalisatie, leesbaarheid, merk+Dier+belangrijkste USPs+belangrijkste zoektermen
- Beschrijving: structuur, volledigheid, overtuigingskracht, tonality
- BulletPoints: presence, specificatie, formaat
- Completeitheid: alle verwachte velden ingevuld, afbeeldingen, A+ content beschikbaar`;

// ============================================================================
// SCRAPER: Brave Search + Tavily Extract
// ============================================================================

async function searchWithBrave(query: string, apiKey: string): Promise<string | null> {
  try {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`;
    const res = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "X-Subscription-Token": apiKey,
      },
    });
    
    if (!res.ok) {
      console.error("Brave search failed:", res.status);
      return null;
    }
    
    const data = await res.json();
    const results = data?.web?.results || [];
    
    // Find first Bol.com product URL
    for (const r of results) {
      if (r.url && r.url.includes("bol.com") && r.url.includes("/p/")) {
        return r.url;
      }
    }
    
    // Fallback: return first result
    return results[0]?.url || null;
  } catch (err) {
    console.error("Brave search error:", err);
    return null;
  }
}

async function extractWithTavily(urls: string[], apiKey: string): Promise<Record<string, string>> {
  try {
    const client = tavily({ apiKey });
    const res = await client.extract({ urls });
    
    const extracted: Record<string, string> = {};
    for (const result of res.results) {
      if (result.raw_content) {
        extracted[result.url] = result.raw_content;
      }
    }
    return extracted;
  } catch (err) {
    console.error("Tavily extract error:", err);
    return {};
  }
}

function parseBolcomProduct(content: string): { titel: string; beschrijving: string; bullets: string[] } {
  // Simple extraction patterns for Bol.com product page
  const titel = extractBetween(content, /<title>([^<]+)<\/title>/i) 
    || extractBetween(content, /"name":\s*"([^"]+)"/)
    || "";
  
  // Extract description - look for structured data or main content
  const beschrijving = extractBetween(content, /"description":\s*"([^"]+)"/i)
    || extractBetween(content, /<meta name="description" content="([^"]+)"/i)
    || extractFirstParagraph(content)
    || "";
  
  // Extract bullet points
  const bullets: string[] = [];
  const bulletMatches = content.match(/["•·-]\s*([^"<\n]{10,100})/g);
  if (bulletMatches) {
    bullets.push(...bulletMatches.slice(0, 5).map(b => b.replace(/^["•·-]\s*/, '').trim()));
  }
  
  return { titel, beschrijving, bullets };
}

function extractBetween(text: string, regex: RegExp): string | null {
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}

function extractFirstParagraph(text: string): string | null {
  // Find content between common paragraph tags or divs
  const pMatch = text.match(/<p[^>]*>([^<]{50,})<\/p>/i);
  if (pMatch) return pMatch[1].trim();
  
  const divMatch = text.match(/<div[^>]*class="[^"]*description[^"]*"[^>]*>([^<]{100,})/i);
  if (divMatch) return divMatch[1].replace(/<[^>]+>/g, ' ').trim();
  
  return null;
}

// ============================================================================
// MAIN API HANDLER
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const { productContent, searchTerm, source, url, ean } = await req.json();

    // ----------------------------------------------------------------
    // URL/EAN MODE: Use Brave + Tavily to scrape
    // ----------------------------------------------------------------
    if (source === "url") {
      const braveKey = process.env.BRAVE_API_KEY;
      const tavilyKey = process.env.TAVILY_API_KEY;

      if (!braveKey || !tavilyKey) {
        return NextResponse.json(
          { error: "Scraper API keys niet geconfigureerd" },
          { status: 500 }
        );
      }

      // Build search query
      let searchQuery = searchTerm || "";
      if (ean) {
        searchQuery = searchQuery ? `${ean} ${searchQuery}` : ean;
      }
      searchQuery += " bol.com";
      
      // Step 1: Find product URL with Brave
      const productUrl = await searchWithBrave(searchQuery, braveKey);
      if (!productUrl) {
        return NextResponse.json(
          { error: "Kon geen product vinden op Bol.com. Probeer een andere zoekterm." },
          { status: 404 }
        );
      }

      // Step 2: Extract content with Tavily
      const extracted = await extractWithTavily([productUrl], tavilyKey);
      const rawContent = extracted[productUrl];
      
      if (!rawContent) {
        return NextResponse.json(
          { error: "Kon product content niet ophalen. Probeer handmatige invoer." },
          { status: 500 }
        );
      }

      // Step 3: Parse the content
      const parsed = parseBolcomProduct(rawContent);
      
      if (!parsed.titel) {
        return NextResponse.json(
          { error: "Kon productinformatie niet extraheren. Probeer 'Voer zelf in' modus." },
          { status: 422 }
        );
      }

      // Build product content for analysis
      const productData = {
        titel: parsed.titel || "",
        beschrijving: parsed.beschrijving || "",
        bulletPoints: parsed.bullets || []
      };

      // Step 4: Analyze with OpenAI
      const openai = getOpenAI();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Analyseer dit product voor zoekterm: "${searchTerm || "niet gespecificeerd"}

Product data:
${JSON.stringify(productData, null, 2)}

Bron: ${productUrl}

Geef een grondige analyse met concrete verbeteringen.` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        return NextResponse.json({ error: "Geen response van AI" }, { status: 500 });
      }
      
      const analysis = JSON.parse(content);
      
      return NextResponse.json({
        success: true,
        source: "url",
        searchTerm: searchTerm || "onbekend",
        scrapedUrl: productUrl,
        analysis,
        mode: "scraped"
      });
    }

    // ----------------------------------------------------------------
    // MANUAL MODE: Direct product content
    // ----------------------------------------------------------------
    if (!productContent) {
      return NextResponse.json(
        { error: "Product content is required" },
        { status: 400 }
      );
    }

    const parsed = typeof productContent === 'string' ? JSON.parse(productContent) : productContent;
    const openai = getOpenAI();
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Analyseer dit product voor zoekterm: "${searchTerm || "niet gespecificeerd"}

Product data:
${JSON.stringify(parsed, null, 2)}

Bron: handmatige invoer

Geef een grondige analyse met concrete verbeteringen.` }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      return NextResponse.json({ error: "Geen response van AI" }, { status: 500 });
    }
    
    const result = JSON.parse(content);
    
    return NextResponse.json({
      success: true,
      source: "manual",
      searchTerm: searchTerm || "onbekend",
      analysis: result,
      mode: "manual"
    });

  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "Analyse mislukt. Check je API key en input." },
      { status: 500 }
    );
  }
}
