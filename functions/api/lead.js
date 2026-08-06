/**
 * POST /api/lead — recebe o formulário do site e repassa para o GHL.
 *
 * Existe por dois motivos:
 *  1. O repositório é público. A URL do webhook do GHL fica na variável de
 *     ambiente GHL_WEBHOOK_URL (Pages → Settings → Variables and Secrets),
 *     nunca no código que vai para o navegador.
 *  2. Postar do navegador direto para o GHL é cross-origin; aqui a chamada sai
 *     do servidor, então CORS deixa de ser um risco de perder lead.
 *
 * Sem GHL_WEBHOOK_URL configurada devolve 503 — a página então mostra o
 * telefone em vez de fingir que recebeu.
 */

const MAX_FIELD = 2000;

function clean(v) {
  return typeof v === "string" ? v.trim().slice(0, MAX_FIELD) : "";
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/* sem isto, um GET cai no fallback do Pages e devolve a home inteira com 200 —
   o que faria o Google indexar /api/lead como duplicata da página */
export function onRequest({ request }) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: { allow: "POST" } });
  }
  return onRequestPost(arguments[0]);
}

async function onRequestPost({ request, env }) {
  let data;
  try {
    data = await request.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const name = clean(data.name);
  const phone = clean(data.phone);
  if (!name || !phone) return json({ ok: false, error: "missing_fields" }, 400);

  /* honeypot: campo escondido que só robô preenche — responde 200 para não
     ensinar o robô que foi barrado, mas não encaminha nada */
  if (clean(data.company)) return json({ ok: true }, 200);

  const endpoint = env.GHL_WEBHOOK_URL;
  if (!endpoint) return json({ ok: false, error: "not_configured" }, 503);

  const payload = {
    name,
    phone,
    email: clean(data.email),
    service: clean(data.service),
    message: clean(data.message),
    source: "northhomesolutions.com",
    page: clean(data.page),
    submitted_at: new Date().toISOString(),
  };

  try {
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!upstream.ok) return json({ ok: false, error: "upstream_" + upstream.status }, 502);
    return json({ ok: true }, 200);
  } catch {
    return json({ ok: false, error: "upstream_unreachable" }, 502);
  }
}
