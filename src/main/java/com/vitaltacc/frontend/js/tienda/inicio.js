// =========================================================
// INICIO: categorías, ofertas y productos destacados
// =========================================================

// Ícono según el nombre de la categoría (si no coincide, va la espiga)
const ICONOS_CATEGORIA = [
    [/pan|budin|bizcoch|tostad|grisin/, '<path d="M5 11a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1.5a1.5 1.5 0 0 1-1.5 1.5H18v4a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-4h-.5A1.5 1.5 0 0 1 4 12.5z"/><path d="M10 10v3M14 10v3"/>'],
    [/pasta|fideo|noqui|raviol/, '<path d="M4 11h16a8 8 0 0 1-16 0z"/><path d="M8 11c0-3 1-5 2-7M12 11c0-3 .5-5 1-7M16 11c0-2.5-.5-4.5-1.5-6"/>'],
    [/dulce|alfajor|galleti|brownie|torta|postre/, '<path d="M5 12h14l-1.5 8h-11z"/><path d="M6 12a6 6 0 0 1 12 0"/><path d="M12 6V3.5"/>'],
    [/harina|premezcla/, '<path d="M7 4h10l-1 3 2 2.5V20H6V9.5L8 7z"/><path d="M9 14h6"/>'],
    [/congel|frio|helad/, '<path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9"/><path d="m9.5 4.5 2.5 2 2.5-2M9.5 19.5l2.5-2 2.5 2"/>'],
    [/snack|cereal|barrita|semilla/, '<path d="M7 3h10v4l-1.5 2 1.5 2v10H7V11l1.5-2L7 7z"/><path d="M10 15h4"/>'],
    [/bebida|jugo|infusion|yerba|cafe|te\b/, '<path d="M6 8h12l-1.5 12h-9z"/><path d="M9 8V4h6v4"/>']
];

const TONOS_CATEGORIA = ["turquesa", "trigo", "rosa", "menta", "petroleo", "miel"];

function iconoCategoria(nombre) {
    const texto = normalizarTexto(nombre);
    const encontrado = ICONOS_CATEGORIA.find(([patron]) => patron.test(texto));
    const trazo = encontrado ? encontrado[1] : ICONOS.trigo;
    return `<svg class="icono" viewBox="0 0 24 24" aria-hidden="true">${trazo}</svg>`;
}

function tieneDescuento(p) {
    return p.precioFinal != null && Number(p.precioFinal) < Number(p.precio);
}

function renderCategoriasInicio(productos) {
    const seccion = document.getElementById("seccionCategorias");
    const contenedor = document.getElementById("categoriasInicio");
    if (!seccion || !contenedor) return;

    const conteo = new Map();
    productos.forEach(p => {
        if (p.categoria) conteo.set(p.categoria, (conteo.get(p.categoria) || 0) + 1);
    });

    // Las que más productos tienen primero (hasta 6)
    const categorias = [...conteo.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"))
        .slice(0, 6);

    if (categorias.length < 2) return;

    contenedor.innerHTML = categorias.map(([nombre, cantidad], i) => `
        <a class="tile-categoria tono-${TONOS_CATEGORIA[i % TONOS_CATEGORIA.length]} revelar"
            style="--retraso: ${i * 60}ms"
            href="productos.html?categoria=${encodeURIComponent(nombre)}">
            <span class="tile-icono">${iconoCategoria(nombre)}</span>
            <span class="tile-texto">
                <strong>${escaparHTML(nombre)}</strong>
                <small>${cantidad === 1 ? "1 producto" : `${cantidad} productos`}</small>
            </span>
            <svg class="icono tile-flecha" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </a>
    `).join("");

    seccion.hidden = false;
}

function renderOfertas(productos) {
    const seccion = document.getElementById("seccionOfertas");
    const contenedor = document.getElementById("ofertas");
    if (!seccion || !contenedor) return [];

    const ofertas = productos
        .filter(tieneDescuento)
        .sort((a, b) => (1 - b.precioFinal / b.precio) - (1 - a.precioFinal / a.precio))
        .slice(0, 4);

    if (!ofertas.length) return [];

    contenedor.innerHTML = "";
    ofertas.forEach(p => contenedor.appendChild(crearTarjetaProducto(p)));
    seccion.hidden = false;
    return ofertas;
}

document.addEventListener("DOMContentLoaded", async () => {
    const contenedor = document.getElementById("destacados");
    if (!contenedor) return;

    contenedor.innerHTML = tarjetasEsqueleto(4);

    try {
        const productos = (await obtenerProductos()).filter(p => Number(p.stock) > 0);

        renderCategoriasInicio(productos);
        const ofertas = renderOfertas(productos);

        // Destacados: los que no están en ofertas (si faltan, se completa igual)
        const enOferta = new Set(ofertas.map(p => p.id));
        const destacados = [
            ...productos.filter(p => !enOferta.has(p.id)),
            ...productos.filter(p => enOferta.has(p.id))
        ].slice(0, 4);

        contenedor.innerHTML = "";

        if (!destacados.length) {
            contenedor.innerHTML = `
                <div class="estado-vacio">
                    <h3>Estamos reponiendo</h3>
                    <p>Pronto vas a ver los productos disponibles acá.</p>
                </div>`;
            return;
        }

        destacados.forEach(p => contenedor.appendChild(crearTarjetaProducto(p)));

    } catch {
        contenedor.innerHTML = `
            <div class="estado-vacio">
                <h3>No pudimos cargar los productos</h3>
                <p>Revisá tu conexión y volvé a intentar en unos minutos.</p>
            </div>`;
    }
});
