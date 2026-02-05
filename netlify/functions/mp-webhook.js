const fetch = globalThis.fetch;

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}

exports.handler = async (event) => {
  // MP pega con POST
  if (event.httpMethod !== "POST") return json(200, { ok: true });

  try {
    const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
    const PRODUCTS_API_URL = process.env.PRODUCTS_API_URL;
    if (!MP_ACCESS_TOKEN || !PRODUCTS_API_URL) return json(500, { ok: false, error: "Faltan env vars" });

    // MP suele mandar info tipo: { type, data: { id } } o query params
    const body = event.body ? JSON.parse(event.body) : {};
    const paymentId =
      body?.data?.id ||
      body?.id ||
      event.queryStringParameters?.["data.id"] ||
      event.queryStringParameters?.id;

    if (!paymentId) return json(200, { ok: true, ignored: true });

    // 1) Consultar pago real a MP
    const payRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { "Authorization": `Bearer ${MP_ACCESS_TOKEN}` }
    });

    const pay = await payRes.json();
    if (!payRes.ok) return json(payRes.status, { ok: false, error: "MP payment fetch error", details: pay });

    const orderId = String(pay.external_reference || "");
    const status = String(pay.status || "pending").toLowerCase(); // approved / pending / rejected
    const amount = pay.transaction_amount ?? "";
    const currency = pay.currency_id ?? "";
    const paidAt = pay.date_approved ?? "";

    if (!orderId) return json(200, { ok: true, no_external_reference: true });

    // 2) Actualizar orden en Sheets
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
          status,
          mp_payment_id: String(paymentId),
          mp_status: status,
          mp_amount: amount,
          mp_currency: currency,
          mp_paid_at: paidAt
        }
      })
    });

    // 3) Si approved: aplicar stock (idempotente)
    if (status === "approved") {
      await fetch(PRODUCTS_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.PRODUCTS_API_TOKEN ? { "X-Api-Token": process.env.PRODUCTS_API_TOKEN } : {}),
        },
        body: JSON.stringify({
          action: "apply_stock",
          order_id: orderId
        })
      });
    }

    return json(200, { ok: true });
  } catch (e) {
    return json(200, { ok: true, error: String(e) }); // MP espera 200 igual
  }
};
