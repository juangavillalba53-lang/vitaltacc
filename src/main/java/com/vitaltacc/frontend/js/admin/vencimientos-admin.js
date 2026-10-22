const TRAMOS_VENCIMIENTO = [
    { id: "URGENTE", nombre: "Urgentes", detalle: "Vencen en 15 días o menos" },
    { id: "ATENCION", nombre: "16 a 30 días", detalle: "Vencen en 16 a 30 días" },
    { id: "PROXIMOS", nombre: "31 a 60 días", detalle: "Vencen en 31 a 60 días: hay tiempo para promocionarlos" },
    { id: "VENCIDO", nombre: "Vencidos", detalle: "Ya vencieron y siguen en el local: hay que retirarlos" }
];

const LOTES_VENCIMIENTO_POR_PAGINA = 8;

let tramoVencimiento = "URGENTE";
let paginaVencimientos = 1;
let datosVencimientos = { porVencer: [], vencidos: [] };

function lotesDelTramo(tramo) {
    const { porVencer, vencidos } = datosVencimientos;
    const lista = tramo === "VENCIDO" ? vencidos
        : tramo === "PROXIMOS" ? porVencer.filter(l => l.alerta === "OK")
            : porVencer.filter(l => l.alerta === tramo);
    return [...lista].sort((a, b) => Number(a.diasRestantes) - Number(b.diasRestantes));
}

async function abrirVencimientos(tramo = "URGENTE") {

    tramoVencimiento = tramo;
    paginaVencimientos = 1;

    const modal = document.getElementById("modalVencimientos");
    document.getElementById("buscarVencimientos").value = "";
    document.getElementById("listaVencimientos").innerHTML = `<p class="estado-carga">Cargando lotes...</p>`;
    modal.style.display = "flex";

    await recargarVencimientos();
    modal.querySelector(`.tab-vencimiento[data-tramo="${tramo}"]`)?.focus();
}

function cerrarVencimientos() {
    document.getElementById("modalVencimientos").style.display = "none";
}

const vencimientosAbierto = () => document.getElementById("modalVencimientos")?.style.display === "flex";

async function recargarVencimientos() {
    try {
        const [porVencer, vencidos] = await Promise.all([pedir("/lotes/por-vencer"), pedir("/lotes/vencidos")]);
        datosVencimientos = { porVencer: porVencer || [], vencidos: vencidos || [] };
        dibujarVencimientos();
    } catch (error) {
        document.getElementById("listaVencimientos").innerHTML =
            `<p class="estado-carga">No se pudieron cargar los lotes: ${escaparHTML(error.message)}</p>`;
    }
}

function elegirTramoVencimiento(tramo) {
    tramoVencimiento = tramo;
    paginaVencimientos = 1;
    dibujarVencimientos();
}

function dibujarVencimientos() {

    const tramo = TRAMOS_VENCIMIENTO.find(t => t.id === tramoVencimiento) || TRAMOS_VENCIMIENTO[0];

    // Pestañas con la cantidad de cada tramo
    document.getElementById("tabsVencimientos").innerHTML = TRAMOS_VENCIMIENTO.map(t => `
        <button type="button" role="tab" class="tab-vencimiento tramo-${t.id.toLowerCase()} ${t.id === tramo.id ? "activo" : ""}"
            data-tramo="${t.id}" aria-selected="${t.id === tramo.id}" onclick="elegirTramoVencimiento('${t.id}')">
            ${t.nombre} <span>${lotesDelTramo(t.id).length}</span>
        </button>`).join("");

    document.getElementById("detalleVencimientos").textContent = tramo.detalle;

    const texto = normalizarTexto(document.getElementById("buscarVencimientos").value.trim());
    const todos = lotesDelTramo(tramo.id).filter(l => !texto
        || normalizarTexto(l.producto).includes(texto)
        || normalizarTexto(l.numeroLote).includes(texto));

    const contenedor = document.getElementById("listaVencimientos");

    if (!todos.length) {
        contenedor.innerHTML = `<p class="estado-carga">${texto
            ? "No hay lotes que coincidan con la búsqueda."
            : tramo.id === "VENCIDO" ? "No hay lotes vencidos en el local." : "No hay lotes en este tramo."}</p>`;
        dibujarPaginacion(document.getElementById("paginacionVencimientos"), 1, 1, () => { });
        return;
    }

    const { items, pagina, totalPaginas } = paginar(todos, paginaVencimientos, LOTES_VENCIMIENTO_POR_PAGINA);
    paginaVencimientos = pagina;
    const esAdmin = usuario.rol === "ADMIN";

    contenedor.innerHTML = `
        <table class="tabla-lotes-modal tabla-vencimientos">
            <thead>
                <tr>
                    <th>Producto</th>
                    <th>Lote</th>
                    <th>Cantidad</th>
                    <th>Vence</th>
                    <th>Estado</th>
                    <th><span class="solo-lectores">Acción</span></th>
                </tr>
            </thead>
            <tbody>
                ${items.map(l => {
        const dias = Number(l.diasRestantes);
        const accion = l.alerta === "VENCIDO"
            ? `<button type="button" class="btn-tabla btn-retirar"
                               onclick="retirarLote(${l.id}, ${l.productoId}, '${escaparHTML(l.numeroLote)}')">Retirar</button>`
            : esAdmin
                ? `<button type="button" class="btn-tabla btn-editar" title="Crear una promoción para venderlo antes de que venza"
                                   onclick="promocionarProducto(${l.productoId})">Promocionar</button>`
                : `<button type="button" class="btn-tabla btn-lotes"
                                   onclick="cerrarVencimientos(); abrirModalLotes(${l.productoId})">Ver lotes</button>`;
        return `
                        <tr>
                            <td><strong>${escaparHTML(l.producto)}</strong></td>
                            <td>${escaparHTML(l.numeroLote)}</td>
                            <td>${l.cantidad} u.</td>
                            <td>${fechaCorta(l.fechaVencimiento)}</td>
                            <td><span class="proximo-dias ${nivelVencimiento(dias)}">${textoDias(dias)}</span></td>
                            <td>${accion}</td>
                        </tr>`;
    }).join("")}
            </tbody>
        </table>`;

    dibujarPaginacion(document.getElementById("paginacionVencimientos"), pagina, totalPaginas, nueva => {
        paginaVencimientos = nueva;
        dibujarVencimientos();
    });
}

// Lleva a Promociones con el producto ya elegido, para venderlo antes de que venza
function promocionarProducto(productoId) {
    cerrarVencimientos();
    mostrarSeccion("adminPromociones");
    const select = document.getElementById("productoPromo");
    if (select) {
        select.value = String(productoId);
        select.dispatchEvent(new Event("change"));
    }
    document.getElementById("descripcionPromo")?.focus();
}

// Desde el Panel General: Inventario mostrando solo los de stock bajo
function verStockBajo() {
    mostrarSeccion("adminInventario");
    const filtro = document.getElementById("filtroStock");
    if (filtro) filtro.value = "bajo";
    const buscador = document.getElementById("buscarStock");
    if (buscador) buscador.value = "";
    filtrarStock();
    document.getElementById("tablaStock")?.closest(".card-admin")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ---------------------------------------------------------
// Tarjetas que se pueden tocar
//   data-vencimientos="URGENTE" → abre la ventana en ese tramo
//   data-ir="adminInventario"   → va a esa sección
// ---------------------------------------------------------

function activarTarjeta(tarjeta) {
    if (tarjeta.dataset.vencimientos) {
        abrirVencimientos(tarjeta.dataset.vencimientos);
    } else if (tarjeta.dataset.ir) {
        mostrarSeccion(tarjeta.dataset.ir);
    }
}

document.addEventListener("DOMContentLoaded", () => {

    const esAdmin = usuario?.rol === "ADMIN";

    document.querySelectorAll("[data-vencimientos], [data-ir]").forEach(tarjeta => {
        // Las secciones que son solo del admin no llevan a ningún lado para el empleado
        if (tarjeta.dataset.soloAdmin !== undefined && !esAdmin) {
            delete tarjeta.dataset.ir;
            return;
        }
        tarjeta.classList.add("tarjeta-clic");
        tarjeta.tabIndex = 0;
        tarjeta.setAttribute("role", "button");
    });

    document.addEventListener("click", evento => {
        const tarjeta = evento.target.closest(".tarjeta-clic");
        if (tarjeta) activarTarjeta(tarjeta);
    });

    document.addEventListener("keydown", evento => {
        const tarjeta = evento.target.closest?.(".tarjeta-clic");
        if (tarjeta && (evento.key === "Enter" || evento.key === " ")) {
            evento.preventDefault();
            activarTarjeta(tarjeta);
        }
        if (evento.key === "Escape" && vencimientosAbierto() && !document.querySelector("dialog[open]")) {
            cerrarVencimientos();
        }
        if (evento.key === "Enter" && evento.target.matches?.("#modalVencimientos .cerrar-modal")) {
            cerrarVencimientos();
        }
    });

    const modal = document.getElementById("modalVencimientos");
    modal?.addEventListener("click", evento => {
        if (evento.target === modal) cerrarVencimientos();
    });

    document.getElementById("buscarVencimientos")?.addEventListener("input", () => {
        paginaVencimientos = 1;
        dibujarVencimientos();
    });
});
