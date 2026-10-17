// =========================================================
// MIS COMPRAS: todo lo comprado en el local y online
// =========================================================

const NOMBRES_PAGO = {
    EFECTIVO: "Efectivo",
    TRANSFERENCIA: "Transferencia",
    TARJETA_DEBITO: "Tarjeta de débito",
    TARJETA_CREDITO: "Tarjeta de crédito",
    MERCADO_PAGO: "Mercado Pago",
    MODO: "MODO"
};

function formatearFecha(fecha) {
    if (!fecha) return "";
    const [anio, mes, dia] = String(fecha).substring(0, 10).split("-").map(Number);
    return new Date(anio, mes - 1, dia).toLocaleDateString("es-AR", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

async function descargarComprobante(id, boton) {
    boton.disabled = true;
    boton.textContent = "Descargando…";

    try {
        const respuesta = await fetch(`${API}/ventas/${id}/pdf`);
        if (!respuesta.ok) throw new Error();

        const url = URL.createObjectURL(await respuesta.blob());
        const enlace = document.createElement("a");
        enlace.href = url;
        enlace.download = `comprobante-vitaltacc-${id}.pdf`;
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);

    } catch {
        mostrarAviso("No pudimos descargar el comprobante. Probá de nuevo.", "error");
    } finally {
        boton.disabled = false;
        boton.textContent = "Descargar comprobante";
    }
}

// 10 compras por página
const COMPRAS_POR_PAGINA = 10;
let comprasCliente = [];
let paginaCompras = 1;

function tarjetaCompra(c) {
    const local = c.tipoVenta === "LOCAL";
    return `
        <article class="compra revelar">
            <header class="compra-encabezado">
                <h2>Compra N.º ${escaparHTML(c.id)}</h2>
                <span class="compra-canal ${local ? "local" : "online"}">${local ? "En el local" : "Online"}</span>
                <time datetime="${escaparHTML(c.fecha)}">${formatearFecha(c.fecha)}</time>
                <span class="compra-total">${pesos(c.total)}</span>
            </header>
            <ul class="compra-items">
                ${(c.items || []).map(i => `
                    <li>
                        <span>${escaparHTML(i.cantidad)} × ${escaparHTML(i.producto)}</span>
                        <span>${pesos(Number(i.precioUnitario) * Number(i.cantidad))}</span>
                    </li>
                `).join("")}
            </ul>
            <footer class="compra-pie">
                <span>Pago: ${escaparHTML(NOMBRES_PAGO[c.metodoPago] || c.metodoPago || "-")}</span>
                <button type="button" class="boton boton-secundario" data-comprobante="${escaparHTML(c.id)}">Descargar comprobante</button>
            </footer>
        </article>`;
}

function renderPaginaCompras(desplazar) {
    const lista = document.getElementById("listaCompras");
    const paginacion = document.getElementById("paginacionCompras");
    if (!lista) return;

    const totalPaginas = Math.max(1, Math.ceil(comprasCliente.length / COMPRAS_POR_PAGINA));
    paginaCompras = Math.min(Math.max(1, paginaCompras), totalPaginas);

    const inicio = (paginaCompras - 1) * COMPRAS_POR_PAGINA;
    lista.innerHTML = comprasCliente
        .slice(inicio, inicio + COMPRAS_POR_PAGINA)
        .map(tarjetaCompra)
        .join("");

    lista.querySelectorAll("[data-comprobante]").forEach(boton =>
        boton.addEventListener("click", () => descargarComprobante(boton.dataset.comprobante, boton)));

    if (totalPaginas <= 1) {
        paginacion.hidden = true;
        paginacion.innerHTML = "";
    } else {
        paginacion.hidden = false;
        paginacion.innerHTML = `
            <button type="button" class="boton boton-secundario" data-pagina="anterior" ${paginaCompras <= 1 ? "disabled" : ""}>Anterior</button>
            <span>Página ${paginaCompras} de ${totalPaginas}</span>
            <button type="button" class="boton boton-secundario" data-pagina="siguiente" ${paginaCompras >= totalPaginas ? "disabled" : ""}>Siguiente</button>
        `;
        paginacion.querySelector('[data-pagina="anterior"]').addEventListener("click", () => {
            paginaCompras--;
            renderPaginaCompras(true);
        });
        paginacion.querySelector('[data-pagina="siguiente"]').addEventListener("click", () => {
            paginaCompras++;
            renderPaginaCompras(true);
        });
    }

    // Al cambiar de página, vuelve al principio de la lista
    if (desplazar) {
        const arriba = lista.getBoundingClientRect().top + window.scrollY - 110;
        window.scrollTo({ top: Math.max(0, arriba), behavior: "smooth" });
    }
}

function renderCompras(compras) {
    const destino = document.getElementById("misCompras");

    if (!compras.length) {
        destino.innerHTML = `
            <div class="estado-vacio">
                <h3>Todavía no tenés compras</h3>
                <p>Cuando compres online o en el local diciendo tu DNI, las vas a ver acá.</p>
                <a class="boton boton-primario" href="productos.html">Ver productos</a>
            </div>`;
        return;
    }

    const enLocal = compras.filter(c => c.tipoVenta === "LOCAL").length;
    const online = compras.length - enLocal;
    const totalGastado = compras.reduce((s, c) => s + (Number(c.total) || 0), 0);

    destino.innerHTML = `
        <div class="resumen-cuenta">
            <div><strong>${compras.length}</strong><span>${compras.length === 1 ? "compra" : "compras"} en total</span></div>
            <div><strong>${enLocal}</strong><span>en el local</span></div>
            <div><strong>${online}</strong><span>online</span></div>
            <div><strong>${pesos(totalGastado)}</strong><span>en productos sin TACC</span></div>
        </div>

        <div class="lista-compras" id="listaCompras"></div>
        <nav class="paginacion" id="paginacionCompras" aria-label="Páginas de compras" hidden></nav>
    `;

    comprasCliente = compras;
    paginaCompras = 1;
    renderPaginaCompras(false);
}

document.addEventListener("DOMContentLoaded", async () => {
    const destino = document.getElementById("misCompras");
    const usuario = obtenerUsuario();

    if (!usuario) {
        destino.innerHTML = `
            <div class="estado-vacio">
                <h3>Ingresá para ver tus compras</h3>
                <p>Si compraste en el local, creá tu cuenta con el mismo DNI y las vas a ver acá.</p>
                <div class="compra-lista-botones">
                    <a class="boton boton-primario" href="login.html?volver=mis-compras.html">Ingresar</a>
                    <a class="boton boton-secundario" href="login.html?volver=mis-compras.html#registro">Crear cuenta</a>
                </div>
            </div>`;
        return;
    }

    destino.innerHTML = `<div class="lista-compras"><div class="esqueleto-linea"></div><div class="esqueleto-linea"></div></div>`;

    try {
        const respuesta = await fetch(`${API}/ventas/cliente/${usuario.id}`);
        if (!respuesta.ok) throw new Error();
        renderCompras(await respuesta.json());
    } catch {
        destino.innerHTML = `
            <div class="estado-vacio">
                <h3>No pudimos cargar tus compras</h3>
                <p>Revisá tu conexión y recargá la página.</p>
            </div>`;
    }
});
