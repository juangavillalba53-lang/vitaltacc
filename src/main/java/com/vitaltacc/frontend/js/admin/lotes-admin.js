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
        .then(res => res.json())
        .then(data => {

            const lista = document.getElementById("lotesVencer");

            const urgentes =
                data.filter(l => l.alerta === "URGENTE").length;

            const atencion =
                data.filter(l => l.alerta === "ATENCION").length;

            document.getElementById("cantidadUrgentes").innerText =
                urgentes;

            document.getElementById("cantidadAtencion").innerText =
                atencion;

            document.getElementById("cantidadMonitoreados").innerText =
                data.length;

            if (data.length === 0) {
                lista.innerHTML = "<li>No hay lotes próximos a vencer</li>";
                return;
            }

            // 🔥 ordenar por urgencia
            data.sort((a, b) => a.diasRestantes - b.diasRestantes);

            // 🔥 aplicar filtro primero
            let filtrados;

            if (filtroActual === "URGENTE") {
                filtrados = data.filter(l => l.alerta === "URGENTE");
            } else if (filtroActual === "ATENCION") {
                filtrados = data.filter(l => l.alerta === "ATENCION");
            } else {
                filtrados = data;
            }

            // 🔍 aplicar búsqueda DESPUÉS
            if (textoBusqueda) {
                filtrados = filtrados.filter(l =>
                    (l.producto || "").toLowerCase().includes(textoBusqueda) ||
                    (l.numeroLote || "").toLowerCase().includes(textoBusqueda)
                );
            }

            let paginaActual = 1;
            const lotesPorPagina = 5;

            function renderLista() {

                lista.innerHTML = "";

                const inicio = (paginaActual - 1) * lotesPorPagina;
                const fin = inicio + lotesPorPagina;

                const datos = filtrados.slice(inicio, fin);

                datos.forEach(lote => {

                    const li = document.createElement("li");

                    li.innerText =
                        `${lote.producto} - Lote ${lote.numeroLote} - Vence en ${lote.diasRestantes} días`;

                    if (lote.alerta === "URGENTE") {
                        li.className = "lote-urgente";
                    } else if (lote.alerta === "ATENCION") {
                        li.className = "lote-atencion";
                    } else {
                        li.className = "lote-ok";
                    }

                    lista.appendChild(li);
                });

                const totalPaginas =
                    Math.ceil(filtrados.length / lotesPorPagina);

                if (totalPaginas > 1) {

                    const paginacion = document.createElement("div");
                    paginacion.className = "paginacion-lotes";

                    paginacion.innerHTML = `
                        <button ${paginaActual === 1 ? "disabled" : ""}>
                            Anterior
                        </button>

                        <span>
                            Página ${paginaActual} de ${totalPaginas}
                        </span>

                        <button ${paginaActual === totalPaginas ? "disabled" : ""}>
                            Siguiente
                        </button>
                    `;

                    const botones = paginacion.querySelectorAll("button");

                    botones[0].onclick = () => {
                        paginaActual--;
                        renderLista();
                    };

                    botones[1].onclick = () => {
                        paginaActual++;
                        renderLista();
                    };

                    lista.appendChild(paginacion);
                }
            }

            renderLista();

        })
        .catch(error => {
            console.error("ERROR REAL:", error);
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

            console.log(data);

            const lotesValidos = data.filter(l =>
                l.cantidad > 0 &&
                l.diasRestantes >= 0
            );

            if (lotesValidos.length === 0) {

                lista.innerHTML = `
                    <p>No hay lotes disponibles</p>
                `;

                return;
            }

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
                    : ""
                }
                        </tr>
                    </thead>

                    <tbody>
            `;

            lotesValidos.forEach(lote => {

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
                        : ""
                    }
                    </tr>
                `;
            });

            html += `
                    </tbody>

                </table>
            `;

            lista.innerHTML = html;
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