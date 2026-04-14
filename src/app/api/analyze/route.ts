import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

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

export async function POST(req: NextRequest) {
  try {
    const { productContent, searchTerm, source } = await req.json();

    if (!productContent) {
      return NextResponse.json(
        { error: "Product content is required" },
        { status: 400 }
      );
    }

    const userPrompt = `Analyseer dit product voor zoekterm: "${searchTerm || "niet gespecificeerd"}"

Product data:
${JSON.stringify(productContent, null, 2)}

Bron: ${source || "onbekend"}

Geef een grondige analyse met concrete verbeteringen.`; 

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
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
      source: source || "manual",
      searchTerm: searchTerm || "onbekend",
      analysis: result,
      model: "gpt-4o"
    });

  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "Analyse mislukt. Check je API key en input." },
      { status: 500 }
    );
  }
}