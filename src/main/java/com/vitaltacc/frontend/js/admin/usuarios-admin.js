function aplicarPermisos() {
    const usuarioActual = JSON.parse(
        localStorage.getItem("usuario") || "null"
    );

    const esAdmin = usuarioActual?.rol === "ADMIN";

    const opcionesSoloAdmin = [
        "btnReportes",
        "btnPromociones",
        "btnUsuarios",
        "btnAuditoria"
    ];

    opcionesSoloAdmin.forEach(id => {
        const elemento = document.getElementById(id);

        if (elemento) {
            elemento.style.display = esAdmin ? "" : "none";
        }
    });

    // Configuración visible para ADMIN y EMPLEADO.
    const btnConfiguracion = document.getElementById("btnConfiguracion");

    if (btnConfiguracion) {
        btnConfiguracion.style.display = "";
    }
}


// Solo se listan admin y empleados: 5 por página
const USUARIOS_POR_PAGINA = 5;
let usuariosPersonal = [];
let paginaUsuarios = 1;

function cargarUsuarios() {

    pedir("/usuarios")
        .then(data => {
            usuariosPersonal = data.filter(user => user.rol !== "CLIENTE");
            renderUsuarios();
        })
        .catch(error => mostrarAviso("No se pudieron cargar los usuarios: " + error.message, "error"));
}

function renderUsuarios() {

    const tabla = document.getElementById("tablaUsuarios");

    if (!tabla) return;

    tabla.innerHTML = "";

    const { items, pagina, totalPaginas } =
        paginar(usuariosPersonal, paginaUsuarios, USUARIOS_POR_PAGINA);

    paginaUsuarios = pagina;

    items.forEach(user => {

        const tr = document.createElement("tr");

        // Uno no se puede dar de baja ni cambiar el rol a sí mismo
        const esUnoMismo = Number(user.id) === Number(usuario?.id);

        tr.innerHTML = `
            <td>${user.id}</td>
            <td>${escaparHTML(user.nombre)} ${escaparHTML(user.apellido)}${esUnoMismo ? ' <span class="etiqueta-vos">Vos</span>' : ""}</td>
            <td>${escaparHTML(user.email)}</td>

            <td>
                <select onchange="cambiarRol(${user.id}, this.value)" ${esUnoMismo ? "disabled" : ""} aria-label="Rol de ${escaparHTML(user.nombre)}">
                    <option value="EMPLEADO" ${user.rol === "EMPLEADO" ? "selected" : ""}>Empleado</option>
                    <option value="ADMIN" ${user.rol === "ADMIN" ? "selected" : ""}>Admin</option>
                </select>
            </td>

            <td>
                ${esUnoMismo ? "—" : `
                <button class="btn-tabla btn-eliminar" onclick="eliminarUsuario(${user.id})">
                    Dar de baja
                </button>`}
            </td>
        `;

        tabla.appendChild(tr);
    });

    dibujarPaginacion(
        document.getElementById("paginacionUsuarios"),
        pagina,
        totalPaginas,
        nueva => {
            paginaUsuarios = nueva;
            renderUsuarios();
        });
}

function crearUsuario() {

    const nombre = document.getElementById("nombreUsuario").value.trim();
    const apellido = document.getElementById("apellidoUsuario").value.trim();
    const dni = document.getElementById("dniUsuario").value.trim();
    const email = document.getElementById("emailUsuario").value.trim();
    const contrasena = document.getElementById("contrasenaUsuario").value;
    const rol = document.getElementById("rolUsuario").value;

    if (
        !nombre ||
        !apellido ||
        !dni ||
        !email ||
        !contrasena
    ) {
        mostrarAviso("Completá todos los datos del usuario.", "error");
        return;
    }

    pedir("/usuarios", {
        method: "POST",
        json: { nombre, apellido, dni, email, contrasena, rol }
    })
        .then(() => {

            mostrarAviso("Usuario creado.", "ok");

            document.getElementById("nombreUsuario").value = "";
            document.getElementById("apellidoUsuario").value = "";
            document.getElementById("dniUsuario").value = "";
            document.getElementById("emailUsuario").value = "";
            document.getElementById("contrasenaUsuario").value = "";

            document.getElementById("rolUsuario").value = "EMPLEADO";

            cargarUsuarios();
        })
        .catch(error => {
            mostrarAviso("No se pudo crear el usuario: " + error.message, "error");
        });
}

function cambiarRol(id, rol) {

    pedir(`/usuarios/${id}/rol`, { method: "PUT", json: { rol } })
        .then(() => {
            mostrarAviso("Rol actualizado.", "ok");
            cargarUsuarios();
        })
        .catch(error => {
            mostrarAviso(error.message, "error");
            cargarUsuarios(); // vuelve a mostrar el rol que tenía
        });
}

async function eliminarUsuario(id) {

    const nombre = textoDeFila("td:nth-child(2)");

    const seguro = await confirmar({
        titulo: "¿Dar de baja este usuario?",
        mensaje: (nombre ? `${nombre} ` : "Esta persona ") +
            "ya no va a poder entrar al panel. Las ventas que registró quedan guardadas.",
        aceptar: "Dar de baja"
    });

    if (!seguro) return;

    try {
        await pedir(`/usuarios/${id}`, { method: "DELETE" });
        mostrarAviso("Usuario dado de baja.", "ok");
        cargarUsuarios();
        cargarDashboard();
    } catch (error) {
        mostrarAviso(error.message, "error");
    }
}

// Cerrar sesión
function logout() {

    avisarCierreSesion();
    localStorage.removeItem("usuario");

    window.location.href = "login.html";
}

// Botón "Ver tienda" del menú
function irTienda() {
    window.location.href = "index.html";
}
