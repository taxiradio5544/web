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

  // =========================
  // Sync con productos reales (Sheets)
  // - Si borraste todo del Sheet, limpia carrito automáticamente
  // - Marca items sin stock (por talle si hay stock_talles)
  // =========================
  async function syncWithProducts() {
    try {
      const res = await fetch("/.netlify/functions/get-products");
      const data = await res.json();
      const productos = data.products || [];

      const mapById = new Map(productos.map(p => [String(p.id), p]));

      // Si no hay productos en la tienda (vos borraste todo), limpio el carrito
      if (productos.length === 0) {
        productosEnCarrito = [];
        saveCart(productosEnCarrito);
        updateBadges(productosEnCarrito);
        return;
      }

      // Reemplazo detalles del producto por los actuales (precio, imagen, etc),
      // y marco stockOk / stockDisponible
      productosEnCarrito = productosEnCarrito
        .map(item => {
          const id = String(item.id);
          const talle = String(item.talle || "").trim();
          const key = item._key || makeKey(id, talle);

          const p = mapById.get(id);
          if (!p) return null; // producto ya no existe => lo saco

          // stock por talle o general
          const stockMap = parseStockTalles(p.stock_talles);
          const usarStockPorTalle = Object.keys(stockMap).length > 0;

          let stockDisponible;
          if (usarStockPorTalle) {
            stockDisponible = Number(stockMap[talle] ?? 0);
          } else {
            const stockGeneral = (p.stock === "" || p.stock == null) ? 999 : Number(p.stock);
            stockDisponible = Number.isFinite(stockGeneral) ? stockGeneral : 0;
          }

          const stockOk = stockDisponible > 0;

          return {
            ...item,
            // refresco campos desde producto real
            titulo: p.titulo,
            imagen: p.imagen,
            precio: p.precio,
            precio_oferta: p.precio_oferta,
            activo: p.activo,
            stock: p.stock,
            talles: p.talles,
            stock_talles: p.stock_talles,
            // clave estable
            _key: key,
            // flags para UI
            _stockDisponible: stockDisponible,
            _stockOk: stockOk
          };
        })
        .filter(Boolean);

      saveCart(productosEnCarrito);
      updateBadges(productosEnCarrito);
    } catch (err) {
      console.warn("carrito.js: no se pudo sincronizar con productos. Uso lo que hay en localStorage.", err);
      // igual actualizo badge
      updateBadges(productosEnCarrito);
    }
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

      const sinStock = producto._stockOk === false; // si sync lo marcó
      const stockTag = sinStock
        ? `<small style="color:#b00020;font-weight:700">SIN STOCK</small>`
        : ``;

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

    Toastify({
      text: "Producto eliminado",
      duration: 2500,
      close: true,
      gravity: "top",
      position: "right",
      stopOnFocus: true
    }).showToast();

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
  // Comprar
  // =========================
  botonComprar?.addEventListener("click", () => {
    if (!productosEnCarrito || productosEnCarrito.length === 0) {
      setVistaVacia();
      return;
    }

    const haySinStock = productosEnCarrito.some(p => p._stockOk === false);
    if (haySinStock) {
      Swal.fire({
        title: "Hay productos sin stock",
        icon: "warning",
        text: "Eliminá los que dicen SIN STOCK para poder continuar."
      });
      return;
    }

    // Acá después lo conectamos con MercadoPago (por ahora simulamos compra)
    productosEnCarrito = [];
    saveCart(productosEnCarrito);
    updateBadges(productosEnCarrito);

    contenedorCarritoVacio.classList.add("disabled");
    contenedorCarritoProductos.classList.add("disabled");
    contenedorCarritoAcciones.classList.add("disabled");
    contenedorCarritoComprado.classList.remove("disabled");
    if (totalEl) totalEl.innerText = "$0";
  });

  // =========================
  // Init
  // =========================
  (async () => {
    updateBadges(productosEnCarrito);
    await syncWithProducts();
    cargarProductosCarrito();
  })();
})();
