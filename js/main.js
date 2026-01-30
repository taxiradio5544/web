//let productos = [];
//let productosFiltrados = [];
//let categoriaActual = "todos";


let productos = [];
let productosBase = [];

//script nuevo
fetch("/.netlify/functions/get-products")
  .then(r => r.json())
  .then(data => {
    productos = data.products.filter(p => 
      String(p.activo || "si").toLowerCase() === "si"
    );
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

//let productos = [];
//let productosBase = []; // lo que corresponde a la categoría actual

function render() {
  const texto = (buscador?.value || "").trim().toLowerCase();
  const modo = (ordenar?.value || "relevancia").trim().toLowerCase();

  let lista = productosBase.slice();

  // Buscar
  if (texto) {
    lista = lista.filter(p => p.titulo.toLowerCase().includes(texto));
  }

  // Ordenar
  if (modo === "menor") {
    lista.sort((a, b) => a.precio - b.precio);
  } else if (modo === "mayor") {
    lista.sort((a, b) => b.precio - a.precio);
  } else if (modo === "az") {
    lista.sort((a, b) => a.titulo.localeCompare(b.titulo, "es", { numeric: true, sensitivity: "base" }));
  } else if (modo === "za") {
    lista.sort((a, b) => b.titulo.localeCompare(a.titulo, "es", { numeric: true, sensitivity: "base" }));
  }

  cargarProductos(lista);
}

// Eventos toolbar
buscador?.addEventListener("input", render);
ordenar?.addEventListener("change", render);

//const buscador = document.querySelector("#buscador");
//const ordenar = document.querySelector("#ordenar");

//let productosFiltrados = [];
//let categoriaActual = "todos";

/*function aplicarFiltrosYOrden() {
  const texto = (buscador?.value || "").trim().toLowerCase();

  // base: lo que esté filtrado por categoría
  let lista = (productosFiltrados.length ? productosFiltrados : productos).slice();

  // buscar
  if (texto) {
    lista = lista.filter(p => p.titulo.toLowerCase().includes(texto));
  }

  // ordenar
  const modo = ordenar?.value || "relevancia";

  if (modo === "menor") lista.sort((a, b) => a.precio - b.precio);
  if (modo === "mayor") lista.sort((a, b) => b.precio - a.precio);
  if (modo === "az") lista.sort((a, b) => a.titulo.localeCompare(b.titulo));
  if (modo === "za") lista.sort((a, b) => b.titulo.localeCompare(a.titulo));

  cargarProductos(lista);
}*/

// enganchar eventos
//ordenar?.addEventListener("change", aplicarFiltrosYOrden);
//buscador?.addEventListener("input", aplicarFiltrosYOrden);

botonesCategorias.forEach(boton => boton.addEventListener("click", () => {
    aside?.classList.remove("aside-visible");
}));



function cargarProductos(productosElegidos) {

    contenedorProductos.innerHTML = "";

    productosElegidos.forEach(producto => {

        const div = document.createElement("div");
        div.classList.add("producto");
        div.innerHTML = `
            <img class="producto-imagen" src="${producto.imagen}" alt="${producto.titulo}">
            <div class="producto-detalles">
                <h3 class="producto-titulo">${producto.titulo}</h3>
                <p class="producto-precio">$${producto.precio}</p>
                <button class="producto-agregar" id="${producto.id}">Agregar</button>
            </div>
        `;

        contenedorProductos.append(div);
    })

    actualizarBotonesAgregar();
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

function agregarAlCarrito(e) {

    Toastify({
        text: "Producto agregado",
        duration: 3000,
        close: true,
        gravity: "top", // `top` or `bottom`
        position: "right", // `left`, `center` or `right`
        stopOnFocus: true, // Prevents dismissing of toast on hover
        style: {
          background: "linear-gradient(to right, #4b33a8, #785ce9)",
          borderRadius: "2rem",
          textTransform: "uppercase",
          fontSize: ".75rem"
        },
        offset: {
            x: '1.5rem', // horizontal axis - can be a number or a string indicating unity. eg: '2em'
            y: '1.5rem' // vertical axis - can be a number or a string indicating unity. eg: '2em'
          },
        onClick: function(){} // Callback after click
      }).showToast();

    const idBoton = e.currentTarget.id;
    const productoAgregado = productos.find(producto => producto.id === idBoton);

    if(productosEnCarrito.some(producto => producto.id === idBoton)) {
        const index = productosEnCarrito.findIndex(producto => producto.id === idBoton);
        productosEnCarrito[index].cantidad++;
    } else {
        productoAgregado.cantidad = 1;
        productosEnCarrito.push(productoAgregado);
    }

    actualizarNumerito();

    localStorage.setItem("productos-en-carrito", JSON.stringify(productosEnCarrito));
}

function actualizarNumerito() {
    let nuevoNumerito = productosEnCarrito.reduce((acc, producto) => acc + producto.cantidad, 0);
    numerito.innerText = nuevoNumerito;

    const numeritoFloat = document.querySelector("#numerito-float");
    if (numeritoFloat) numeritoFloat.innerText = nuevoNumerito;
}


