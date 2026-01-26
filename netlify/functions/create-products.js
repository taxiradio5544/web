/*const fetch = require("node-fetch");

function nextIdForCategory(allProducts, categoryId) {
  const re = new RegExp(`^${categoryId}-(\\d+)$`, "i");
  let max = 0;

  for (const p of allProducts) {
    const id = String(p.id || "");
    const m = id.match(re);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }

  return `${categoryId}-${String(max + 1).padStart(2, "0")}`;
}

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");

    if (body.adminToken !== process.env.ADMIN_TOKEN) {
      return { statusCode: 401, body: JSON.stringify({ ok: false, error: "No autorizado" }) };
    }

    const api = process.env.PRODUCTS_API_URL;
    const token = process.env.PRODUCTS_API_TOKEN;

    const res = await fetch(api);
    const productos = await res.json();

    const id = nextIdForCategory(productos, body.categoria);

    const payload = {
      token,
      action: "create",
      id,
      titulo: body.titulo,
      precio: body.precio,
      categoria: body.categoria,
      imagen: body.imagen,
      activo: "si"
    };

    const save = await fetch(api, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const r = await save.json();

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, id })
    };

  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: e.message })
    };
  }
};
*/
// netlify/functions/create-products.js

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
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "POST, OPTIONS" } };
  }

  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "Method Not Allowed (use POST)" });
  }

  // Validar token admin
  const auth = event.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return json(401, { ok: false, error: "Unauthorized" });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (e) {
    return json(400, { ok: false, error: "Body inválido (JSON)" });
  }

  const { id, titulo, precio, categoria, imagen } = payload;

  if (!titulo || !precio || !categoria || !imagen) {
    return json(400, { ok: false, error: "Faltan campos: titulo, precio, categoria, imagen" });
  }

  // TU_URL = PRODUCTS_API_URL (tu Google Apps Script /exec)
  const url = process.env.PRODUCTS_API_URL;
  if (!url) return json(500, { ok: false, error: "Falta PRODUCTS_API_URL en Netlify" });

  try {
    // Ajustá el formato según tu Apps Script.
    // Si tu Apps Script espera {action:"append", row:{...}} dejalo así.
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.PRODUCTS_API_TOKEN ? { "X-Api-Token": process.env.PRODUCTS_API_TOKEN } : {}),
      },
      body: JSON.stringify({
        action: "append",
        row: {
          id: id || "",
          titulo,
          precio: Number(precio),
          categoria: String(categoria).toLowerCase(),
          imagen,
        },
      }),
    });

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!res.ok) {
      return json(res.status, { ok: false, error: "Apps Script error", details: data });
    }

    return json(200, { ok: true, data });
  } catch (err) {
    return json(500, { ok: false, error: "Netlify function error", details: String(err) });
  }
};
