// =========================================================
// CLIENTES: lista de a 20, cada fila se despliega con sus datos
// y sus últimas compras
// =========================================================

let esperaBusquedaClientes;

async function cargarClientes(pagina = 1) {

    const lista = document.getElementById("listaClientes");
    const estado = document.getElementById("estadoClientes");

    const parametros = new URLSearchParams({
        pagina,
        orden: document.getElementById("ordenClientes").value
    });
    const texto = document.getElementById("buscarClientes").value.trim();
    if (texto) parametros.set("texto", texto);

    estado.textContent = "Cargando clientes...";

    try {
        const datos = await pedir(`/clientes?${parametros}`);

        estado.textContent = datos.total === 0 ? ""
            : datos.total === 1 ? "1 cliente"
            : `${datos.total.toLocaleString("es-AR")} clientes`;

        lista.innerHTML = datos.clientes.length
            ? datos.clientes.map(filaCliente).join("")
            : `<p class="estado-carga">${texto ? "No hay clientes que coincidan con la búsqueda." : "Todavía no hay clientes."}</p>`;

        dibujarPaginacion(document.getElementById("paginacionClientes"), datos.pagina, datos.totalPaginas, nueva => {
            cargarClientes(nueva);
            document.getElementById("adminClientes").scrollIntoView({ behavior: "smooth", block: "start" });
        });

    } catch (error) {
        estado.textContent = "";
        lista.innerHTML = `<p class="estado-carga">No se pudieron cargar los clientes: ${escaparHTML(error.message)}</p>`;
    }
}

const dniConPuntos = dni => String(dni || "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");

function filaCliente(c) {

    const nombre = `${c.nombre || ""} ${c.apellido || ""}`.trim();
    const compras = c.compras === 1 ? "1 compra" : `${c.compras} compras`;

    return `
        <details class="cliente" data-id="${c.id}">
            <summary class="cliente-encabezado">
                <div class="cliente-titulo">
                    <strong>${escaparHTML(nombre)}</strong>
                    <span>DNI ${escaparHTML(dniConPuntos(c.dni))}</span>
                </div>
                <span class="cliente-cuenta ${c.cuentaWeb ? "web" : "local"}">${c.cuentaWeb ? "Cuenta web" : "Solo en el local"}</span>
                <span class="cliente-dato dato-compras"><small>Compras</small>${escaparHTML(compras)}</span>
                <span class="cliente-dato dato-total"><small>Total gastado</small>${pesos(c.totalGastado)}</span>
                <span class="cliente-dato dato-ultima"><small>Última compra</small>${c.ultimaCompra ? fechaCorta(c.ultimaCompra) : "—"}</span>
                <svg class="flecha-auditoria" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
            </summary>

            <div class="cliente-contenido">
                <dl class="cliente-datos">
                    <div><dt>Email</dt><dd>${c.email ? escaparHTML(c.email) : "—"}</dd></div>
                    <div><dt>Teléfono</dt><dd>${c.telefono ? escaparHTML(c.telefono) : "—"}</dd></div>
                    <div><dt>Compras en el local</dt><dd>${c.comprasLocal}</dd></div>
                    <div><dt>Compras online</dt><dd>${c.comprasOnline}</dd></div>
                </dl>

                <div class="cliente-compras" id="comprasCliente${c.id}">
                    ${c.compras ? `<p class="estado-carga">Cargando compras...</p>` : `<p class="estado-carga">Todavía no compró nada.</p>`}
                </div>

                ${c.compras ? `
                    <button type="button" class="btn-link" data-nombre="${escaparHTML(nombre)}" onclick="verClienteEnHistorial(this.dataset.nombre)">
                        Ver todas sus compras en el Historial de ventas
                    </button>` : ""}
            </div>
        </details>`;
}

// Las compras se piden recién cuando se abre la fila
async function mostrarComprasCliente(id) {

    const destino = document.getElementById(`comprasCliente${id}`);
    if (!destino || destino.dataset.cargado) return;
    destino.dataset.cargado = "1";

    try {
        const compras = await pedir(`/ventas/cliente/${id}`);

        if (!compras.length) {
            destino.innerHTML = `<p class="estado-carga">Todavía no compró nada.</p>`;
            return;
        }

        const filas = compras.slice(0, 5).map(v => {
            const productos = (v.items || []).map(i => `${i.cantidad} × ${i.producto}`).join(", ");
            const canal = v.tipoVenta === "ONLINE" ? "Online" : "Local";
            const estado = v.estadoNombre ? `<span class="cliente-estado">${escaparHTML(v.estadoNombre)}</span>` : "";
            const devuelto = Number(v.devuelto) > 0 ? `<small class="cliente-devuelto">Devuelto ${pesos(v.devuelto)}</small>` : "";
            return `
                <tr>
                    <td>N.º ${v.id}</td>
                    <td>${fechaCorta(v.fecha)}</td>
                    <td>${canal} ${estado}</td>
                    <td class="cliente-productos">${escaparHTML(productos)}</td>
                    <td class="cliente-total">${pesos(v.total)} ${devuelto}</td>
                </tr>`;
        }).join("");

        const canceladas = compras.filter(v => v.estado === "CANCELADO").length;

        destino.innerHTML = `
            <h4>Últimas compras${compras.length > 5 ? ` <small>(5 de ${compras.length})</small>` : ""}</h4>
            ${canceladas ? `<p class="cliente-nota">${canceladas === 1 ? "Tiene 1 pedido cancelado: no suma" : `Tiene ${canceladas} pedidos cancelados: no suman`} en las compras ni en el total gastado.</p>` : ""}
            <table class="tabla-clientes">
                <thead><tr><th>Compra</th><th>Fecha</th><th>Canal</th><th>Productos</th><th>Total</th></tr></thead>
                <tbody>${filas}</tbody>
            </table>`;

    } catch (error) {
        delete destino.dataset.cargado;
        destino.innerHTML = `<p class="estado-carga">No se pudieron cargar sus compras: ${escaparHTML(error.message)}</p>`;
    }
}

function verClienteEnHistorial(nombre) {
    document.getElementById("buscarHistorialVentas").value = nombre;
    mostrarSeccion("adminHistorialVentas");
}

document.addEventListener("DOMContentLoaded", () => {

    document.getElementById("buscarClientes")?.addEventListener("input", () => {
        clearTimeout(esperaBusquedaClientes);
        esperaBusquedaClientes = setTimeout(() => cargarClientes(1), 300);
    });

    document.getElementById("ordenClientes")?.addEventListener("change", () => cargarClientes(1));

    // Al abrir una fila se cargan sus compras
    document.getElementById("listaClientes")?.addEventListener("toggle", evento => {
        const fila = evento.target;
        if (fila.matches?.("details.cliente") && fila.open) {
            mostrarComprasCliente(Number(fila.dataset.id));
        }
    }, true);
});
