
const FormData = require("form-data");
const crypto = require("crypto");

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const { fileBase64 } = JSON.parse(event.body || "{}");
    if (!fileBase64) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Falta fileBase64" }) };
    }

    const cloud = process.env.CLOUDINARY_CLOUD_NAME;
    const key = process.env.CLOUDINARY_API_KEY;
    const secret = process.env.CLOUDINARY_API_SECRET;

    if (!cloud || !key || !secret) {
      return { statusCode: 500, body: JSON.stringify({ ok: false, error: "Faltan variables de Cloudinary en Netlify" }) };
    }

    const folder = "vanocz";
    const timestamp = Math.floor(Date.now() / 1000);

    // Firma Cloudinary (subida segura)
    const signature = crypto
      .createHash("sha1")
      .update(`folder=${folder}&timestamp=${timestamp}${secret}`)
      .digest("hex");

    const form = new FormData();
    form.append("file", fileBase64); // data:image/...;base64,...
    form.append("api_key", key);
    form.append("timestamp", timestamp);
    form.append("signature", signature);
    form.append("folder", folder);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
      method: "POST",
      body: form,
    });

    const data = await res.json();

    if (!res.ok) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: data }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, url: data.secure_url }),
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: e.message }) };
  }
};
