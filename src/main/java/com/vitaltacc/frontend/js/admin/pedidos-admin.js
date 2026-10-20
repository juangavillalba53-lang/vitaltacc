// =========================================================
// PEDIDOS ONLINE
// Recibido → En preparación → Listo para retirar / Enviado → Entregado
// Se puede cancelar hasta que sale del local (las unidades vuelven al stock).
// En cada cambio al cliente le llega un mail.
// =========================================================

const PEDIDOS_POR_PAGINA = 10;

const FILTROS_PEDIDOS = [
    ["activos", "Por atender"],
    ["RECIBIDO", "Recibidos"],
    ["PREPARANDO", "En preparación"],
    ["LISTO_PARA_RETIRAR", "Listos para retirar"],
    ["ENVIADO", "Enviados"],
    ["ENTREGADO", "Entregados"],
    ["CANCELADO", "Cancelados"],
    ["todos", "Todos"]
];

// Texto del botón para pasar al estado siguiente
const ACCION_SIGUIENTE = {
    PREPARANDO: "Empezar a preparar",
    LISTO_PARA_RETIRAR: "Marcar listo para retirar",
    ENVIADO: "Marcar como enviado",
    ENTREGADO: "Marcar entregado"
};

let filtroPedidos = "activos";
let pedidosCargados = [];
let paginaPedidos = 1;

function mostrarContadorPedidos(cantidad) {
    const contador = document.getElementById("contadorPedidos");
    if (!contador) return;
    contador.hidden = !cantidad;
    contador.textContent = cantidad > 99 ? "99+" : String(cantidad || "");
}

function dibujarFiltrosPedidos(resumen) {
    const contenedor = document.getElementById("filtrosPedidos");
    const porEstado = resumen?.porEstado || {};

    contenedor.innerHTML = FILTROS_PEDIDOS.map(([valor, texto]) => {
        const cantidad = valor === "activos" ? resumen?.activos
            : valor === "todos" ? null
            : porEstado[valor];
        return `
            <button type="button" class="filtro-pedido ${valor === filtroPedidos ? "activo" : ""}"
                aria-pressed="${valor === filtroPedidos}" onclick="elegirFiltroPedidos('${valor}')">
                ${texto}${cantidad ? ` <span>${cantidad}</span>` : ""}
            </button>`;
    }).join("");
}

function elegirFiltroPedidos(valor) {
    filtroPedidos = valor;
    paginaPedidos = 1;
    cargarPedidos();
}

async function cargarPedidos() {

    const estado = document.getElementById("estadoPedidos");
    estado.textContent = "Cargando pedidos...";

    try {
        const [pedidos, resumen] = await Promise.all([
            pedir(`/pedidos?filtro=${encodeURIComponent(filtroPedidos)}`),
            pedir("/pedidos/resumen")
        ]);

        pedidosCargados = pedidos;
        dibujarFiltrosPedidos(resumen);
        mostrarContadorPedidos(resumen.activos);
        filtrarPedidos(false);

    } catch (error) {
        estado.textContent = "No se pudieron cargar los pedidos: " + error.message;
    }
}

function filtrarPedidos(volverAlInicio = true) {

    if (volverAlInicio) paginaPedidos = 1;

    const texto = normalizarTexto(document.getElementById("buscarPedidos").value.trim());
    const lista = texto
        ? pedidosCargados.filter(p => String(p.id) === texto || normalizarTexto(p.cliente).includes(texto))
        : pedidosCargados;

    const { items, pagina, totalPaginas } = paginar(lista, paginaPedidos, PEDIDOS_POR_PAGINA);
    paginaPedidos = pagina;

    const estado = document.getElementById("estadoPedidos");
    const contenedor = document.getElementById("listaPedidos");

    if (!lista.length) {
        estado.textContent = "";
        contenedor.innerHTML = `<p class="tabla-vacia">${filtroPedidos === "activos" && !texto
            ? "No hay pedidos por atender."
            : "No hay pedidos con ese filtro."}</p>`;
    } else {
        estado.textContent = lista.length === 1 ? "1 pedido" : `${lista.length} pedidos`;
        contenedor.innerHTML = items.map(tarjetaPedido).join("");
    }

    dibujarPaginacion(document.getElementById("paginacionPedidos"), pagina, totalPaginas, nueva => {
        paginaPedidos = nueva;
        filtrarPedidos(false);
    });
}

function horaCorta(fechaHora) {
    const [fecha, hora] = String(fechaHora || "").split("T");
    return `${fechaCorta(fecha)} ${String(hora || "").substring(0, 5)}`.trim();
}

function tarjetaPedido(p) {

    const envio = p.formaEntrega === "ENVIO";
    const contacto = [p.envioTelefono || p.clienteTelefono, p.clienteEmail].filter(Boolean);

    const entrega = envio
        ? `<strong>Envío a domicilio</strong>
           <span>${escaparHTML(p.envioDireccion)}${p.envioLocalidad ? `, ${escaparHTML(p.envioLocalidad)}` : ""}</span>
           ${p.envioIndicaciones ? `<span>${escaparHTML(p.envioIndicaciones)}</span>` : ""}`
        : `<strong>Retiro en el local</strong>`;

    return `
        <article class="pedido estado-${p.estado.toLowerCase()}">
            <header class="pedido-encabezado">
                <div>
                    <h3>Pedido N.º ${p.id}</h3>
                    <p>${fechaCorta(p.fecha)} · ${escaparHTML(p.cliente)}</p>
                </div>
                <span class="estado-pedido-admin estado-${p.estado.toLowerCase()}">${escaparHTML(p.estadoNombre)}</span>
            </header>

            <div class="pedido-cuerpo">
                <ul class="pedido-items">
                    ${p.items.map(i => `
                        <li>
                            <span><b>${i.cantidad} ×</b> ${escaparHTML(i.producto)}</span>
                            <span>${pesos(Number(i.precioUnitario) * Number(i.cantidad))}</span>
                        </li>`).join("")}
                    <li class="pedido-total">
                        <span>Total · ${escaparHTML(nombrePago(p.metodoPago))}</span>
                        <strong>${pesos(p.total)}</strong>
                    </li>
                </ul>

                <div class="pedido-entrega ${envio ? "envio" : "retiro"}">
                    ${entrega}
                    ${contacto.length ? `<span class="pedido-contacto">${contacto.map(escaparHTML).join(" · ")}</span>` : ""}
                </div>
            </div>

            <footer class="pedido-pie">
                <details class="pedido-historial">
                    <summary>Historial</summary>
                    <ol>
                        ${p.historial.map(h => `
                            <li>
                                <strong>${escaparHTML(h.nombre)}</strong>
                                <span>${horaCorta(h.fechaHora)}${h.quien ? ` · ${escaparHTML(h.quien)}` : ""}</span>
                                ${h.nota ? `<em>${escaparHTML(h.nota)}</em>` : ""}
                            </li>`).join("")}
                    </ol>
                </details>

                <div class="pedido-acciones">
                    ${p.sePuedeCancelar ? `
                        <button type="button" class="btn-tabla btn-eliminar" onclick="cancelarPedido(${p.id})">
                            Cancelar pedido
                        </button>` : ""}
                    ${p.siguienteEstado ? `
                        <button type="button" class="btn-avanzar" onclick="avanzarPedido(${p.id}, '${p.siguienteEstado}', this)">
                            ${ACCION_SIGUIENTE[p.siguienteEstado] || "Siguiente paso"}
                        </button>` : ""}
                </div>
            </footer>
        </article>`;
}

async function cambiarEstadoPedido(id, estado, nota) {
    const pedido = await pedir(`/pedidos/${id}/estado`, {
        method: "PUT",
        json: { estado, usuarioId: usuario.id, nota }
    });

    const aviso = pedido.clienteEmail ? " Le avisamos por mail al cliente." : "";
    return { pedido, aviso };
}

async function avanzarPedido(id, estado, boton) {

    boton.disabled = true;

    try {
        const { pedido, aviso } = await cambiarEstadoPedido(id, estado);
        mostrarAviso(`Pedido N.º ${id}: ${pedido.estadoNombre.toLowerCase()}.${aviso}`, "ok");
        cargarPedidos();
        cargarDashboard();
    } catch (error) {
        mostrarAviso(error.message, "error");
        boton.disabled = false;
        cargarPedidos();
    }
}

async function cancelarPedido(id) {

    const motivo = await pedirTexto({
        tipo: "peligro",
        titulo: `¿Cancelar el pedido N.º ${id}?`,
        mensaje: "Las unidades vuelven al stock y el pedido no cuenta en la caja. Al cliente le llega un mail con el motivo.",
        etiqueta: "Motivo de la cancelación",
        placeholder: "Ej.: el cliente no lo pasó a buscar",
        aceptar: "Cancelar pedido",
        cancelar: "Volver"
    });

    if (!motivo) return;

    try {
        const { aviso } = await cambiarEstadoPedido(id, "CANCELADO", motivo);
        mostrarAviso(`Pedido N.º ${id} cancelado. Las unidades volvieron al stock.${aviso}`, "ok");
        cargarPedidos();
        cargarProductos();
        cargarDashboard();
    } catch (error) {
        mostrarAviso(error.message, "error");
    }
}
