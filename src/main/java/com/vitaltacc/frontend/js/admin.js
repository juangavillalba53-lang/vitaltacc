const usuario = JSON.parse(localStorage.getItem("usuario"));



document.addEventListener("DOMContentLoaded", () => {

    // 🔒 VALIDAR LOGIN
    if (!usuario) {
        window.location.href = "login.html";
        return;
    }

    if (usuario.rol !== "ADMIN" && usuario.rol !== "EMPLEADO") {
        alert("No tenés permisos para entrar acá");
        window.location.href = "index.html";
        return;
    }

    aplicarPermisos();

    if (usuario.rol !== "ADMIN") {
        document.querySelectorAll(".solo-admin").forEach(el => el.remove());
    }

    // 🔥 CARGAS INICIALES
    cargarDashboard();
    programarActualizacionDashboard();
    cargarProductos();
    cargarLotesPorVencer();
    cargarUsuarios();
    cargarStock();
    mostrarUsuario();
    cargarPromociones();
    cargarProductosVenta();
    cargarTiposCategoria();

    // 🔥 Mostrar Dashboard al iniciar
    mostrarSeccion("adminDashboard");

    const select = document.getElementById("productoLote");

    if (select) {

        select.addEventListener("change", function () {

            const selected = this.options[this.selectedIndex];
            const precio = selected.getAttribute("data-precio");

            document.getElementById("precioLote").value = "$" + precio;

        });

    }

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

// ===============================
// NAVEGACIÓN DEL PANEL
// ===============================


function mostrarSeccion(id) {
    const usuarioActual = JSON.parse(localStorage.getItem("usuario"));

    if (!usuarioActual) {
        window.location.href = "login.html";
        return;
    }


    const seccionesSoloAdmin = [
        "adminReportes",
        "adminPromociones",
        "adminUsuarios"
    ];


    if (
        usuarioActual.rol !== "ADMIN" &&
        seccionesSoloAdmin.includes(id)
    ) {
        alert("No tenés permisos para acceder a esta sección.");
        mostrarSeccion("adminDashboard");
        return;
    }

    document.querySelectorAll(".vista-admin").forEach(seccion => {
        seccion.style.display = "none";
    });

    const seccionActiva = document.getElementById(id);

    if (!seccionActiva) {
        console.error("No se encontró la sección:", id);
        return;
    }

    seccionActiva.style.display = "block";

    document.querySelectorAll(".menu-principal").forEach(boton => {
        boton.classList.remove("activo");
    });

    const botonActivo = document.querySelector(
        `.menu-principal[data-seccion="${id}"]`
    );

    if (botonActivo) {
        botonActivo.classList.add("activo");

        if (typeof moverIndicadorMenu === "function") {
            moverIndicadorMenu(botonActivo);
        }
    }

    window.scrollTo({ top: 0 });

    if (id === "adminDashboard" && typeof cargarDashboard === "function") {
        cargarDashboard();
    }

    if (id === "adminHistorialVentas") {
        cargarHistorialVentas();
    }

    if (id === "adminReportes") {
        if (typeof cargarGeneral === "function") {
            cargarGeneral();
        }

        if (typeof cargarCierreCaja === "function") {
            cargarCierreCaja();
        }
    }
}

// ===============================
// DASHBOARD
// ===============================

function cargarDashboard() {

    const seguro = promesa => promesa.catch(() => null);

    Promise.all([
        seguro(pedir("/productos")),
        seguro(pedir("/usuarios")),
        seguro(pedir("/promociones/activas")),
        seguro(pedir("/lotes")),
        seguro(pedir("/lotes/por-vencer")),
        seguro(pedir("/lotes/vencidos")),
        seguro(pedir("/configuracion"))
    ]).then(([productos, usuarios, promociones, lotes, porVencer, vencidos, config]) => {

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
            ponerTexto(document.getElementById("totalMonitoreados"), lotesActivos.length);
        }

        if (porVencer) {
            ponerTexto(document.getElementById("totalUrgentes"), porVencer.filter(l => l.alerta === "URGENTE").length);
            ponerTexto(document.getElementById("totalAtencion"), porVencer.filter(l => l.alerta === "ATENCION").length);
            renderProximosVencimientos(porVencer);
        }

        if (vencidos) {
            renderVencidosDashboard(vencidos);
        }

        if (productos) {
            renderStockBajo(productos, Number(config?.stockBajo ?? 5));
        }
    });
}

// ===============================
// DASHBOARD: PRÓXIMOS VENCIMIENTOS
// ===============================

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
    ponerTexto(document.getElementById("ayudaStockBajo"),
        `Productos con ${limite} ${limite === 1 ? "unidad" : "unidades"} o menos.`);
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


// ===============================
// ACTUALIZACIÓN AUTOMÁTICA DEL DASHBOARD
// ===============================

// Cambia el texto solo si el valor es distinto (así no parpadea)
function ponerTexto(elemento, valor) {
    if (!elemento) return;
    const texto = String(valor);
    if (elemento.textContent !== texto) elemento.textContent = texto;
}

// Se actualiza:
// - al volver a la pestaña o a la ventana del panel,
// - al entrar al Dashboard desde el menú,
// - y cada 30 segundos, solo mientras la pestaña está a la vista.
function programarActualizacionDashboard() {

    const actualizarSiSeVe = () => {
        if (!document.hidden) cargarDashboard();
    };

    setInterval(actualizarSiSeVe, 30000);

    document.addEventListener("visibilitychange", actualizarSiSeVe);
    window.addEventListener("focus", actualizarSiSeVe);
}
