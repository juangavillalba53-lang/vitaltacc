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

    // 🔥 CARGAS INICIALES
    cargarDashboard();
    setInterval(cargarDashboard, 10000);
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
}

// ===============================
// NAVEGACIÓN DEL PANEL
// ===============================

function mostrarSeccion(id) {

    // Ocultar todas las vistas
    document.querySelectorAll(".vista-admin").forEach(seccion => {
        seccion.style.display = "none";
    });

    // Mostrar la vista elegida
    document.getElementById(id).style.display = "block";

    // Quitar el activo de todos
    document.querySelectorAll(".menu-principal").forEach(boton => {
        boton.classList.remove("activo");
    });

    // Marcar el botón seleccionado
    const botonActivo = document.querySelector(
        `.menu-principal[data-seccion="${id}"]`
    );

    if (botonActivo) {
        botonActivo.classList.add("activo");
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

            document.getElementById("dashboardProductos").innerText = data.length;

        });

    // Usuarios
    fetch("http://localhost:8080/usuarios")
        .then(res => res.json())
        .then(data => {

            const usuariosInternos = data.filter(
                u => u.rol === "ADMIN" || u.rol === "EMPLEADO"
            );

            document.getElementById("dashboardUsuarios").innerText =
                usuariosInternos.length;

        });

    // Promociones
    fetch("http://localhost:8080/promociones")
        .then(res => res.json())
        .then(data => {

            document.getElementById("dashboardPromociones").innerText = data.length;

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

            document.getElementById("dashboardLotes").innerText =
                lotesActivos.length;

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

            if (urgentesEl) urgentesEl.innerText = urgentes;
            if (atencionEl) atencionEl.innerText = atencion;
            if (monitoreadosEl)
                monitoreadosEl.innerText = lotesActivos.length;

        });

}