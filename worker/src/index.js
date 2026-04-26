const ALLOWED_ORIGINS = [
  "https://madtrix7.github.io",
  "http://localhost:5173",
  "http://localhost:4173",
];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

function json(body, status, cors) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);
    if (url.pathname !== "/generate" || request.method !== "POST") {
      return json({ error: "Not Found" }, 404, cors);
    }

    if (!ALLOWED_ORIGINS.includes(origin)) {
      return json({ error: "Forbidden origin" }, 403, cors);
    }

    if (!env.ANTHROPIC_API_KEY) {
      return json({ error: "Worker missing ANTHROPIC_API_KEY secret" }, 500, cors);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400, cors);
    }

    const { rawInput, clientName, clientType } = body;
    if (typeof rawInput !== "string" || rawInput.trim().length === 0 || rawInput.length > 1000) {
      return json({ error: "rawInput must be a non-empty string under 1000 chars" }, 400, cors);
    }
    if (typeof clientName !== "string" || typeof clientType !== "string") {
      return json({ error: "clientName and clientType are required strings" }, 400, cors);
    }

    const prompt = `Tu es l'assistant de Mathéo, fondateur de Mira Systems basé à Cologne. Client concerné : ${clientName} (${clientType}).

Tâche brute saisie : "${rawInput}"

Réponds UNIQUEMENT en JSON valide, sans balises markdown, sans aucun texte avant ou après :
{
  "title": "Titre professionnel précis, max 65 caractères",
  "description": "1 à 2 phrases décrivant l'objectif et le livrable attendu",
  "steps": ["Étape 1 avec verbe d'action", "Étape 2", "..."]
}

4 à 6 étapes maximum. Chaque étape commence par un verbe d'action à l'infinitif.`;

    let anthropicRes;
    try {
      anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
        }),
      });
    } catch (e) {
      return json({ error: "Network error contacting Anthropic", detail: String(e) }, 502, cors);
    }

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      return json(
        { error: "Anthropic API error", status: anthropicRes.status, body: errText.slice(0, 500) },
        502,
        cors,
      );
    }

    const data = await anthropicRes.json();
    const raw = data?.content?.[0]?.text || "";
    const clean = raw.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      return json({ error: "Claude returned non-JSON", raw: raw.slice(0, 500) }, 502, cors);
    }

    return json(parsed, 200, cors);
  },
};
