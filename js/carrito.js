(() => {
  // =========================
  // Helpers
  // =========================
  function makeKey(id, talle) {
    return `${String(id)}__${(talle || "").trim() || "SIN_TALLE"}`;
  }

  // =========================
  // Estado
  // =========================
  let productosEnCarrito = localStorage.getItem("productos-en-carrito");
  productosEnCarrito = productosEnCarrito ? JSON.parse(productosEnCarrito) : [];

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

  // OJO: para no chocar con otros scripts, lo llamo distinto
  const numeritoEl = document.querySelector("#numerito");

  let botonesEliminar = document.querySelectorAll(".carrito-producto-eliminar");

  // =========================
  // Render
  // =========================
  function cargarProductosCarrito() {
    if (productosEnCarrito && productosEnCarrito.length > 0) {
      contenedorCarritoVacio.classList.add("disabled");
      contenedorCarritoProductos.classList.remove("disabled");
      contenedorCarritoAcciones.classList.remove("disabled");
      contenedorCarritoComprado.classList.add("disabled");

      contenedorCarritoProductos.innerHTML = "";

      productosEnCarrito.forEach(producto => {
        const key = producto._key || makeKey(producto.id, producto.talle);

        const div = document.createElement("div");
        div.classList.add("carrito-producto");
        div.innerHTML = `
          <img class="carrito-producto-imagen" src="${producto.imagen}" alt="${producto.titulo}">
          <div class="carrito-producto-titulo">
            <small>Título</small>
            <h3>${producto.titulo}</h3>
          </div>

          <div class="carrito-producto-talle">
            <small>Talle</small>
            <p>${producto.talle ? producto.talle : "-"}</p>
          </div>

          <div class="carrito-producto-cantidad">
            <small>Cantidad</small>
            <p>${producto.cantidad}</p>
          </div>

          <div class="carrito-producto-precio">
            <small>Precio</small>
            <p>$${Number(producto.precio || 0)}</p>
          </div>

          <div class="carrito-producto-subtotal carrito-producto-subtotal">
            <small>Subtotal</small>
            <p>$${Number(producto.precio || 0) * Number(producto.cantidad || 0)}</p>
          </div>

          <button class="carrito-producto-eliminar" data-key="${key}" aria-label="Eliminar">
            <i class="bi bi-trash-fill"></i>
          </button>
        `;

        contenedorCarritoProductos.append(div);
      });

      actualizarBotonesEliminar();
      actualizarTotal();
      actualizarNumeritoCarrito();
    } else {
      contenedorCarritoVacio.classList.remove("disabled");
      contenedorCarritoProductos.classList.add("disabled");
      contenedorCarritoAcciones.classList.add("disabled");
      contenedorCarritoComprado.classList.add("disabled");

      actualizarNumeritoCarrito();
      if (totalEl) totalEl.innerText = "$0";
    }
  }

  cargarProductosCarrito();

  // =========================
  // Eliminar
  // =========================
  function actualizarBotonesEliminar() {
    botonesEliminar = document.querySelectorAll(".carrito-producto-eliminar");
    botonesEliminar.forEach(boton => {
      boton.addEventListener("click", eliminarDelCarrito);
    });
  }

  function eliminarDelCarrito(e) {
    Toastify({
      text: "Producto eliminado",
      duration: 3000,
      close: true,
      gravity: "top",
      position: "right",
      stopOnFocus: true,
      style: {
        background: "linear-gradient(to right, #111111, #6b6b6b)",
        borderRadius: "2rem",
        textTransform: "uppercase",
        fontSize: ".75rem"
      },
      offset: { x: "1.5rem", y: "1.5rem" }
    }).showToast();

    const key = e.currentTarget.dataset.key;
    const index = productosEnCarrito.findIndex(p => (p._key || makeKey(p.id, p.talle)) === key);

    if (index !== -1) {
      productosEnCarrito.splice(index, 1);
    }

    localStorage.setItem("productos-en-carrito", JSON.stringify(productosEnCarrito));
    cargarProductosCarrito();
  }

  // =========================
  // Vaciar
  // =========================
  botonVaciar?.addEventListener("click", vaciarCarrito);

  function vaciarCarrito() {
    if (!productosEnCarrito || productosEnCarrito.length === 0) return;

    Swal.fire({
      title: "¿Estás seguro?",
      icon: "question",
      html: `Se van a borrar ${productosEnCarrito.reduce((acc, producto) => acc + Number(producto.cantidad || 0), 0)} productos.`,
      showCancelButton: true,
      focusConfirm: false,
      confirmButtonText: "Sí",
      cancelButtonText: "No"
    }).then((result) => {
      if (result.isConfirmed) {
        productosEnCarrito = [];
        localStorage.setItem("productos-en-carrito", JSON.stringify(productosEnCarrito));
        cargarProductosCarrito();
      }
    });
  }

  // =========================
  // Total + Comprar
  // =========================
  function actualizarTotal() {
    const totalCalculado = productosEnCarrito.reduce(
      (acc, producto) => acc + (Number(producto.precio || 0) * Number(producto.cantidad || 0)),
      0
    );
    if (totalEl) totalEl.innerText = `$${totalCalculado}`;
  }

  botonComprar?.addEventListener("click", comprarCarrito);

  function comprarCarrito() {
    productosEnCarrito = [];
    localStorage.setItem("productos-en-carrito", JSON.stringify(productosEnCarrito));

    contenedorCarritoVacio.classList.add("disabled");
    contenedorCarritoProductos.classList.add("disabled");
    contenedorCarritoAcciones.classList.add("disabled");
    contenedorCarritoComprado.classList.remove("disabled");

    actualizarNumeritoCarrito();
    if (totalEl) totalEl.innerText = "$0";
  }

  function actualizarNumeritoCarrito() {
    const nuevoNumerito = productosEnCarrito.reduce((acc, producto) => acc + Number(producto.cantidad || 0), 0);
    if (numeritoEl) numeritoEl.innerText = nuevoNumerito;

    const numeritoFloat = document.querySelector("#numerito-float");
    if (numeritoFloat) numeritoFloat.innerText = nuevoNumerito;
  }
})();
