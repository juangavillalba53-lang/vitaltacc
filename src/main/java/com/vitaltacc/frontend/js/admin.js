const usuario = JSON.parse(localStorage.getItem("usuario"));

document.addEventListener("DOMContentLoaded", () => {

    // Solo entra el personal con sesión iniciada
    if (!usuario) {
        window.location.href = "login.html";
        return;
    }

    if (usuario.rol !== "ADMIN" && usuario.rol !== "EMPLEADO") {
        window.location.href = "index.html";
        return;
    }

    aplicarPermisos();

    if (usuario.rol !== "ADMIN") {
        document.querySelectorAll(".solo-admin").forEach(el => el.remove());
    }

    // Cargas iniciales (el dashboard se carga al mostrar su sección)
    programarActualizacionDashboard();
    cargarProductos();
    cargarTiposCategoria();

    if (usuario.rol === "ADMIN") {
        cargarUsuarios();
        cargarPromociones();
    }

    mostrarSeccion("adminDashboard");

    document.getElementById("productoLote").addEventListener("change", mostrarPrecioLote);

    mostrarPanel("producto");

    document.getElementById("tipoCategoriaProducto")
        .addEventListener("change", function () {

            cargarCategoriasPorTipo(this.value);

        });

    document.getElementById("tipoClienteVenta")
        .addEventListener("change", cambiarTipoCliente);

    cambiarTipoCliente();

});

function mostrarPanel(panel) {

    document
        .querySelectorAll(".panel-admin")
        .forEach(p => {
            p.classList.remove("activo");
        });

    document
        .getElementById(`panel-${panel}`)
        .classList.add("activo");

    document
        .querySelectorAll(".tabs-admin [data-panel]")
        .forEach(tab => {
            tab.classList.toggle("activo", tab.dataset.panel === panel);
        });
}


function mostrarSeccion(id) {
    const usuarioActual = JSON.parse(localStorage.getItem("usuario"));

    if (!usuarioActual) {
        window.location.href = "login.html";
        return;
    }


    const seccionesSoloAdmin = [
        "adminReportes",
        "adminPromociones",
        "adminUsuarios",
        "adminAuditoria"
    ];


    if (
        usuarioActual.rol !== "ADMIN" &&
        seccionesSoloAdmin.includes(id)
    ) {
        mostrarAviso("No tenés permisos para acceder a esta sección.", "error");
        mostrarSeccion("adminDashboard");
        return;
    }

    document.querySelectorAll(".vista-admin").forEach(seccion => {
        seccion.style.display = "none";
    });

    const seccionActiva = document.getElementById(id);

    if (!seccionActiva) return;

    seccionActiva.style.display = "block";

    document.querySelectorAll(".menu-principal").forEach(boton => {
        boton.classList.remove("activo");
    });

    const botonActivo = document.querySelector(
        `.menu-principal[data-seccion="${id}"]`
    );

    if (botonActivo) {
        botonActivo.classList.add("activo");

        moverIndicadorMenu(botonActivo);
    }

    window.scrollTo({ top: 0 });

    if (id === "adminDashboard") {
        cargarDashboard();
    }

    if (id === "adminHistorialVentas") {
        cargarHistorialVentas();
    }

    if (id === "adminPedidos") {
        cargarPedidos();
    }

    if (id === "adminReportes") {
        cargarGeneral();
        cargarCierreCaja();
    }

    if (id === "adminAuditoria") {
        abrirAuditoria();
    }
}

function cargarDashboard() {

    const seguro = promesa => promesa.catch(() => null);

    Promise.all([
        seguro(pedir("/productos")),
        seguro(pedir("/usuarios")),
        seguro(pedir("/promociones/activas")),
        seguro(pedir("/lotes")),
        seguro(pedir("/lotes/por-vencer")),
        seguro(pedir("/lotes/vencidos")),
        seguro(pedir("/configuracion")),
        seguro(pedir("/pedidos/resumen"))
    ]).then(([productos, usuarios, promociones, lotes, porVencer, vencidos, config, pedidos]) => {

        if (pedidos) {
            mostrarContadorPedidos(pedidos.activos);
        }

        if (productos) {
            ponerTexto(document.getElementById("dashboardProductos"), productos.length);
        }

        if (usuarios) {
            const equipo = usuarios.filter(u => u.rol === "ADMIN" || u.rol === "EMPLEADO");
            ponerTexto(document.getElementById("dashboardUsuarios"), equipo.length);
        }

        if (promociones) {
            ponerTexto(document.getElementById("dashboardPromociones"), promociones.length);
        }

        if (lotes) {
            const lotesActivos = lotes.filter(l => l.cantidad > 0 && diasHasta(l.fechaVencimiento) >= 0);
            ponerTexto(document.getElementById("dashboardLotes"), lotesActivos.length);
        }

        // Los contadores de vencimientos se muestran en el Dashboard y en Inventario
        if (porVencer) {
            const urgentes = porVencer.filter(l => l.alerta === "URGENTE").length;
            const atencion = porVencer.filter(l => l.alerta === "ATENCION").length;
            const proximos = porVencer.filter(l => l.alerta === "OK").length;

            ponerTexto(document.getElementById("totalUrgentes"), urgentes);
            ponerTexto(document.getElementById("totalAtencion"), atencion);
            ponerTexto(document.getElementById("cantidadUrgentes"), urgentes);
            ponerTexto(document.getElementById("cantidadAtencion"), atencion);
            ponerTexto(document.getElementById("totalProximos"), proximos);
            ponerTexto(document.getElementById("cantidadProximos"), proximos);
            renderProximosVencimientos(porVencer);
        }

        if (vencidos) {
            ponerTexto(document.getElementById("cantidadVencidos"), vencidos.length);
            renderVencidosDashboard(vencidos);
        }

        if (productos) {
            limiteStockBajo = Number(config?.stockBajo ?? 5);
            renderStockBajo(productos, limiteStockBajo);
        }
    });
}

function renderProximosVencimientos(lotes) {

    const lista = document.getElementById("dashboardProximos");

    if (!lista) return;

    const proximos = [...lotes]
        .sort((a, b) => a.diasRestantes - b.diasRestantes)
        .slice(0, 5);

    // Si no cambió nada desde la última vez, no se vuelve a dibujar (así no parpadea)
    const firma = JSON.stringify(proximos.map(l => [l.id, l.cantidad, l.diasRestantes]));
    if (lista.dataset.firma === firma) return;
    lista.dataset.firma = firma;

    if (proximos.length === 0) {
        lista.innerHTML = `<li class="vacio">No hay lotes con stock por vencer.</li>`;
        return;
    }

    lista.innerHTML = proximos.map(lote => {
        const dias = Number(lote.diasRestantes);
        return `
            <li>
                <span class="proximo-nombre">
                    <strong>${escaparHTML(lote.producto || "Lote " + lote.numeroLote)}</strong>
                    <small>Lote ${escaparHTML(lote.numeroLote ?? "-")} · ${lote.cantidad} u.</small>
                </span>
                <span class="proximo-dias ${nivelVencimiento(dias)}">
                    ${dias <= 0 ? "Vence hoy" : dias === 1 ? "1 día" : dias + " días"}
                </span>
            </li>`;
    }).join("");
}

// Lotes vencidos con unidades: hay que sacarlos del local
function renderVencidosDashboard(vencidos) {

    const lista = document.getElementById("dashboardVencidos");
    const panel = document.getElementById("panelVencidos");

    if (!lista) return;

    ponerTexto(document.getElementById("totalVencidos"), vencidos.length);
    panel?.classList.toggle("con-alerta", vencidos.length > 0);

    const firma = JSON.stringify(vencidos.map(l => [l.id, l.cantidad]));
    if (lista.dataset.firma === firma) return;
    lista.dataset.firma = firma;

    if (!vencidos.length) {
        lista.innerHTML = `<li class="vacio">No hay productos vencidos en el local.</li>`;
        return;
    }

    lista.innerHTML = [...vencidos]
        .sort((a, b) => a.diasRestantes - b.diasRestantes)
        .map(lote => `
            <li>
                <span class="proximo-nombre">
                    <strong>${escaparHTML(lote.producto)}</strong>
                    <small>Lote ${escaparHTML(lote.numeroLote)} · ${lote.cantidad} u. · venció el ${fechaCorta(lote.fechaVencimiento)}</small>
                </span>
                <button type="button" class="btn-tabla btn-retirar"
                    onclick="retirarLote(${lote.id}, ${lote.productoId}, '${escaparHTML(lote.numeroLote)}')">
                    Retirar
                </button>
            </li>`)
        .join("");
}

// Productos que se están quedando sin stock (el límite se elige en Configuración)
function renderStockBajo(productos, limite) {

    const lista = document.getElementById("dashboardStockBajo");

    if (!lista) return;

    const bajos = productos
        .filter(p => (Number(p.stock) || 0) <= limite)
        .sort((a, b) => (Number(a.stock) || 0) - (Number(b.stock) || 0));

    ponerTexto(document.getElementById("totalStockBajo"), bajos.length);
    document.getElementById("panelStockBajo")?.classList.toggle("con-alerta", bajos.length > 0);

    const visibles = bajos.slice(0, 6);
    const firma = JSON.stringify([limite, bajos.length, visibles.map(p => [p.id, p.stock])]);
    if (lista.dataset.firma === firma) return;
    lista.dataset.firma = firma;

    if (!bajos.length) {
        lista.innerHTML = `<li class="vacio">Todos los productos tienen stock suficiente.</li>`;
        return;
    }

    lista.innerHTML = visibles.map(p => {
        const stock = Number(p.stock) || 0;
        return `
            <li>
                <span class="proximo-nombre">
                    <strong>${escaparHTML(p.nombre)}</strong>
                    <small>${stock === 0 ? "Sin stock" : stock === 1 ? "Queda 1 unidad" : `Quedan ${stock} unidades`}</small>
                </span>
                <button type="button" class="btn-tabla btn-lotes" onclick="irACargarLote(${p.id})">
                    Cargar lote
                </button>
            </li>`;
    }).join("") + (bajos.length > visibles.length
        ? `<li class="vacio">Y ${bajos.length - visibles.length} más en Inventario.</li>`
        : "");
}

// Lleva al formulario de lotes con el producto ya elegido
function irACargarLote(productoId) {
    mostrarSeccion("adminProductos");
    mostrarPanel("lote");
    const select = document.getElementById("productoLote");
    if (select) {
        select.value = String(productoId);
        select.dispatchEvent(new Event("change"));
    }
}


// Cambia el texto solo si el valor es distinto (así no parpadea)
function ponerTexto(elemento, valor) {
    if (!elemento) return;
    const texto = String(valor);
    if (elemento.textContent !== texto) elemento.textContent = texto;
}

function programarActualizacionDashboard() {

    const actualizarSiSeVe = () => {
        if (!document.hidden) cargarDashboard();
    };

    setInterval(actualizarSiSeVe, 30000);

    document.addEventListener("visibilitychange", actualizarSiSeVe);
    window.addEventListener("focus", actualizarSiSeVe);
}
