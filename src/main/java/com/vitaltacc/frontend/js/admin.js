const usuario = JSON.parse(localStorage.getItem("usuario"));


console.log("VERSION NUEVA");

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

    console.log("Usuario logueado:", usuario);

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

    // Productos
    fetch("http://localhost:8080/productos")
        .then(res => res.json())
        .then(data => {

            ponerTexto(document.getElementById("dashboardProductos"), data.length);

        });

    // Usuarios
    fetch("http://localhost:8080/usuarios")
        .then(res => res.json())
        .then(data => {

            const usuariosInternos = data.filter(
                u => u.rol === "ADMIN" || u.rol === "EMPLEADO"
            );

            ponerTexto(document.getElementById("dashboardUsuarios"), usuariosInternos.length);

        });

    // Promociones
    fetch("http://localhost:8080/promociones")
        .then(res => res.json())
        .then(data => {

            ponerTexto(document.getElementById("dashboardPromociones"), data.length);

        });

    // Lotes + Alertas
    fetch("http://localhost:8080/lotes")
        .then(res => res.json())
        .then(data => {

            const hoy = new Date();

            const lotesActivos = data.filter(lote =>
                lote.cantidad > 0 &&
                new Date(lote.fechaVencimiento) >= hoy
            );

            ponerTexto(document.getElementById("dashboardLotes"), lotesActivos.length);

            let urgentes = 0;
            let atencion = 0;

            lotesActivos.forEach(lote => {

                const vencimiento = new Date(lote.fechaVencimiento);

                const dias =
                    Math.ceil(
                        (vencimiento - hoy) /
                        (1000 * 60 * 60 * 24)
                    );

                if (dias <= 15) {
                    urgentes++;
                }
                else if (dias > 15 && dias <= 20) {
                    atencion++;
                }

            });

            const urgentesEl =
                document.getElementById("totalUrgentes");

            const atencionEl =
                document.getElementById("totalAtencion");

            const monitoreadosEl =
                document.getElementById("totalMonitoreados");

            ponerTexto(urgentesEl, urgentes);
            ponerTexto(atencionEl, atencion);
            ponerTexto(monitoreadosEl, lotesActivos.length);

            renderProximosVencimientos(lotesActivos, hoy);

        });

}

// ===============================
// DASHBOARD: PRÓXIMOS VENCIMIENTOS
// ===============================

function renderProximosVencimientos(lotes, hoy) {

    const lista = document.getElementById("dashboardProximos");

    if (!lista) return;

    // Si no cambió nada desde la última vez, no se vuelve a dibujar
    const firma = JSON.stringify(
        [...lotes]
            .sort((a, b) => new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento))
            .slice(0, 5)
            .map(l => [l.id, l.numeroLote, l.cantidad, l.fechaVencimiento])
    );

    if (lista.dataset.firma === firma) return;
    lista.dataset.firma = firma;

    const proximos = [...lotes]
        .sort((a, b) =>
            new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento)
        )
        .slice(0, 5);

    if (proximos.length === 0) {
        lista.innerHTML = `<li class="vacio">No hay lotes con stock por vencer.</li>`;
        return;
    }

    lista.innerHTML = "";

    proximos.forEach(lote => {

        const dias = Math.ceil(
            (new Date(lote.fechaVencimiento) - hoy) / (1000 * 60 * 60 * 24)
        );

        const nombre =
            lote.producto?.nombre ||
            lote.nombreProducto ||
            lote.productoNombre ||
            `Lote ${lote.numeroLote}`;

        const nivel = dias <= 15 ? "urgente" : dias <= 20 ? "atencion" : "ok";

        const li = document.createElement("li");

        li.innerHTML = `
            <span class="proximo-nombre">
                <strong></strong>
                <small>Lote ${lote.numeroLote ?? "-"} · ${lote.cantidad} u.</small>
            </span>
            <span class="proximo-dias ${nivel}">
                ${dias <= 0 ? "Vence hoy" : dias === 1 ? "1 día" : dias + " días"}
            </span>
        `;

        li.querySelector("strong").textContent = nombre;

        lista.appendChild(li);
    });
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
