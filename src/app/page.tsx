"use client";

import { useState } from "react";

interface Scores {
  titel: number;
  beschrijving: number;
  bulletPoints: number;
  compleetheid: number;
}

interface Verbetering {
  categorie: string;
  prioriteit: "hoog" | "gemiddeld" | "laag";
  advies: string;
  voorbeeld?: string;
}

interface AnalysisResult {
  scores: Scores;
  benchmark: {
    gemiddeldeScore: number;
    topPerforming: string;
  };
  verbeteringen: Verbetering[];
  conclusie: string;
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const color = score >= 70 ? "bg-green-500" : score >= 50 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="font-bold">{score}/100</span>
      </div>
      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500 ease-out`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function getScoreColor(score: number) {
  if (score >= 70) return "text-green-600";
  if (score >= 50) return "text-yellow-600";
  return "text-red-600";
}

function PrioriteitBadge({ p }: { p: string }) {
  const styles = {
    hoog: "bg-red-100 text-red-700",
    gemiddeld: "bg-yellow-100 text-yellow-700",
    laag: "bg-blue-100 text-blue-700",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${styles[p as keyof typeof styles]}`}>
      {p}
    </span>
  );
}

export default function Home() {
  const [productUrl, setProductUrl] = useState("");
  const [ean, setEan] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualDesc, setManualDesc] = useState("");
  const [manualBullets, setManualBullets] = useState("");
  const [mode, setMode] = useState<"url" | "manual">("manual");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");

  const avgScore = result
    ? Math.round(
        (result.scores.titel +
          result.scores.beschrijving +
          result.scores.bulletPoints +
          result.scores.compleetheid) /
          4
      )
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      let payload: Record<string, string> = { source: mode };

      if (!manualTitle) {
        throw new Error("Vul minimaal een titel in");
      }
      payload.searchTerm = searchTerm;
      payload.productContent = JSON.stringify({
        titel: manualTitle,
        beschrijving: manualDesc,
        bulletPoints: manualBullets.split("\n").filter(Boolean),
      });
      if (mode === "url") {
        payload.url = productUrl;
        payload.ean = ean;
      }

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Analyse mislukt");
      }

      const data = await res.json();
      setResult(data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onbekende fout");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-700/50">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center font-bold text-xl">
            C
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">CopyRank</h1>
            <p className="text-xs text-slate-400">AI product listing analyzer</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {/* Hero */}
        <div className="text-center space-y-3">
          <h2 className="text-4xl font-bold">
            Optimaliseer je <span className="text-indigo-400">productlisting</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Analyseer Titel, Beschrijving en Bullets. Krijg concrete verbeteradviezen op basis van AI-analyse van top-presterende concurrenten.
          </p>
        </div>

        {/* Input Card */}
        <form onSubmit={handleSubmit} className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700/50 p-6 space-y-6">
          {/* Mode Toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("manual")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                mode === "manual"
                  ? "bg-indigo-500 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              Voer zelf in
            </button>
            <button
              type="button"
              onClick={() => setMode("url")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                mode === "url"
                  ? "bg-indigo-500 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              Via URL / EAN
            </button>
          </div>

          {mode === "manual" ? (
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Zoekterm <span className="text-slate-500">(optioneel)</span>
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="bijv. 'hondenvoer premium'"
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Product Titel *</label>
                <input
                  type="text"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="Volledige product titel zoals op Bol.com/Amazon"
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Beschrijving</label>
                <textarea
                  value={manualDesc}
                  onChange={(e) => setManualDesc(e.target.value)}
                  placeholder="Volledige productbeschrijving..."
                  rows={4}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Bullet Points <span className="text-slate-500">(één per regel)</span></label>
                <textarea
                  value={manualBullets}
                  onChange={(e) => setManualBullets(e.target.value)}
                  placeholder="• Eerste USP&#10;• Tweede USP&#10;• Derde USP"
                  rows={4}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Product URL</label>
                <input
                  type="url"
                  value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">EAN</label>
                <input
                  type="text"
                  value={ean}
                  onChange={(e) => setEan(e.target.value)}
                  placeholder="1234567890123"
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Zoekterm <span className="text-slate-500">(optioneel)</span></label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="waarvoor wil je gevonden worden?"
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Titel *</label>
                <input
                  type="text"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="Volledige product titel"
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Beschrijving</label>
                <textarea
                  value={manualDesc}
                  onChange={(e) => setManualDesc(e.target.value)}
                  placeholder="Volledige productbeschrijving..."
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Bullet Points <span className="text-slate-500">(één per regel)</span></label>
                <textarea
                  value={manualBullets}
                  onChange={(e) => setManualBullets(e.target.value)}
                  placeholder="• Eerste USP&#10;• Tweede USP&#10;• Derde USP"
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-500/50 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analyseren...
              </>
            ) : (
              "Analyseer nu"
            )}
          </button>
        </form>

        {/* Results */}
        {result && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Overall Score */}
            <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700/50 p-6 text-center">
              <p className="text-slate-400 text-sm uppercase tracking-wider mb-2">Algemene Score</p>
              <p className={`text-6xl font-bold ${getScoreColor(avgScore)}`}>{avgScore}</p>
              <p className="text-slate-500 text-sm mt-1">/ 100</p>
            </div>

            {/* Score Bars */}
            <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700/50 p-6 space-y-4">
              <h3 className="text-lg font-semibold mb-4">Scores</h3>
              <ScoreBar label="Titel" score={result.scores.titel} />
              <ScoreBar label="Beschrijving" score={result.scores.beschrijving} />
              <ScoreBar label="Bullet Points" score={result.scores.bulletPoints} />
              <ScoreBar label="Compleetheid" score={result.scores.compleetheid} />
            </div>

            {/* Benchmark */}
            <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700/50 p-6">
              <h3 className="text-lg font-semibold mb-3">Benchmark</h3>
              <p className="text-indigo-400 font-medium text-2xl mb-2">{result.benchmark.gemiddeldeScore}/100</p>
              <p className="text-slate-300 leading-relaxed">{result.benchmark.topPerforming}</p>
            </div>

            {/* Verbeteringen */}
            <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700/50 p-6">
              <h3 className="text-lg font-semibold mb-4">Verbeteradviezen</h3>
              <div className="space-y-3">
                {result.verbeteringen.map((v, i) => (
                  <div key={i} className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <span className="font-medium text-white">{v.categorie}</span>
                      <PrioriteitBadge p={v.prioriteit} />
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed">{v.advies}</p>
                    {v.voorbeeld && (
                      <div className="mt-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-3 py-2 text-sm text-indigo-300">
                        <span className="font-medium">Voorbeeld: </span>{v.voorbeeld}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Conclusie */}
            <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 backdrop-blur rounded-2xl border border-indigo-500/20 p-6">
              <h3 className="text-lg font-semibold mb-2">Conclusie</h3>
              <p className="text-slate-200 leading-relaxed">{result.conclusie}</p>
            </div>
          </div>
        )}

        {/* Footer info */}
        {!result && !loading && (
          <p className="text-center text-slate-500 text-sm">
            Voer productdata in en krijg binnen secondes inzicht in je listingkwaliteit
          </p>
        )}
      </main>
    </div>
  );
}