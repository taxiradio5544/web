function json(statusCode, obj) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
    body: JSON.stringify(obj),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "POST, OPTIONS" } };
  }

  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "Method Not Allowed (use POST)" });
  }

  const url = process.env.PRODUCTS_API_URL;
  if (!url) return json(500, { ok: false, error: "Falta PRODUCTS_API_URL en Netlify" });

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (e) {
    return json(400, { ok: false, error: "Body inválido (JSON)" });
  }

  const items = Array.isArray(payload.items) ? payload.items : [];
  if (!items.length) return json(400, { ok:false, error:"items vacío" });

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.PRODUCTS_API_TOKEN ? { "X-Api-Token": process.env.PRODUCTS_API_TOKEN } : {}),
      },
      body: JSON.stringify({
        action: "purchase",
        items
      }),
    });

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!res.ok || !data.ok) {
      return json(res.status, { ok:false, error:"Apps Script error", details:data });
    }

    return json(200, { ok:true, data });
  } catch (err) {
    return json(500, { ok: false, error: "Netlify function error", details: String(err) });
  }
};
