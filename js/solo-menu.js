document.addEventListener("DOMContentLoaded", () => {
  const openMenu = document.querySelector("#open-menu");
  const closeMenu = document.querySelector("#close-menu");
  const aside = document.querySelector("aside");

  function abrirMenu() {
    aside?.classList.add("aside-visible");
    document.body.classList.add("menu-abierto");
  }

  function cerrarMenu() {
    aside?.classList.remove("aside-visible");
    document.body.classList.remove("menu-abierto");
  }

  // Abrir
  openMenu?.addEventListener("click", (e) => {
    e.stopPropagation();
    abrirMenu();
  });

  // Cerrar con la X
  closeMenu?.addEventListener("click", (e) => {
    e.stopPropagation();
    cerrarMenu();
  });

  // Evitar que un click dentro del menú cierre
  aside?.addEventListener("click", (e) => {
    e.stopPropagation();
  });
  
  aside?.querySelectorAll(".boton-menu").forEach(boton => {
    boton.addEventListener("click", () => {
      aside.classList.remove("aside-visible");
      document.body.classList.remove("menu-abierto");
    });
  });

  // Cerrar tocando afuera (overlay)
  document.addEventListener("click", () => {
    if (document.body.classList.contains("menu-abierto")) {
      cerrarMenu();
    }
  });

  // Cerrar con ESC (pc)
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") cerrarMenu();
  });
});
