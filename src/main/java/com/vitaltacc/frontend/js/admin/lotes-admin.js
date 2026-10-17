// =========================================================
// LOTES: alta, alertas de vencimiento, retiro y baja
// =========================================================

// Fecha de hoy en formato AAAA-MM-DD según la hora local (no la de Londres)
function hoyLocal() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// CREAR LOTE
function crearLote() {

    const productoId = document.getElementById("productoLote").value;
    const cantidad = parseInt(document.getElementById("cantidadLote").value);
    const fecha = document.getElementById("vencimientoLote").value;

    const hoy = hoyLocal();

    if (!productoId) {
        alert("Seleccionar producto");
        return;
    }

    if (isNaN(cantidad) || cantidad <= 0) {
        alert("La cantidad debe ser mayor a 0");
        return;
    }

    if (!fecha) {
        alert("Seleccionar fecha de vencimiento");
        return;
    }

    if (fecha <= hoy) {
        alert("La fecha de vencimiento debe ser futura");
        return;
    }

    pedir("/lotes", {
        method: "POST",
        json: {
            cantidad: cantidad,
            fechaVencimiento: fecha,
            producto: { id: productoId }
        }
    })
        .then(data => {

            const p = document.getElementById("loteCreado");
            if (p) {
                p.innerText = "Lote creado · N.º " + data.numeroLote;
                p.className = "mensaje-exito";
            }

            document.getElementById("cantidadLote").value = "";
            document.getElementById("vencimientoLote").value = "";

            cargarLotesPorVencer();
            cargarStock();
        })
        .catch(error => {
            mostrarAviso("No se pudo crear el lote: " + error.message, "error");
        });
}


function cargarLotesPorVencer() {

    Promise.all([
        pedir("/lotes/por-vencer"),
        pedir("/lotes/vencidos").catch(() => [])
    ])
        .then(([porVencer, vencidos]) => {

            window.lotesStock = porVencer;

            const contar = nivel => porVencer.filter(l => l.alerta === nivel).length;

            ponerTexto(document.getElementById("cantidadUrgentes"), contar("URGENTE"));
            ponerTexto(document.getElementById("cantidadAtencion"), contar("ATENCION"));
            ponerTexto(document.getElementById("cantidadVencidos"), vencidos.length);
            ponerTexto(document.getElementById("cantidadMonitoreados"), porVencer.length);

            if (productosStock.length > 0) {
                renderStock(productosStock);
            }
        })
        .catch(error => {
            console.error("Error al cargar lotes:", error);
        });
}

function abrirModalLotes(productoId) {

    const modal = document.getElementById("modalLotes");
    const lista = document.getElementById("listaModalLotes");

    modal.style.display = "flex";
    lista.innerHTML = "Cargando...";

    pedir(`/lotes/producto/${productoId}`)
        .then(data => {

            // Todos los lotes con unidades, incluidos los vencidos (para poder retirarlos)
            const lotesValidos = data
                .filter(l => l.cantidad > 0)
                .sort((a, b) => a.diasRestantes - b.diasRestantes);

            if (lotesValidos.length === 0) {

                lista.innerHTML = `
                    <p>No hay lotes disponibles</p>
                `;

                return;
            }

            let paginaActual = 1;
            const lotesPorPagina = 5;
            let textoBusqueda = "";

            lista.innerHTML = `
                <input
                    type="text"
                    id="buscarLoteModal"
                    placeholder="Buscar lote..."
                >

                <div id="contenedorTablaLotes"></div>
            `;

            const input = document.getElementById("buscarLoteModal");

            input.addEventListener("input", e => {

                textoBusqueda = e.target.value.toLowerCase();

                paginaActual = 1;

                renderTabla();
            });

            function renderTabla() {

                const contenedor =
                    document.getElementById("contenedorTablaLotes");

                let filtrados = lotesValidos;

                if (textoBusqueda) {

                    filtrados = lotesValidos.filter(l =>
                        l.numeroLote
                            .toLowerCase()
                            .includes(textoBusqueda)
                    );
                }

                if (filtrados.length === 0) {

                    contenedor.innerHTML = `
                        <p>No se encontraron lotes.</p>
                    `;

                    return;
                }

                const totalPaginas =
                    Math.ceil(filtrados.length / lotesPorPagina);

                if (paginaActual > totalPaginas) {
                    paginaActual = totalPaginas;
                }

                const inicio =
                    (paginaActual - 1) * lotesPorPagina;

                const fin =
                    inicio + lotesPorPagina;

                const pagina =
                    filtrados.slice(inicio, fin);

                let html = `
                    <table class="tabla-lotes-modal">

                        <thead>
                            <tr>
                                <th>Lote</th>
                                <th>Cantidad</th>
                                <th>Vence</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>

                        <tbody>
                `;

                pagina.forEach(lote => {

                    const clase = {
                        VENCIDO: "lote-vencido",
                        URGENTE: "lote-urgente",
                        ATENCION: "lote-atencion"
                    }[lote.alerta] || "";

                    // Vencido: cualquiera del equipo lo puede retirar. Si no, solo el admin lo borra.
                    const accion = lote.alerta === "VENCIDO"
                        ? `<button class="btn-tabla btn-retirar" onclick="retirarLote(${lote.id}, ${productoId})">Retirar</button>`
                        : usuario.rol === "ADMIN"
                            ? `<button class="btn-tabla btn-eliminar btn-eliminar-lote" onclick="eliminarLote(${lote.id}, ${productoId})">Eliminar</button>`
                            : "—";

                    html += `
                        <tr class="${clase}">
                            <td>${escaparHTML(lote.numeroLote)}</td>
                            <td>${lote.cantidad}</td>
                            <td>${fechaCorta(lote.fechaVencimiento)}</td>
                            <td>${textoDias(Number(lote.diasRestantes))}</td>
                            <td>${accion}</td>
                        </tr>
                    `;
                });

                html += `
                        </tbody>
                    </table>
                `;

                if (totalPaginas > 1) {

                    html += `
                        <div class="paginacion-modal">

                            <button
                                id="btnAnteriorLote"
                                ${paginaActual === 1 ? "disabled" : ""}
                            >
                                Anterior
                            </button>

                            <span>
                                Página ${paginaActual} de ${totalPaginas}
                            </span>

                            <button
                                id="btnSiguienteLote"
                                ${paginaActual === totalPaginas ? "disabled" : ""}
                            >
                                Siguiente
                            </button>

                        </div>
                    `;
                }

                contenedor.innerHTML = html;

                const btnAnterior =
                    document.getElementById("btnAnteriorLote");

                const btnSiguiente =
                    document.getElementById("btnSiguienteLote");

                if (btnAnterior) {

                    btnAnterior.onclick = () => {

                        paginaActual--;

                        renderTabla();
                    };
                }

                if (btnSiguiente) {

                    btnSiguiente.onclick = () => {

                        paginaActual++;

                        renderTabla();
                    };
                }
            }

            renderTabla();
        })
        .catch(error => {

            console.error(error);

            lista.innerHTML = `
                <p>Error cargando lotes</p>
            `;
        });
}

function cerrarModalLotes() {

    document.getElementById("modalLotes").style.display = "none";
}

async function eliminarLote(loteId, productoId) {

    const numero = textoDeFila("td:first-child");

    const seguro = await confirmar({
        titulo: "¿Eliminar este lote?",
        mensaje: (numero ? `El lote ${numero} ` : "El lote ") +
            "se descuenta del stock. Solo se puede si todavía no se vendió nada de él.",
        aceptar: "Eliminar lote"
    });

    if (!seguro) return;

    try {
        await pedir(`/lotes/${loteId}`, { method: "DELETE" });
        mostrarAviso("Lote eliminado.", "ok");
        actualizarDespuesDeLote(productoId);
    } catch (error) {
        mostrarAviso(error.message, "error");
    }
}

// Saca del stock un lote vencido (queda registrado con la fecha de retiro)
async function retirarLote(loteId, productoId, numeroLote) {

    const numero = numeroLote || textoDeFila("td:first-child");

    const seguro = await confirmar({
        titulo: "¿Retirar este lote vencido?",
        mensaje: (numero ? `El lote ${numero} ` : "El lote ") +
            "queda en 0 unidades. Hacelo cuando lo saques del local.",
        aceptar: "Retirar lote"
    });

    if (!seguro) return;

    try {
        await pedir(`/lotes/${loteId}/retirar`, { method: "PUT" });
        mostrarAviso("Lote retirado del stock.", "ok");
        actualizarDespuesDeLote(productoId);
    } catch (error) {
        mostrarAviso(error.message, "error");
    }
}

// Refresca todo lo que muestra lotes
function actualizarDespuesDeLote(productoId) {
    if (productoId && document.getElementById("modalLotes")?.style.display === "flex") {
        abrirModalLotes(productoId);
    }
    cargarStock();
    cargarLotesPorVencer();
    cargarProductosVenta();
    cargarDashboard();
}
