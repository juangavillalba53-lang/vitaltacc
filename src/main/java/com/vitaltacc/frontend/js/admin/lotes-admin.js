let filtroActual = "TODOS";
let textoBusqueda = "";

// 🔥 CREAR LOTE
function crearLote() {

    const productoId = document.getElementById("productoLote").value;
    const cantidad = parseInt(document.getElementById("cantidadLote").value);
    const fecha = document.getElementById("vencimientoLote").value;

    const hoy = new Date().toISOString().split("T")[0];

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

    fetch("http://localhost:8080/lotes", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            cantidad: cantidad,
            fechaVencimiento: fecha,
            producto: { id: productoId }
        })
    })
        .then(res => {
            if (!res.ok) throw new Error("Error backend");
            return res.json();
        })
        .then(data => {

            console.log("Lote creado:", data);

            const mensaje = "Lote creado - N°: " + data.numeroLote;

            const p = document.getElementById("loteCreado");
            if (p) {
                p.innerText = mensaje;
                p.className = "mensaje-exito"; // 🔥 ahora usa CSS
            }

            document.getElementById("cantidadLote").value = "";
            document.getElementById("vencimientoLote").value = "";

            cargarLotesPorVencer();
            cargarStock();
        })
        .catch(error => {
            console.error(error);
            alert("Error al crear lote");
        });
}


function cargarLotesPorVencer() {

    fetch("http://localhost:8080/lotes/por-vencer")
        .then(res => {
            if (!res.ok) {
                throw new Error("Error al cargar lotes");
            }

            return res.json();
        })
        .then(data => {

            window.lotesStock = data;

            const urgentes = data.filter(
                l => l.alerta === "URGENTE"
            ).length;

            const atencion = data.filter(
                l => l.alerta === "ATENCION"
            ).length;

            document.getElementById("cantidadUrgentes").innerText =
                urgentes;

            document.getElementById("cantidadAtencion").innerText =
                atencion;

            document.getElementById("cantidadMonitoreados").innerText =
                data.length;

            if (productosStock.length > 0) {
                renderStock(productosStock);
            }
        })
        .catch(error => {
            console.error("Error al cargar lotes:", error);
        });
}

function setFiltro(filtro) {
    filtroActual = filtro;
    cargarLotesPorVencer();
}

function toggleBusqueda() {
    const input = document.getElementById("busquedaLote");

    if (input.style.display === "none") {
        input.style.display = "block";
        input.focus();
    } else {
        input.style.display = "none";
        input.value = "";
        textoBusqueda = "";
        cargarLotesPorVencer();
    }
}

function buscarLotes() {
    textoBusqueda = document.getElementById("busquedaLote").value.toLowerCase();
    cargarLotesPorVencer();
}

function abrirModalLotes(productoId) {

    const modal = document.getElementById("modalLotes");
    const lista = document.getElementById("listaModalLotes");

    modal.style.display = "flex";
    lista.innerHTML = "Cargando...";

    fetch(`http://localhost:8080/lotes/producto/${productoId}`)
        .then(res => res.json())
        .then(data => {

            const lotesValidos = data
                .filter(l =>
                    l.cantidad > 0 &&
                    l.diasRestantes >= 0
                )
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
                                <th>Días</th>

                                ${usuario.rol === "ADMIN"
                        ? "<th>Acciones</th>"
                        : ""}
                            </tr>
                        </thead>

                        <tbody>
                `;

                pagina.forEach(lote => {

                    let clase = "";

                    if (lote.alerta === "URGENTE") {
                        clase = "lote-urgente";
                    }
                    else if (lote.alerta === "ATENCION") {
                        clase = "lote-atencion";
                    }

                    html += `
                        <tr class="${clase}">
                            <td>${lote.numeroLote}</td>
                            <td>${lote.cantidad}</td>
                            <td>${lote.fechaVencimiento}</td>
                            <td>${lote.diasRestantes}</td>

                            ${usuario.rol === "ADMIN"
                            ? `
                                    <td>
                                        <button
                                            class="btn-eliminar-lote"
                                            onclick="eliminarLote(${lote.id}, ${productoId})">
                                            Eliminar
                                        </button>
                                    </td>
                                `
                            : ""}
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

function eliminarLote(loteId, productoId) {

    if (!confirm("¿Eliminar lote?")) {
        return;
    }

    fetch(`http://localhost:8080/lotes/${loteId}`, {
        method: "DELETE"
    })
        .then(() => {

            alert("Lote eliminado");

            abrirModalLotes(productoId);

            cargarStock();
            cargarLotesPorVencer();
        })
        .catch(() => {
            alert("Error eliminando lote");
        });
}