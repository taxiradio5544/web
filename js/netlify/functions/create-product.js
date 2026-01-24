const fetch = require("node-fetch");

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
