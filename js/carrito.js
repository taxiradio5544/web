let productosEnCarrito = localStorage.getItem("productos-en-carrito");
productosEnCarrito = productosEnCarrito ? JSON.parse(productosEnCarrito) : [];

const contenedorCarritoVacio = document.querySelector("#carrito-vacio");
const contenedorCarritoProductos = document.querySelector("#carrito-productos");
const contenedorCarritoAcciones = document.querySelector("#carrito-acciones");
const contenedorCarritoComprado = document.querySelector("#carrito-comprado");

let botonesEliminar = document.querySelectorAll(".carrito-producto-eliminar");
let botonesSumar = document.querySelectorAll(".carrito-producto-sumar");
let botonesRestar = document.querySelectorAll(".carrito-producto-restar");

const botonVaciar = document.querySelector("#carrito-acciones-vaciar");
const total = document.querySelector("#total");
const botonComprar = document.querySelector("#carrito-acciones-comprar");
const numerito = document.querySelector("#numerito");

function makeKey(id, talle) {
  return `${id}__${(talle || "").trim() || "SIN_TALLE"}`;
}

function precioFinal(producto) {
  const po = Number(producto.precio_oferta);
  if (Number.isFinite(po) && po > 0) return po;
  return Number(producto.precio || 0);
}

function persistirCarrito() {
  localStorage.setItem("productos-en-carrito", JSON.stringify(productosEnCarrito));
}

function cargarProductosCarrito() {
  if (productosEnCarrito && productosEnCarrito.length > 0) {
    contenedorCarritoVacio.classList.add("disabled");
    contenedorCarritoProductos.classList.remove("disabled");
    contenedorCarritoAcciones.classList.remove("disabled");
    contenedorCarritoComprado.classList.add("disabled");

    contenedorCarritoProductos.innerHTML = "";

    productosEnCarrito.forEach(producto => {
      const div = document.createElement("div");
      div.classList.add("carrito-producto");

      const key = producto._key || makeKey(producto.id, producto.talle);
      const pFinal = precioFinal(producto);
      const cant = Number(producto.cantidad || 0);
      const subtotal = pFinal * cant;

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
          <div style="display:flex;align-items:center;gap:10px;">
            <button class="carrito-producto-restar" data-key="${key}" aria-label="Restar" style="border:none;border-radius:999px;padding:6px 10px;cursor:pointer;">−</button>
            <p style="margin:0;min-width:24px;text-align:center;">${cant}</p>
            <button class="carrito-producto-sumar" data-key="${key}" aria-label="Sumar" style="border:none;border-radius:999px;padding:6px 10px;cursor:pointer;">+</button>
          </div>
        </div>

        <div class="carrito-producto-precio">
          <small>Precio</small>
          <p>$${pFinal}</p>
        </div>

        <div class="carrito-producto-subtotal">
          <small>Subtotal</small>
          <p>$${subtotal}</p>
        </div>

        <button class="carrito-producto-eliminar" data-key="${key}">
          <i class="bi bi-trash-fill"></i>
        </button>
      `;

      contenedorCarritoProductos.append(div);
    });

    actualizarBotones();
    actualizarTotal();
    actualizarNumeritoCarrito();
  } else {
    contenedorCarritoVacio.classList.remove("disabled");
    contenedorCarritoProductos.classList.add("disabled");
    contenedorCarritoAcciones.classList.add("disabled");
    contenedorCarritoComprado.classList.add("disabled");
    actualizarNumeritoCarrito();
    total.innerText = "$0";
  }
}

cargarProductosCarrito();

function actualizarBotones() {
  botonesEliminar = document.querySelectorAll(".carrito-producto-eliminar");
  botonesSumar = document.querySelectorAll(".carrito-producto-sumar");
  botonesRestar = document.querySelectorAll(".carrito-producto-restar");

  botonesEliminar.forEach(boton => boton.addEventListener("click", eliminarDelCarrito));
  botonesSumar.forEach(boton => boton.addEventListener("click", sumarCantidad));
  botonesRestar.forEach(boton => boton.addEventListener("click", restarCantidad));
}

function eliminarDelCarrito(e) {
  Toastify({
    text: "Producto eliminado",
    duration: 2500,
    close: true,
    gravity: "top",
    position: "right",
    style: {
      background: "linear-gradient(to right, #111111, #6b6b6b)",
      borderRadius: "2rem",
      textTransform: "uppercase",
      fontSize: ".75rem"
    },
    offset: { x: "1.5rem", y: "1.5rem" }
  }).showToast();

  const key = e.currentTarget.dataset.key;
  productosEnCarrito = productosEnCarrito.filter(p => (p._key || makeKey(p.id, p.talle)) !== key);

  persistirCarrito();
  cargarProductosCarrito();
}

function sumarCantidad(e) {
  const key = e.currentTarget.dataset.key;
  const idx = productosEnCarrito.findIndex(p => (p._key || makeKey(p.id, p.talle)) === key);
  if (idx === -1) return;

  productosEnCarrito[idx].cantidad = Number(productosEnCarrito[idx].cantidad || 0) + 1;

  persistirCarrito();
  cargarProductosCarrito();
}

function restarCantidad(e) {
  const key = e.currentTarget.dataset.key;
  const idx = productosEnCarrito.findIndex(p => (p._key || makeKey(p.id, p.talle)) === key);
  if (idx === -1) return;

  const nueva = Number(productosEnCarrito[idx].cantidad || 0) - 1;

  if (nueva <= 0) {
    // ✅ si llega a 0, se elimina esa línea (ese talle)
    productosEnCarrito.splice(idx, 1);
  } else {
    productosEnCarrito[idx].cantidad = nueva;
  }

  persistirCarrito();
  cargarProductosCarrito();
}

botonVaciar.addEventListener("click", vaciarCarrito);

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
      persistirCarrito();
      cargarProductosCarrito();
    }
  });
}

function actualizarTotal() {
  const totalCalculado = productosEnCarrito.reduce(
    (acc, producto) => acc + (precioFinal(producto) * Number(producto.cantidad || 0)),
    0
  );
  total.innerText = `$${totalCalculado}`;
}

botonComprar.addEventListener("click", comprarCarrito);

function comprarCarrito() {
  productosEnCarrito = [];
  persistirCarrito();

  contenedorCarritoVacio.classList.add("disabled");
  contenedorCarritoProductos.classList.add("disabled");
  contenedorCarritoAcciones.classList.add("disabled");
  contenedorCarritoComprado.classList.remove("disabled");

  actualizarNumeritoCarrito();
  total.innerText = "$0";
}

function actualizarNumeritoCarrito() {
  const nuevoNumerito = productosEnCarrito.reduce((acc, producto) => acc + Number(producto.cantidad || 0), 0);
  if (numerito) numerito.innerText = nuevoNumerito;
}
