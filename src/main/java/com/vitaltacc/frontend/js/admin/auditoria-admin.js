// =========================================================
// AUDITORÍA: quién hizo cada cambio (solo el administrador)
// =========================================================

let paginaAuditoria = 1;
let filtrosAuditoriaListos = false;
let esperaBusquedaAuditoria;

// Color del chip según la acción
const TONO_ACCION = {
    CREAR: "alta",
    MODIFICAR: "cambio",
    ELIMINAR: "baja",
    CANCELAR: "baja",
    RETIRAR: "retiro",
    CAMBIO_ESTADO: "estado",
    INGRESO: "ingreso",
    INGRESO_FALLIDO: "baja"
};

async function abrirAuditoria() {
    await prepararFiltrosAuditoria();
    cargarAuditoria(1);
}

// Llena los desplegables de Usuario, Sección y Acción (una sola vez)
async function prepararFiltrosAuditoria() {

    if (filtrosAuditoriaListos) return;

    try {
        const opciones = await pedir("/auditoria/opciones");

        const opcion = (valor, texto) => `<option value="${escaparHTML(valor)}">${escaparHTML(texto)}</option>`;

        document.getElementById("moduloAuditoria").insertAdjacentHTML("beforeend",
            opciones.modulos.map(m => opcion(m.valor, m.nombre)).join(""));

        document.getElementById("accionAuditoria").insertAdjacentHTML("beforeend",
            opciones.acciones.map(a => opcion(a.valor, a.nombre)).join(""));

        document.getElementById("usuarioAuditoria").insertAdjacentHTML("beforeend",
            opciones.usuarios.map(u => opcion(u.id, u.nombre)).join(""));

        filtrosAuditoriaListos = true;

    } catch (error) {
        mostrarAviso("No se pudieron cargar los filtros: " + error.message, "error");
    }
}

function parametrosAuditoria(pagina) {

    const valor = id => document.getElementById(id).value.trim();
    const parametros = new URLSearchParams({ pagina });

    [["texto", "buscarAuditoria"], ["desde", "desdeAuditoria"], ["hasta", "hastaAuditoria"],
     ["usuarioId", "usuarioAuditoria"], ["modulo", "moduloAuditoria"], ["accion", "accionAuditoria"]]
        .forEach(([clave, id]) => {
            if (valor(id)) parametros.set(clave, valor(id));
        });

    return parametros;
}

async function cargarAuditoria(pagina = 1) {

    const lista = document.getElementById("listaAuditoria");
    const estado = document.getElementById("estadoAuditoria");

    estado.textContent = "Cargando registros...";

    try {
        const datos = await pedir(`/auditoria?${parametrosAuditoria(pagina)}`);
        paginaAuditoria = datos.pagina;

        estado.textContent = datos.total === 0 ? ""
            : datos.total === 1 ? "1 registro"
            : `${datos.total.toLocaleString("es-AR")} registros`;

        lista.innerHTML = datos.registros.length
            ? agruparPorDia(datos.registros)
            : `<p class="estado-carga">No hay registros con esos filtros.</p>`;

        dibujarPaginacion(document.getElementById("paginacionAuditoria"), datos.pagina, datos.totalPaginas, nueva => {
            cargarAuditoria(nueva);
            document.getElementById("adminAuditoria").scrollIntoView({ behavior: "smooth", block: "start" });
        });

    } catch (error) {
        estado.textContent = "";
        lista.innerHTML = `<p class="estado-carga">No se pudo cargar la auditoría: ${escaparHTML(error.message)}</p>`;
        dibujarPaginacion(document.getElementById("paginacionAuditoria"), 1, 1, () => {});
    }
}

// Separa los registros por día: Hoy, Ayer, 18/10/2026...
function agruparPorDia(registros) {

    const fechaTexto = d => d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
    const hoy = new Date();
    const ayer = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1);

    const nombreDia = dia =>
        dia === fechaTexto(hoy) ? "Hoy" : dia === fechaTexto(ayer) ? "Ayer" : dia;

    let html = "";
    let diaActual = null;

    registros.forEach(r => {
        const [dia] = r.fechaHora.split(" ");
        if (dia !== diaActual) {
            if (diaActual !== null) html += "</div>";
            html += `<h4 class="dia-auditoria">${escaparHTML(nombreDia(dia))}</h4><div class="grupo-auditoria">`;
            diaActual = dia;
        }
        html += registroAuditoria(r);
    });

    return html + "</div>";
}

function registroAuditoria(r) {

    const [, hora] = r.fechaHora.split(" ");
    const tono = TONO_ACCION[r.accion] || "cambio";

    const quien = `${escaparHTML(r.usuario || "Sin identificar")}${r.rol ? ` <span class="rol-auditoria">${escaparHTML(r.rol)}</span>` : ""}`;

    const encabezado = `
        <time class="hora-auditoria">${escaparHTML(hora)}</time>
        <div class="texto-auditoria">
            <strong>${escaparHTML(r.descripcion)}</strong>
            <span class="meta-auditoria">${quien} · ${escaparHTML(r.moduloNombre)}</span>
        </div>
        <span class="accion-auditoria accion-${tono}">${escaparHTML(r.accionNombre)}</span>`;

    if (!r.detalle.length) {
        return `<div class="registro-auditoria sin-detalle"><div class="registro-encabezado">${encabezado}<span class="flecha-vacia"></span></div></div>`;
    }

    return `
        <details class="registro-auditoria">
            <summary class="registro-encabezado">
                ${encabezado}
                <svg class="flecha-auditoria" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
            </summary>
            <ul class="detalle-auditoria">
                ${r.detalle.map(lineaDetalle).join("")}
            </ul>
        </details>`;
}

// «Precio: $ 2.500,00 → $ 2.800,00» se muestra con el valor viejo tachado y el nuevo resaltado
function lineaDetalle(linea) {

    const separador = linea.indexOf(": ");

    if (separador === -1) {
        return `<li>${escaparHTML(linea)}</li>`;
    }

    const campo = linea.slice(0, separador);
    const valor = linea.slice(separador + 2);
    const partes = valor.split(" → ");

    if (partes.length === 2) {
        return `
            <li>
                <span class="campo-auditoria">${escaparHTML(campo)}</span>
                <span class="antes-auditoria">${escaparHTML(partes[0])}</span>
                <span class="cambio-flecha" aria-label="cambió a">→</span>
                <span class="despues-auditoria">${escaparHTML(partes[1])}</span>
            </li>`;
    }

    return `<li><span class="campo-auditoria">${escaparHTML(campo)}</span> <span>${escaparHTML(valor)}</span></li>`;
}

function limpiarFiltrosAuditoria() {
    ["buscarAuditoria", "desdeAuditoria", "hastaAuditoria", "usuarioAuditoria", "moduloAuditoria", "accionAuditoria"]
        .forEach(id => { document.getElementById(id).value = ""; });
    cargarAuditoria(1);
}

document.addEventListener("DOMContentLoaded", () => {

    document.getElementById("buscarAuditoria")?.addEventListener("input", () => {
        clearTimeout(esperaBusquedaAuditoria);
        esperaBusquedaAuditoria = setTimeout(() => cargarAuditoria(1), 300);
    });

    ["desdeAuditoria", "hastaAuditoria", "usuarioAuditoria", "moduloAuditoria", "accionAuditoria"]
        .forEach(id => document.getElementById(id)?.addEventListener("change", () => cargarAuditoria(1)));
});
