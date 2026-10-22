// Se muestran de a 12 productos; "Ver más" suma los 12 siguientes
const PRODUCTOS_POR_TANDA = 12;

let productosCatalogo = [];
let categoriaElegida = "";
let filtradosCatalogo = [];
let mostradosCatalogo = 0;

function renderCategorias() {
    const contenedor = document.getElementById("categorias");

    const categorias = [...new Set(
        productosCatalogo.map(p => p.categoria).filter(Boolean)
    )].sort((a, b) => a.localeCompare(b, "es"));

    if (!categorias.length) {
        contenedor.hidden = true;
        return;
    }

    contenedor.innerHTML = ["", ...categorias].map(cat => `
        <button type="button" class="chip" data-categoria="${escaparHTML(cat)}"
            aria-pressed="${cat === categoriaElegida}">
            ${cat ? escaparHTML(cat) : "Todos"}
        </button>
    `).join("");

    contenedor.querySelectorAll(".chip").forEach(chip => {
        chip.addEventListener("click", () => {
            categoriaElegida = chip.dataset.categoria;
            contenedor.querySelectorAll(".chip").forEach(c =>
                c.setAttribute("aria-pressed", String(c === chip)));
            renderCatalogo();
        });
    });
}

function renderCatalogo() {
    const contenedor = document.getElementById("catalogo");
    const resultado = document.getElementById("resultado");
    const texto = normalizarTexto(document.getElementById("buscador").value.trim());

    const filtrados = productosCatalogo.filter(p =>
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
                <p>Probá con otra palabra o elegí otra categoría.</p>
                <button type="button" class="boton boton-secundario" id="limpiarFiltros">Ver todos los productos</button>
            </div>`;

        document.getElementById("limpiarFiltros").addEventListener("click", () => {
            document.getElementById("buscador").value = "";
            categoriaElegida = "";
            renderCategorias();
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

        if (productosCatalogo.some(p => p.categoria === categoriaPedida)) {
            categoriaElegida = categoriaPedida;
        }

        renderCategorias();
        renderCatalogo();

    } catch {
        contenedor.innerHTML = `
            <div class="estado-vacio">
                <h3>No pudimos cargar el catálogo</h3>
                <p>Revisá tu conexión y recargá la página.</p>
            </div>`;
    }
});
