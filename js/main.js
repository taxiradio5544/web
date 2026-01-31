//let productos = [];
//let productosFiltrados = [];
//let categoriaActual = "todos";

let productos = [];
let productosBase = [];

// ✅ helper fuera del loop (antes estaba adentro)
function parseStockTalles(str) {
  // "S:2,M:0,L:5" => { S:2, M:0, L:5 }
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

//script nuevo
fetch("/.netlify/functions/get-products")
  .then(r => r.json())
  .then(data => {
    const arr = data.products || [];

    productos = arr.filter(p => {
      const activo = String((p.activo ?? "si")).trim().toLowerCase();

      // ✅ stock vacío o null => lo tomamos como "hay stock" para no borrar productos viejos
      const stock = (p.stock === "" || p.stock == null) ? 999 : Number(p.stock);

      return activo === "si" && Number.isFinite(stock) && stock > 0;
    });

    productosBase = productos.slice();
    render();
  })
  .catch(err => console.error("Error cargando productos:", err));


const aside = document.querySelector("aside");
const contenedorProductos = document.querySelector("#contenedor-productos");
const botonesCategorias = document.querySelectorAll(".boton-categoria");
const tituloPrincipal = document.querySelector("#titulo-principal");
//const buscador = document.querySelector("#buscador");
//const ordenar = document.querySelector("#ordenar");
let botonesAgregar = document.querySelectorAll(".producto-agregar");
const numerito = document.querySelector("#numerito");
const buscador = document.querySelector("#buscador");
const ordenar = document.querySelector("#ordenar");
console.log("buscador:", buscador);
console.log("ordenar:", ordenar);

function render() {
  const texto = (buscador?.value || "").trim().toLowerCase();
  const modo = (ordenar?.value || "relevancia").trim().toLowerCase();

  let lista = productosBase.slice();

  // Buscar
  if (texto) {
    lista = lista.filter(p => String(p.titulo || "").toLowerCase().includes(texto));
  }

  // Ordenar (usa precio oferta si existe)
  const precioFinal = (p) => {
    const po = Number(p.precio_oferta);
    if (Number.isFinite(po) && po > 0) return po;
    return Number(p.precio || 0);
  };

  if (modo === "menor") {
    lista.sort((a, b) => precioFinal(a) - precioFinal(b));
  } else if (modo === "mayor") {
    lista.sort((a, b) => precioFinal(b) - precioFinal(a));
  } else if (modo === "az") {
    lista.sort((a, b) => String(a.titulo || "").localeCompare(String(b.titulo || ""), "es", { numeric: true, sensitivity: "base" }));
  } else if (modo === "za") {
    lista.sort((a, b) => String(b.titulo || "").localeCompare(String(a.titulo || ""), "es", { numeric: true, sensitivity: "base" }));
  }

  cargarProductos(lista);
}

// Eventos toolbar
buscador?.addEventListener("input", render);
ordenar?.addEventListener("change", render);

botonesCategorias.forEach(boton => boton.addEventListener("click", () => {
  aside?.classList.remove("aside-visible");
}));

function cargarProductos(productosElegidos) {
  contenedorProductos.innerHTML = "";

  productosElegidos.forEach(producto => {
    const tallesArr = String(producto.talles || "")
      .split(",")
      .map(t => t.trim())
      .filter(Boolean);

    const stockMap = parseStockTalles(producto.stock_talles);

    // si hay stock_talles, usamos eso; si no, usamos stock general
    const usarStockPorTalle = Object.keys(stockMap).length > 0;

    const opciones = tallesArr.map(t => {
      const st = usarStockPorTalle ? (stockMap[t] ?? 0) : Number(producto.stock ?? 0);
      const disabled = st <= 0 ? "disabled" : "";
      const label = usarStockPorTalle ? `${t} (stock: ${st})` : t;
      return `<option value="${t}" ${disabled}>${label}</option>`;
    }).join("");

    const tallesHtml = tallesArr.length
      ? `<select class="producto-talles" data-producto="${producto.id}">
          <option value="">Talle...</option>
          ${opciones}
        </select>`
      : `<div class="muted" style="opacity:.75;font-size:12px">Sin talles</div>`;

    const tieneOferta =
      producto.precio_oferta !== "" &&
      producto.precio_oferta != null &&
      Number(producto.precio_oferta) > 0;

    const precioHtml = tieneOferta
      ? `<p class="producto-precio"><s>$${producto.precio}</s> <strong>$${producto.precio_oferta}</strong></p>`
      : `<p class="producto-precio">$${producto.precio}</p>`;

    const stockHtml = `<small style="opacity:.75">Stock: ${Number(producto.stock ?? 0)}</small>`;

    const div = document.createElement("div");
    div.classList.add("producto");

    div.innerHTML = `
      <img class="producto-imagen" src="${producto.imagen}" alt="${producto.titulo}">
      <div class="producto-detalles">
        <h3 class="producto-titulo">${producto.titulo}</h3>
        ${precioHtml}
        ${stockHtml}
        ${tallesHtml}
        <button class="producto-agregar" id="${producto.id}">Agregar</button>
      </div>
    `;

    contenedorProductos.append(div);
  });

  actualizarBotonesAgregar();
  activarZoomImagenes();
}

botonesCategorias.forEach(boton => {
  boton.addEventListener("click", (e) => {
    botonesCategorias.forEach(b => b.classList.remove("active"));
    e.currentTarget.classList.add("active");

    const catId = e.currentTarget.id;

    if (catId !== "todos") {
      const productoCategoria = productos.find(p => p.categoria.id === catId);
      tituloPrincipal.innerText = productoCategoria?.categoria?.nombre ?? "Productos";
      productosBase = productos.filter(p => p.categoria.id === catId);
    } else {
      tituloPrincipal.innerText = "Todos los productos";
      productosBase = productos.slice();
    }

    render();
  });
});

function actualizarBotonesAgregar() {
  botonesAgregar = document.querySelectorAll(".producto-agregar");
  botonesAgregar.forEach(boton => {
    boton.addEventListener("click", agregarAlCarrito);
  });
}

let productosEnCarrito;
let productosEnCarritoLS = localStorage.getItem("productos-en-carrito");

if (productosEnCarritoLS) {
  productosEnCarrito = JSON.parse(productosEnCarritoLS);
  actualizarNumerito();
} else {
  productosEnCarrito = [];
}

// ✅ helper: clave única por (ID=código de barras + talle)
function makeKey(id, talle) {
  return `${id}__${(talle || "").trim() || "SIN_TALLE"}`;
}

function agregarAlCarrito(e) {
  const idBoton = e.currentTarget.id; // ✅ este es tu código de barras

  // Buscar el select de talles del mismo producto
  const card = e.currentTarget.closest(".producto");
  const selectTalle = card?.querySelector(".producto-talles");
  const talleElegido = (selectTalle?.value || "").trim();

  // si tiene selector de talles, obligar selección
  if (selectTalle && !talleElegido) {
    Toastify({
      text: "Elegí un talle primero",
      duration: 2500,
      close: true,
      gravity: "top",
      position: "right"
    }).showToast();
    return;
  }

  Toastify({
    text: "Producto agregado",
    duration: 3000,
    close: true,
    gravity: "top",
    position: "right",
    stopOnFocus: true,
    style: {
      background: "linear-gradient(to right, #4b33a8, #785ce9)",
      borderRadius: "2rem",
      textTransform: "uppercase",
      fontSize: ".75rem"
    },
    offset: { x: "1.5rem", y: "1.5rem" },
    onClick: function(){}
  }).showToast();

  const productoBase = productos.find(p => String(p.id) === String(idBoton));
  if (!productoBase) return;

  const key = makeKey(idBoton, talleElegido);

  // ✅ NO mutar productoBase: crear copia
  const item = {
    ...productoBase,
    talle: talleElegido || "",
    _key: key
  };

  const idx = productosEnCarrito.findIndex(p => (p._key || makeKey(p.id, p.talle)) === key);

  if (idx !== -1) {
    productosEnCarrito[idx].cantidad = Number(productosEnCarrito[idx].cantidad || 0) + 1;
  } else {
    item.cantidad = 1;
    productosEnCarrito.push(item);
  }

  actualizarNumerito();
  localStorage.setItem("productos-en-carrito", JSON.stringify(productosEnCarrito));
}

function actualizarNumerito() {
  let nuevoNumerito = productosEnCarrito.reduce((acc, producto) => acc + Number(producto.cantidad || 0), 0);
  numerito.innerText = nuevoNumerito;

  const numeritoFloat = document.querySelector("#numerito-float");
  if (numeritoFloat) numeritoFloat.innerText = nuevoNumerito;
}

// =======================
// Zoom de imágenes
// =======================
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");

function activarZoomImagenes() {
  document.querySelectorAll(".producto-imagen").forEach(img => {
    img.addEventListener("click", () => {
      lightboxImg.src = img.src;
      lightbox.style.display = "flex";
    });
  });
}

// cerrar
lightbox.addEventListener("click", () => {
  lightbox.style.display = "none";
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape") lightbox.style.display = "none";
});
