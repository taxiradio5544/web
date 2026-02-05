const fetch = globalThis.fetch;

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { ok: false, error: "Method Not Allowed" });

  try {
    const body = JSON.parse(event.body || "{}");
    const { items, buyer = {} } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return json(400, { ok: false, error: "Faltan items" });
    }

    const PRODUCTS_API_URL = process.env.PRODUCTS_API_URL;
    const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
    const SITE_URL = process.env.SITE_URL;

    if (!PRODUCTS_API_URL) return json(500, { ok: false, error: "Falta PRODUCTS_API_URL" });
    if (!MP_ACCESS_TOKEN) return json(500, { ok: false, error: "Falta MP_ACCESS_TOKEN" });
    if (!SITE_URL) return json(500, { ok: false, error: "Falta SITE_URL" });

    // Total
    const total = items.reduce((acc, it) => acc + Number(it.unit_price || 0) * Number(it.quantity || 0), 0);

    // 1) Crear Orden en Sheets
    const createOrderRes = await fetch(PRODUCTS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.PRODUCTS_API_TOKEN ? { "X-Api-Token": process.env.PRODUCTS_API_TOKEN } : {}),
      },
      body: JSON.stringify({
        action: "create_order",
        order: {
          status: "created",
          total,
          items_json: JSON.stringify(items),
          buyer_name: buyer.name || "",
          buyer_phone: buyer.phone || "",
          buyer_address: buyer.address || "",
          notes: buyer.notes || ""
        }
      }),
    });

    const createOrderData = await createOrderRes.json();
    if (!createOrderRes.ok || !createOrderData.ok || !createOrderData.order_id) {
      return json(500, { ok: false, error: "No pude crear order en Sheets", details: createOrderData });
    }

    const orderId = createOrderData.order_id;

    // 2) Crear preference MercadoPago
    const prefBody = {
      external_reference: orderId,
      items: items.map(it => ({
        id: String(it.id || ""),
        title: String(it.title || "Producto"),
        quantity: Number(it.quantity || 1),
        unit_price: Number(it.unit_price || 0),
        currency_id: "UYU",
      })),
      back_urls: {
        success: `${SITE_URL}/gracias.html?order=${encodeURIComponent(orderId)}&status=success`,
        pending: `${SITE_URL}/gracias.html?order=${encodeURIComponent(orderId)}&status=pending`,
        failure: `${SITE_URL}/pago-fallido.html?order=${encodeURIComponent(orderId)}&status=failure`
      },
      auto_return: "approved",
      notification_url: `${SITE_URL}/.netlify/functions/mp-webhook`,
    };

    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(prefBody),
    });

    const mpData = await mpRes.json();
    if (!mpRes.ok) return json(mpRes.status, { ok: false, error: "MP error", details: mpData });

    // 3) Guardar preference_id en la orden
    await fetch(PRODUCTS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.PRODUCTS_API_TOKEN ? { "X-Api-Token": process.env.PRODUCTS_API_TOKEN } : {}),
      },
      body: JSON.stringify({
        action: "update_order",
        order_id: orderId,
        patch: {
          mp_preference_id: mpData.id,
          status: "pending"
        }
      }),
    });

    return json(200, {
      ok: true,
      orderId,
      preferenceId: mpData.id,
      init_point: mpData.init_point
    });

  } catch (e) {
    return json(500, { ok: false, error: String(e) });
  }
};
