// =========================================================
// MIS COMPRAS: todo lo comprado en el local y online
// =========================================================

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

// Compras online: en qué estado está el pedido y los pasos que faltan
function estadoPedido(c) {
    if (!c.estado) return "";

    const cancelado = c.estado === "CANCELADO";
    const pasos = c.recorrido || [];
    const motivo = cancelado ? [...(c.historial || [])].reverse().find(h => h.estado === "CANCELADO")?.nota : null;
    const actual = pasos.findIndex(p => p.estado === c.estado);

    const entrega = c.formaEntrega === "ENVIO"
        ? `Envío a ${escaparHTML(c.envioDireccion || "")}${c.envioLocalidad ? `, ${escaparHTML(c.envioLocalidad)}` : ""}`
        : `Retiro en el local · ${escaparHTML(configuracionNegocio.direccion)}`;

    return `
        <div class="compra-estado ${cancelado ? "cancelado" : ""}">
            <p class="compra-estado-titulo">
                <span class="estado-pedido estado-${c.estado.toLowerCase()}">${escaparHTML(c.estadoNombre)}</span>
                <span>${escaparHTML(c.estadoMensaje)}${motivo ? ` Motivo: ${escaparHTML(motivo)}.` : ""}</span>
            </p>
            ${cancelado ? "" : `
            <ol class="pasos-pedido" aria-label="Pasos del pedido">
                ${pasos.map((p, i) => `
                    <li class="${i < actual ? "hecho" : i === actual ? "actual" : ""}" ${i === actual ? 'aria-current="step"' : ""}>
                        <span class="paso-punto">${i <= actual ? icono("check") : i + 1}</span>
                        <span>${escaparHTML(p.nombre)}</span>
                    </li>`).join("")}
            </ol>`}
            <p class="compra-entrega">${entrega}</p>
        </div>`;
}

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
            ${estadoPedido(c)}
            <ul class="compra-items">
                ${(c.items || []).map(i => `
                    <li>
                        <span>${escaparHTML(i.cantidad)} × ${escaparHTML(i.producto)}</span>
                        <span>${pesos(Number(i.precioUnitario) * Number(i.cantidad))}</span>
                    </li>
                `).join("")}
            </ul>
            ${Number(c.devuelto) > 0 ? `
            <p class="compra-devolucion">
                Devolución: se te reintegraron <strong>${pesos(c.devuelto)}</strong> por ${escaparHTML(nombrePago(c.metodoPago))}.
            </p>` : ""}
            <footer class="compra-pie">
                <span>Pago: ${escaparHTML(nombrePago(c.metodoPago))}</span>
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

    // Los pedidos cancelados no cuentan
    const validas = compras.filter(c => c.estado !== "CANCELADO");
    const enLocal = validas.filter(c => c.tipoVenta === "LOCAL").length;
    const online = validas.length - enLocal;

    destino.innerHTML = `
        <div class="resumen-cuenta">
            <div><strong>${validas.length}</strong><span>${validas.length === 1 ? "compra" : "compras"} en total</span></div>
            <div><strong>${enLocal}</strong><span>en el local</span></div>
            <div><strong>${online}</strong><span>online</span></div>
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
