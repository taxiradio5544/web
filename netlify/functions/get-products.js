function json(statusCode, obj) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(obj),
  };
}

exports.handler = async () => {
  try {
    const url = process.env.PRODUCTS_API_URL;
    if (!url) return json(500, { ok: false, error: "Falta PRODUCTS_API_URL" });

    const res = await fetch(url + "?action=get");
    const data = await res.json();

    return json(200, { ok: true, products: data.products || data });
  } catch (err) {
    return json(500, { ok: false, error: String(err) });
  }
};
