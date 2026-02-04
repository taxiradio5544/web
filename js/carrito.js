(() => {
  // =========================
  // Helpers
  // =========================
  function parseStockTalles(str) {
    const map = {};
    String(str || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean)
      .forEach(pair => {
        const [k, v] = pair.split(":").map(x => x.trim());
        if (!k) return;
        const n = Number(v);
        map[k] = Number.isFinite(n) ? n : 0;
      });
    return map;
  }

  function precioFinal(p) {
    const po = Number(p?.precio_oferta);
    if (Number.isFinite(po) && po > 0) return po;
    return Number(p?.precio || 0);
  }

  function makeKey(id, talle) {
    const t = String(talle || "").trim();
    return `${String(id)}__${t || "SIN_TALLE"}`;
  }

  function loadCart() {
    const raw = localStorage.getItem("productos-en-carrito");
    try {
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveCart(arr) {
    localStorage.setItem("productos-en-carrito", JSON.stringify(arr));
  }

  function updateBadges(arr) {
    const totalCant = (arr || []).reduce((acc, p) => acc + Number(p?.cantidad || 0), 0);

    const numeritoEl = document.querySelector("#numerito");
    if (numeritoEl) numeritoEl.innerText = totalCant;

    const numeritoFloat = document.querySelector("#numerito-float");
    if (numeritoFloat) numeritoFloat.innerText = totalCant;
  }

  function toast(text, isErr = false) {
    if (typeof Toastify === "function") {
      Toastify({
        text,
        duration: 2600,
        close: true,
        gravity: "top",
        position: "right",
        style: isErr
          ? { background: "linear-gradient(to right, #b00020, #ff4d6d)" }
          : undefined
      }).showToast();
    }
  }

  // Stock disponible para un producto + talle
  function stockDisponibleDe(p, talle) {
    if (!p) return 0;

    const stockMap = parseStockTalles(p.stock_talles);
    const usarStockPorTalle = Object.keys(stockMap).length > 0;

    if (usarStockPorTalle) {
      const t = String(talle || "").trim();
      return Number(stockMap[t] ?? 0);
    }

    // stock general: si está vacío/null => 999 (como venías usando)
    const stockGeneral = (p.stock === "" || p.stock == null) ? 999 : Number(p.stock);
    return Number.isFinite(stockGeneral) ? stockGeneral : 0;
  }

  // =========================
  // DOM
  // =========================
  const contenedorCarritoVacio = document.querySelector("#carrito-vacio");
  const contenedorCarritoProductos = document.querySelector("#carrito-productos");
  const contenedorCarritoAcciones = document.querySelector("#carrito-acciones");
  const contenedorCarritoComprado = document.querySelector("#carrito-comprado");

  const botonVaciar = document.querySelector("#carrito-acciones-vaciar");
  const totalEl = document.querySelector("#total");
  const botonComprar = document.querySelector("#carrito-acciones-comprar");

  if (!contenedorCarritoVacio || !contenedorCarritoProductos || !contenedorCarritoAcciones || !contenedorCarritoComprado) {
    console.warn("carrito.js: faltan contenedores del carrito en el HTML.");
    return;
  }

  // =========================
  // Estado
  // =========================
  let productosEnCarrito = loadCart();
  updateBadges(productosEnCarrito);

  // Productos reales (de Sheets)
  let productosReales = [];
  let mapById = new Map();

  // =========================
  // UI: Loading sin parpadeo
  // =========================
  function setLoadingUI(isLoading) {
    if (isLoading) {
      // en loading: oculto todo y muestro "cargando"
      contenedorCarritoVacio.classList.remove("disabled");
      contenedorCarritoVacio.innerText = "Cargando carrito...";
      contenedorCarritoProductos.classList.add("disabled");
      contenedorCarritoAcciones.classList.add("disabled");
      contenedorCarritoComprado.classList.add("disabled");
    } else {
      contenedorCarritoVacio.innerText = "Tu carrito está vacío.";
    }
  }

  // =========================
  // Sync con productos reales (Sheets)
  // - Limpia si no hay productos en sheets
  // - Actualiza info (precio, imagen, etc)
  // - Ajusta cantidad si excede stock
  // =========================
  async function fetchProductos() {
    const res = await fetch("/.netlify/functions/get-products");
    const data = await res.json();
    productosReales = data.products || [];
    mapById = new Map(productosReales.map(p => [String(p.id), p]));
  }

  function syncCartWithProducts() {
    // si borraste todo en sheets, limpio carrito
    if (productosReales.length === 0) {
      productosEnCarrito = [];
      saveCart(productosEnCarrito);
      updateBadges(productosEnCarrito);
      return;
    }

    let huboAjustes = false;

    productosEnCarrito = productosEnCarrito
      .map(item => {
        const id = String(item.id);
        const talle = String(item.talle || "").trim();
        const key = item._key || makeKey(id, talle);

        const p = mapById.get(id);
        if (!p) return null; // producto ya no existe => afuera

        const stockDisp = stockDisponibleDe(p, talle);
        const cant = Number(item.cantidad || 0);

        // si excede stock, recorto
        let nuevaCant = cant;
        if (stockDisp >= 0 && cant > stockDisp) {
          nuevaCant = Math.max(0, stockDisp);
          huboAjustes = true;
        }

        return {
          ...item,
          // refresco desde producto real
          titulo: p.titulo,
          imagen: p.imagen,
          precio: p.precio,
          precio_oferta: p.precio_oferta,
          activo: p.activo,
          stock: p.stock,
          talles: p.talles,
          stock_talles: p.stock_talles,
          _key: key,
          cantidad: nuevaCant,
          _stockDisponible: stockDisp
        };
      })
      .filter(Boolean)
      .filter(it => Number(it.cantidad || 0) > 0); // si quedó en 0 => lo saco

    if (huboAjustes) {
      toast("Ajusté cantidades por stock disponible.", true);
    }

    saveCart(productosEnCarrito);
    updateBadges(productosEnCarrito);
  }

  // =========================
  // Render
  // =========================
  function actualizarTotal() {
    const totalCalculado = productosEnCarrito.reduce((acc, p) => {
      const pf = precioFinal(p);
      return acc + pf * Number(p.cantidad || 0);
    }, 0);

    if (totalEl) totalEl.innerText = `$${totalCalculado}`;
  }

  function setVistaVacia() {
    contenedorCarritoVacio.classList.remove("disabled");
    contenedorCarritoProductos.classList.add("disabled");
    contenedorCarritoAcciones.classList.add("disabled");
    contenedorCarritoComprado.classList.add("disabled");
    contenedorCarritoProductos.innerHTML = "";
    if (totalEl) totalEl.innerText = "$0";
    updateBadges(productosEnCarrito);
  }

  function setVistaConProductos() {
    contenedorCarritoVacio.classList.add("disabled");
    contenedorCarritoProductos.classList.remove("disabled");
    contenedorCarritoAcciones.classList.remove("disabled");
    contenedorCarritoComprado.classList.add("disabled");
  }

  function cargarProductosCarrito() {
    if (!productosEnCarrito || productosEnCarrito.length === 0) {
      setVistaVacia();
      return;
    }

    setVistaConProductos();
    contenedorCarritoProductos.innerHTML = "";

    productosEnCarrito.forEach(producto => {
      const key = producto._key || makeKey(producto.id, producto.talle);

      const pf = precioFinal(producto);
      const cantidad = Number(producto.cantidad || 0);
      const subtotal = pf * cantidad;

      const stockDisp = Number(producto._stockDisponible ?? 0);
      const sinStock = stockDisp <= 0;

      const stockTag = sinStock
        ? `<small style="color:#b00020;font-weight:700">SIN STOCK</small>`
        : `<small style="opacity:.75">Stock: ${stockDisp}</small>`;

      const talleTxt = String(producto.talle || "").trim() || "-";

      const div = document.createElement("div");
      div.classList.add("carrito-producto");
      div.innerHTML = `
        <img class="carrito-producto-imagen" src="${producto.imagen}" alt="${producto.titulo}">
        <div class="carrito-producto-titulo">
          <small>Título</small>
          <h3>${producto.titulo}</h3>
          ${stockTag}
        </div>

        <div class="carrito-producto-talle">
          <small>Talle</small>
          <p>${talleTxt}</p>
        </div>

        <div class="carrito-producto-cantidad">
          <small>Cantidad</small>
          <p>${cantidad}</p>
        </div>

        <div class="carrito-producto-precio">
          <small>Precio</small>
          <p>$${pf}</p>
        </div>

        <div class="carrito-producto-subtotal">
          <small>Subtotal</small>
          <p>$${subtotal}</p>
        </div>

        <button class="carrito-producto-eliminar" data-key="${key}" aria-label="Eliminar">
          <i class="bi bi-trash-fill"></i>
        </button>
      `;

      contenedorCarritoProductos.append(div);
    });

    actualizarBotonesEliminar();
    actualizarTotal();
    updateBadges(productosEnCarrito);
  }

  // =========================
  // Eliminar
  // =========================
  function actualizarBotonesEliminar() {
    const botonesEliminar = document.querySelectorAll(".carrito-producto-eliminar");
    botonesEliminar.forEach(boton => boton.addEventListener("click", eliminarDelCarrito));
  }

  function eliminarDelCarrito(e) {
    const key = e.currentTarget?.dataset?.key;
    if (!key) return;

    toast("Producto eliminado");

    productosEnCarrito = productosEnCarrito.filter(p => (p._key || makeKey(p.id, p.talle)) !== key);
    saveCart(productosEnCarrito);
    cargarProductosCarrito();
  }

  // =========================
  // Vaciar
  // =========================
  botonVaciar?.addEventListener("click", () => {
    if (!productosEnCarrito || productosEnCarrito.length === 0) return;

    Swal.fire({
      title: "¿Estás seguro?",
      icon: "question",
      html: `Se van a borrar ${productosEnCarrito.reduce((acc, p) => acc + Number(p.cantidad || 0), 0)} productos.`,
      showCancelButton: true,
      focusConfirm: false,
      confirmButtonText: "Sí",
      cancelButtonText: "No"
    }).then((result) => {
      if (result.isConfirmed) {
        productosEnCarrito = [];
        saveCart(productosEnCarrito);
        cargarProductosCarrito();
      }
    });
  });

// =========================
// Comprar (con descuento real de stock)
// =========================
botonComprar?.addEventListener("click", comprarCarrito);

async function comprarCarrito() {
  if (!productosEnCarrito || productosEnCarrito.length === 0) {
    setVistaVacia();
    return;
  }

  const haySinStock = productosEnCarrito.some(p => Number(p._stockDisponible ?? 0) <= 0);
  if (haySinStock) {
    Swal.fire({
      title: "Hay productos sin stock",
      icon: "warning",
      text: "Eliminá los que dicen SIN STOCK para poder continuar."
    });
    return;
  }

  try {
    // armo payload para backend
    const items = productosEnCarrito.map(p => ({
      id: String(p.id || ""),
      talle: String(p.talle || "").trim(),
      cantidad: Number(p.cantidad || 0)
    }));

    const res = await fetch("/.netlify/functions/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items })
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      const msg = data?.details?.error || data?.error || "No se pudo completar la compra";
      Swal.fire({ icon: "error", title: "Error", text: msg });
      return;
    }

    // éxito → vaciar carrito
    productosEnCarrito = [];
    saveCart(productosEnCarrito);
    updateBadges(productosEnCarrito);

    contenedorCarritoVacio.classList.add("disabled");
    contenedorCarritoProductos.classList.add("disabled");
    contenedorCarritoAcciones.classList.add("disabled");
    contenedorCarritoComprado.classList.remove("disabled");
    if (totalEl) totalEl.innerText = "$0";

    Swal.fire({
      icon: "success",
      title: "Compra realizada",
      text: "El stock se actualizó automáticamente"
    });

  } catch (err) {
    console.error(err);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "No se pudo conectar con el servidor"
    });
  }
}


  // =========================
  // IMPORTANTE:
  // Control de stock al agregar desde la tienda:
  // El carrito no puede interceptar ese click si es otra página,
  // pero al sincronizar acá ya recorta cantidades si exceden.
  // =========================

  // =========================
  // Init
  // =========================
  (async () => {
    setLoadingUI(true);

    // Primero traigo productos reales
    try {
      await fetchProductos();
      syncCartWithProducts();
    } catch (err) {
      console.warn("carrito.js: fallo fetch productos", err);
      // igual seguimos con el carrito local
      updateBadges(productosEnCarrito);
    }

    setLoadingUI(false);
    cargarProductosCarrito();
  })();
})();
