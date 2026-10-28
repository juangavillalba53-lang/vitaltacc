// Se muestran de a 12 productos; "Ver más" suma los 12 siguientes
const PRODUCTOS_POR_TANDA = 12;

let productosCatalogo = [];
let categoriaElegida = "";
let tipoElegido = "";
let filtradosCatalogo = [];
let mostradosCatalogo = 0;

function actualizarDireccion() {
    const parametros = new URLSearchParams();
    if (tipoElegido) parametros.set("tipo", tipoElegido);
    if (categoriaElegida) parametros.set("categoria", categoriaElegida);
    const consulta = parametros.toString();
    history.replaceState(null, "", "productos.html" + (consulta ? `?${consulta}` : ""));
}

function renderFiltroActual() {
    const tipoDeLaCategoria = categoriaElegida
        ? productosCatalogo.find(p => p.categoria === categoriaElegida)?.tipoCategoria
        : "";

    document.querySelector(".cabecera-pagina h1").textContent = categoriaElegida || tipoElegido || "Productos";
    document.querySelector(".cabecera-pagina .cinta").textContent = tipoDeLaCategoria || "Catálogo";

    const contenedor = document.getElementById("filtroActual");
    contenedor.hidden = !categoriaElegida && !tipoElegido;
    contenedor.innerHTML = contenedor.hidden ? ""
        : `<button type="button" class="chip chip-todo-catalogo">Ver todos los productos</button>`;

    contenedor.querySelector("button")?.addEventListener("click", () => {
        tipoElegido = "";
        categoriaElegida = "";
        actualizarDireccion();
        renderFiltroActual();
        renderCatalogo();
    });
}

function renderCatalogo() {
    const contenedor = document.getElementById("catalogo");
    const resultado = document.getElementById("resultado");
    const texto = normalizarTexto(document.getElementById("buscador").value.trim());

    const filtrados = productosCatalogo.filter(p =>
        (!tipoElegido || p.tipoCategoria === tipoElegido) &&
        (!categoriaElegida || p.categoria === categoriaElegida) &&
        (!texto || normalizarTexto(p.nombre).includes(texto) || normalizarTexto(p.descripcion).includes(texto))
    );

    resultado.textContent = filtrados.length === 1
        ? "1 producto"
        : `${filtrados.length} productos`;

    contenedor.innerHTML = "";
    filtradosCatalogo = filtrados;
    mostradosCatalogo = 0;

    if (!filtrados.length) {
        actualizarVerMas();
        contenedor.innerHTML = `
            <div class="estado-vacio">
                <h3>No encontramos productos con esa búsqueda</h3>
                <p>Probá con otra palabra o elegí otra categoría en el menú.</p>
                <button type="button" class="boton boton-secundario" id="limpiarFiltros">Ver todos los productos</button>
            </div>`;

        document.getElementById("limpiarFiltros").addEventListener("click", () => {
            document.getElementById("buscador").value = "";
            categoriaElegida = "";
            tipoElegido = "";
            actualizarDireccion();
            renderFiltroActual();
            renderCatalogo();
        });
        return;
    }

    mostrarSiguienteTanda();
}

// Agrega solo las tarjetas nuevas: las que ya estaban no se vuelven a dibujar
function mostrarSiguienteTanda() {
    const contenedor = document.getElementById("catalogo");
    const tanda = filtradosCatalogo.slice(mostradosCatalogo, mostradosCatalogo + PRODUCTOS_POR_TANDA);

    tanda.forEach(p => contenedor.appendChild(crearTarjetaProducto(p)));
    mostradosCatalogo += tanda.length;

    actualizarVerMas();
}

function actualizarVerMas() {
    const bloque = document.getElementById("verMas");
    if (!bloque) return;

    const total = filtradosCatalogo.length;
    const quedan = total - mostradosCatalogo;

    bloque.hidden = quedan <= 0;
    document.getElementById("verMasTexto").textContent =
        `Estás viendo ${mostradosCatalogo} de ${total} productos`;
}

document.addEventListener("DOMContentLoaded", async () => {
    const contenedor = document.getElementById("catalogo");
    const buscador = document.getElementById("buscador");

    contenedor.innerHTML = tarjetasEsqueleto(8);

    // Permite llegar filtrado desde otro lado: productos.html?buscar=pan
    const parametros = new URLSearchParams(location.search);
    if (parametros.get("buscar")) buscador.value = parametros.get("buscar");
    // ...o con una categoría elegida desde el inicio: productos.html?categoria=Pastas
    const categoriaPedida = parametros.get("categoria") || "";
    const tipoPedido = parametros.get("tipo") || "";

    document.getElementById("botonVerMas").addEventListener("click", () => {
        const primeraNueva = mostradosCatalogo;
        mostrarSiguienteTanda();

        // Lleva el foco a la primera tarjeta nueva (útil con teclado)
        const nueva = document.querySelectorAll("#catalogo .tarjeta-producto")[primeraNueva];
        nueva?.querySelector("button, a")?.focus({ preventScroll: true });
    });

    let espera;
    buscador.addEventListener("input", () => {
        clearTimeout(espera);
        espera = setTimeout(renderCatalogo, 120);
    });

    try {
        productosCatalogo = (await obtenerProductos())
            .filter(p => Number(p.stock) > 0)
            .sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), "es"));

        if (productosCatalogo.some(p => p.tipoCategoria === tipoPedido)) {
            tipoElegido = tipoPedido;
        }

        if (productosCatalogo.some(p => p.categoria === categoriaPedida
            && (!tipoElegido || p.tipoCategoria === tipoElegido))) {
            categoriaElegida = categoriaPedida;
        }

        renderFiltroActual();
        renderCatalogo();

    } catch {
        contenedor.innerHTML = `
            <div class="estado-vacio">
                <h3>No pudimos cargar el catálogo</h3>
                <p>Revisá tu conexión y recargá la página.</p>
            </div>`;
    }
});
