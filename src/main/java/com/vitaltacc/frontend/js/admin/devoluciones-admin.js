// =========================================================
// DEVOLUCIONES (se abren desde el historial de ventas)
// - Hasta 2 días después de la compra.
// - Se elige el motivo, cuántas unidades y si el producto vuelve cerrado.
// - El motivo decide si se devuelve la plata y si vuelve al stock.
//   Las reglas vienen del servidor (/devoluciones/motivos).
// =========================================================

let motivosDevolucion = null;
let devolucionActual = null;
let focoAntesDeDevolucion = null;

const ESTADOS_PRODUCTO = {
    CERRADO: "Cerrado y sano",
    ABIERTO: "Abierto o dañado"
};

async function abrirDevolucion(ventaId) {

    const modal = document.getElementById("modalDevolucion");
    const contenido = document.getElementById("contenidoDevolucion");

    document.getElementById("tituloDevolucion").textContent = `Devolución de la compra N.º ${ventaId}`;
    contenido.innerHTML = `<p class="devolucion-cargando">Cargando la compra...</p>`;
    focoAntesDeDevolucion = document.activeElement;
    modal.style.display = "flex";
    modal.querySelector(".cerrar-modal").focus();

    try {
        const [motivos, datos] = await Promise.all([
            motivosDevolucion ? Promise.resolve(motivosDevolucion) : pedir("/devoluciones/motivos"),
            pedir(`/devoluciones/venta/${ventaId}`)
        ]);

        motivosDevolucion = motivos;

        devolucionActual = {
            datos,
            motivo: null,
            items: datos.items.map(item => ({ ...item, cantidad: 0, estado: "CERRADO" }))
        };

        dibujarDevolucion();

    } catch (error) {
        contenido.innerHTML = `<p class="devolucion-aviso error">No se pudo abrir la compra: ${escaparHTML(error.message)}</p>`;
    }
}

function cerrarDevolucion() {
    document.getElementById("modalDevolucion").style.display = "none";
    devolucionActual = null;
    focoAntesDeDevolucion?.focus?.();
}

// Cerrar con Escape, con Enter sobre la cruz o tocando afuera de la ventana
document.addEventListener("keydown", evento => {
    const modal = document.getElementById("modalDevolucion");
    if (modal?.style.display !== "flex") return;

    if (evento.key === "Escape") cerrarDevolucion();
    if (evento.key === "Enter" && evento.target.classList?.contains("cerrar-modal")) cerrarDevolucion();
});

document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("modalDevolucion");
    modal?.addEventListener("click", evento => {
        if (evento.target === modal) cerrarDevolucion();
    });
});

// ---------------------------------------------------------
// Dibujo de la ventana
// ---------------------------------------------------------

function dibujarDevolucion() {

    const { datos } = devolucionActual;
    const contenido = document.getElementById("contenidoDevolucion");

    const encabezado = `
        <dl class="devolucion-datos">
            <div><dt>Fecha</dt><dd>${fechaCorta(datos.fecha)}</dd></div>
            <div><dt>Cliente</dt><dd>${escaparHTML(datos.cliente)}</dd></div>
            <div><dt>Pago</dt><dd>${escaparHTML(nombrePago(datos.metodoPago))}</dd></div>
            <div><dt>Total</dt><dd>${pesos(datos.total)}</dd></div>
        </dl>`;

    const anteriores = datos.devoluciones.length ? `
        <div class="devolucion-anteriores">
            <h3>Devoluciones anteriores</h3>
            <ul>
                ${datos.devoluciones.map(d => `
                    <li>
                        <span>${fechaCorta(d.fecha)} · ${escaparHTML(d.motivoNombre)}</span>
                        <strong>${d.estado === "RECHAZADA" ? "No correspondía" : pesos(d.montoReintegrado)}</strong>
                    </li>`).join("")}
            </ul>
        </div>` : "";

    if (!datos.puedeDevolver) {
        contenido.innerHTML = `
            ${encabezado}
            <p class="devolucion-aviso">${escaparHTML(datos.motivoNoPuede)}</p>
            ${anteriores}
            <div class="devolucion-botones">
                <button type="button" class="btn-cancelar" onclick="cerrarDevolucion()">Cerrar</button>
            </div>`;
        return;
    }

    contenido.innerHTML = `
        ${encabezado}
        <p class="devolucion-plazo">Se puede devolver hasta el <strong>${fechaCorta(datos.fechaLimite)}</strong>.</p>

        <fieldset class="devolucion-motivos">
            <legend>¿Por qué lo devuelve?</legend>
            ${motivosDevolucion.map(m => `
                <label class="motivo-opcion">
                    <input type="radio" name="motivoDevolucion" value="${m.codigo}">
                    <span>
                        <strong>${escaparHTML(m.nombre)}</strong>
                        <small>${escaparHTML(m.descripcion)}</small>
                    </span>
                </label>`).join("")}
        </fieldset>

        <h3>¿Qué devuelve?</h3>
        <div class="tabla-devolucion" id="tablaDevolucion"></div>

        <label for="observacionDevolucion">Detalle (opcional)</label>
        <textarea id="observacionDevolucion" rows="2" maxlength="250"
            placeholder="Ej.: el paquete estaba abierto de fábrica"></textarea>

        <div class="devolucion-resumen" id="resumenDevolucion" aria-live="polite"></div>

        <div class="devolucion-botones">
            <button type="button" class="btn-cancelar" onclick="cerrarDevolucion()">Cancelar</button>
            <button type="button" id="botonConfirmarDevolucion" onclick="confirmarDevolucion()" disabled>
                Registrar devolución
            </button>
        </div>

        ${anteriores}`;

    contenido.querySelectorAll('input[name="motivoDevolucion"]').forEach(opcion => {
        opcion.addEventListener("change", () => {
            devolucionActual.motivo = motivosDevolucion.find(m => m.codigo === opcion.value);
            dibujarItemsDevolucion();
        });
    });

    dibujarItemsDevolucion();
}

function dibujarItemsDevolucion() {

    const { items, motivo } = devolucionActual;
    const tabla = document.getElementById("tablaDevolucion");

    // Si el motivo no permite volver a vender, el estado del producto no cambia nada
    const importaEstado = !motivo || motivo.puedeVolverAlStock || motivo.reintegroSoloSiCerrado;

    tabla.innerHTML = items.map((item, i) => `
        <div class="fila-devolucion ${item.disponibles === 0 ? "sin-unidades" : ""}">
            <div class="fila-devolucion-producto">
                <strong>${escaparHTML(item.producto)}</strong>
                <small>
                    Compró ${item.vendidas} · ${pesos(item.precioUnitario)} c/u
                    ${item.devueltas ? ` · ya devolvió ${item.devueltas}` : ""}
                </small>
            </div>

            <div class="control-cantidad" role="group" aria-label="Unidades de ${escaparHTML(item.producto)} que devuelve">
                <button type="button" class="btn-cantidad" aria-label="Restar uno"
                    onclick="cambiarCantidadDevolucion(${i}, -1)" ${item.cantidad <= 0 ? "disabled" : ""}>−</button>
                <span>${item.cantidad}</span>
                <button type="button" class="btn-cantidad" aria-label="Sumar uno"
                    onclick="cambiarCantidadDevolucion(${i}, 1)" ${item.cantidad >= item.disponibles ? "disabled" : ""}>+</button>
            </div>

            ${importaEstado ? `
                <select aria-label="Estado de ${escaparHTML(item.producto)}" onchange="cambiarEstadoDevolucion(${i}, this.value)"
                    ${item.cantidad === 0 ? "disabled" : ""}>
                    ${Object.entries(ESTADOS_PRODUCTO).map(([valor, texto]) =>
                        `<option value="${valor}" ${item.estado === valor ? "selected" : ""}>${texto}</option>`).join("")}
                </select>`
                : `<span class="fila-devolucion-nota">Se descarta</span>`}
        </div>`).join("");

    actualizarResumenDevolucion();
}

function cambiarCantidadDevolucion(indice, cambio) {
    const item = devolucionActual.items[indice];
    item.cantidad = Math.min(item.disponibles, Math.max(0, item.cantidad + cambio));
    dibujarItemsDevolucion();
}

function cambiarEstadoDevolucion(indice, estado) {
    devolucionActual.items[indice].estado = estado;
    actualizarResumenDevolucion();
}

// ---------------------------------------------------------
// Resumen en vivo: qué plata se devuelve y qué vuelve al stock
// (el servidor hace la misma cuenta al registrar)
// ---------------------------------------------------------

function calcularDevolucion() {

    const { items, motivo } = devolucionActual;
    let reintegro = 0;
    let alStock = 0;
    let descartadas = 0;
    let rechazadas = 0;

    items.filter(i => i.cantidad > 0).forEach(item => {
        const cerrado = item.estado === "CERRADO";
        const correspondePlata = !motivo.reintegroSoloSiCerrado || cerrado;
        const vuelve = motivo.puedeVolverAlStock && cerrado;

        if (correspondePlata) reintegro += item.cantidad * Number(item.precioUnitario);

        if (vuelve) alStock += item.cantidad;
        else if (correspondePlata) descartadas += item.cantidad;
        else rechazadas += item.cantidad;
    });

    return { reintegro, alStock, descartadas, rechazadas };
}

function actualizarResumenDevolucion() {

    const { items, motivo, datos } = devolucionActual;
    const resumen = document.getElementById("resumenDevolucion");
    const boton = document.getElementById("botonConfirmarDevolucion");
    const unidades = items.reduce((s, i) => s + i.cantidad, 0);

    if (!motivo || unidades === 0) {
        resumen.className = "devolucion-resumen";
        resumen.innerHTML = !motivo
            ? "Elegí el motivo y las unidades que devuelve."
            : "Indicá cuántas unidades devuelve.";
        boton.disabled = true;
        return;
    }

    const { reintegro, alStock, descartadas, rechazadas } = calcularDevolucion();
    const lineas = [];

    if (reintegro > 0) {
        lineas.push(`Se le devuelven <strong>${pesos(reintegro)}</strong> por ${escaparHTML(nombrePago(datos.metodoPago))}.`);
    }

    if (alStock) lineas.push(`${alStock === 1 ? "1 unidad vuelve" : `${alStock} unidades vuelven`} al stock.`);
    if (descartadas) lineas.push(`${descartadas === 1 ? "1 unidad se descarta" : `${descartadas} unidades se descartan`} (no se vuelve a vender).`);
    if (rechazadas) lineas.push(`${rechazadas === 1 ? "1 unidad no se acepta" : `${rechazadas} unidades no se aceptan`}: con este motivo el producto tiene que volver cerrado.`);

    resumen.className = `devolucion-resumen ${reintegro > 0 ? "con-reintegro" : "sin-reintegro"}`;
    resumen.innerHTML = (reintegro > 0 ? "" : "<strong>No corresponde devolver plata.</strong> ") + lineas.join(" ");
    boton.disabled = false;
    boton.textContent = reintegro > 0 ? "Registrar devolución" : "Registrar sin reintegro";
}

// ---------------------------------------------------------
// Confirmar
// ---------------------------------------------------------

async function confirmarDevolucion() {

    const { datos, motivo, items } = devolucionActual;
    const boton = document.getElementById("botonConfirmarDevolucion");

    boton.disabled = true;

    try {
        const resultado = await pedir("/devoluciones", {
            method: "POST",
            json: {
                ventaId: datos.ventaId,
                empleadoId: usuario.id,
                motivo: motivo.codigo,
                observacion: document.getElementById("observacionDevolucion").value.trim(),
                items: items
                    .filter(i => i.cantidad > 0)
                    .map(i => ({ productoId: i.productoId, cantidad: i.cantidad, estado: i.estado }))
            }
        });

        const partes = [];
        if (resultado.unidadesAlStock) partes.push(`${resultado.unidadesAlStock} al stock`);
        if (resultado.unidadesDescartadas) partes.push(`${resultado.unidadesDescartadas} descartadas`);

        if (resultado.estado === "RECHAZADA") {
            mostrarAviso("Devolución registrada sin reintegro: no correspondía devolver la plata.", "alerta");
        } else {
            mostrarAviso(
                `Devolución registrada: se devuelven ${pesos(resultado.montoReintegrado)} por ` +
                `${nombrePago(resultado.metodoPago)}${partes.length ? ` (${partes.join(", ")})` : ""}.`, "ok");
        }

        cerrarDevolucion();
        cargarHistorialVentas();
        cargarProductos();
        cargarDashboard();

    } catch (error) {
        mostrarAviso("No se pudo registrar la devolución: " + error.message, "error");
        boton.disabled = false;
    }
}
