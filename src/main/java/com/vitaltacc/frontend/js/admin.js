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

            document.getElementById("dashboardUsuarios").innerText = data.length;

        });

    // Promociones
    fetch("http://localhost:8080/promociones")
        .then(res => res.json())
        .then(data => {

            document.getElementById("dashboardPromociones").innerText = data.length;

        });

    // Lotes
    fetch("http://localhost:8080/lotes")
        .then(res => res.json())
        .then(data => {

            document.getElementById("dashboardLotes").innerText = data.length;

        });

}

