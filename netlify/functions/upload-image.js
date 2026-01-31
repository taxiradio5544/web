/*const crypto = require("crypto");

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
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: { "Access-Control-Allow-Origin": "*" } };
  if (event.httpMethod !== "POST") return json(405, { ok: false, error: "Method Not Allowed (use POST)" });

  try {
    const { fileBase64 } = JSON.parse(event.body || "{}");
    if (!fileBase64) return json(400, { ok: false, error: "Falta fileBase64" });

    const cloud = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloud || !apiKey || !apiSecret) {
      return json(500, { ok: false, error: "Faltan envs Cloudinary (CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET)" });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = "vanocz";

    // Firma: se firma SOLO lo que va como parámetros (NO el file)
    // Formato: "folder=...&timestamp=...<API_SECRET>"
    const toSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash("sha1").update(toSign).digest("hex");

    const body = new URLSearchParams();
    body.append("file", fileBase64);        // puede ser DataURL (lo tuyo lo es)
    body.append("api_key", apiKey);
    body.append("timestamp", String(timestamp));
    body.append("folder", folder);
    body.append("signature", signature);
    
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const data = await res.json();

    if (!res.ok) {
      return json(res.status, { ok: false, error: data });
    }

    return json(200, { ok: true, url: data.secure_url, public_id: data.public_id });
  } catch (err) {
    return json(500, { ok: false, error: "Netlify function error", details: String(err) });
  }
};
*/

const FormData = require("form-data");
const fetch = require("node-fetch");

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
  if (event.httpMethod === "OPTIONS") return json(204, { ok: true });
  if (event.httpMethod !== "POST") return json(405, { ok: false, error: "Method Not Allowed (use POST)" });

  try {
    const body = JSON.parse(event.body || "{}");
    const fileBase64 = body.fileBase64;
    if (!fileBase64) return json(400, { ok: false, error: "Falta fileBase64" });

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET; // tu preset unsigned
    const folder = process.env.CLOUDINARY_FOLDER || "vanocz";

    if (!cloudName) return json(500, { ok: false, error: "Falta CLOUDINARY_CLOUD_NAME" });
    if (!uploadPreset) return json(500, { ok: false, error: "Falta CLOUDINARY_UPLOAD_PRESET" });

    const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

    const form = new FormData();
    form.append("file", fileBase64);
    form.append("upload_preset", uploadPreset);
    form.append("folder", folder);

    const res = await fetch(url, { method: "POST", body: form });
    const data = await res.json();

    if (!res.ok) {
      return json(res.status, { ok: false, error: data });
    }

    // Cloudinary devuelve public_id y secure_url
    const publicId = data.public_id;
    const secureUrl = data.secure_url;

    // ✅ URL para mostrar SIEMPRE (convierte HEIC a formato compatible)
    // Opción A (recomendada): auto + calidad auto
    const displayUrl = `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto/${publicId}`;

    // Si querés forzar JPG sí o sí (más compatible todavía):
    // const displayUrl = `https://res.cloudinary.com/${cloudName}/image/upload/f_jpg,q_auto/${publicId}`;

    return json(200, {
      ok: true,
      url: displayUrl,        // <- ESTA es la que usará tu web y se guardará en Sheets
      original_url: secureUrl,
      public_id: publicId
    });

  } catch (err) {
    return json(500, { ok: false, error: String(err) });
  }
};
