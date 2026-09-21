function aplicarPermisos() {

    if (usuario.rol === "EMPLEADO") {

        const reportes =
            document.getElementById("adminReportes");

        const promociones =
            document.getElementById("adminPromociones");

        const usuarios =
            document.getElementById("adminUsuarios");

        if (reportes) {
            reportes.style.display = "none";
        }

        if (promociones) {
            promociones.style.display = "none";
        }

        if (usuarios) {
            usuarios.style.display = "none";
        }
    }
}

function cargarUsuarios() {

    fetch("http://localhost:8080/usuarios")
        .then(res => res.json())
        .then(data => {

            const tabla = document.getElementById("tablaUsuarios");

            if (!tabla) return;

            tabla.innerHTML = "";

            data.forEach(user => {

                if (user.rol === "CLIENTE") return;

                const tr = document.createElement("tr");

                tr.innerHTML = `
                    <td>${user.id}</td>
                    <td>${user.nombre} ${user.apellido}</td>
                    <td>${user.email}</td>

                    <td>
                        <select onchange="cambiarRol(${user.id}, this.value)">
                            <option value="EMPLEADO" ${user.rol === "EMPLEADO" ? "selected" : ""}>EMPLEADO</option>
                            <option value="ADMIN" ${user.rol === "ADMIN" ? "selected" : ""}>ADMIN</option>
                        </select>
                    </td>

                    <td>
                        <button onclick="eliminarUsuario(${user.id})">
                            Eliminar
                        </button>
                    </td>
                `;

                tabla.appendChild(tr);
            });
        });
}

function crearUsuario() {

    const nombre = document.getElementById("nombreUsuario").value;
    const apellido = document.getElementById("apellidoUsuario").value;
    const dni = document.getElementById("dniUsuario").value;
    const email = document.getElementById("emailUsuario").value;
    const contrasena = document.getElementById("contrasenaUsuario").value;
    const rol = document.getElementById("rolUsuario").value;

    if (
        !nombre ||
        !apellido ||
        !dni ||
        !email ||
        !contrasena
    ) {
        alert("Completar todos los campos");
        return;
    }

    console.log({
        nombre,
        apellido,
        dni,
        email,
        contrasena,
        rol
    });

    fetch("http://localhost:8080/usuarios", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            nombre,
            apellido,
            dni,
            email,
            contrasena,
            rol
        })
    })
        .then(res => {
            if (!res.ok) throw new Error();
            return res.json();
        })
        .then(() => {

            alert("Usuario creado");

            document.getElementById("nombreUsuario").value = "";
            document.getElementById("apellidoUsuario").value = "";
            document.getElementById("dniUsuario").value = "";
            document.getElementById("emailUsuario").value = "";
            document.getElementById("contrasenaUsuario").value = "";

            document.getElementById("rolUsuario").value = "EMPLEADO";

            cargarUsuarios();
        })
        .catch(() => {
            alert("Error creando usuario");
        });
}

function cambiarRol(id, rol) {

    fetch(`http://localhost:8080/usuarios/${id}/rol`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ rol })
    })
        .then(() => {
            alert("Rol actualizado");
        })
        .catch(() => {
            alert("Error actualizando rol");
        });
}

function eliminarUsuario(id) {

    if (!confirm("¿Eliminar usuario?")) return;

    fetch(`http://localhost:8080/usuarios/${id}`, {
        method: "DELETE"
    })
        .then(() => {
            alert("Usuario eliminado");
            cargarUsuarios();
        })
        .catch(() => {
            alert("Error eliminando usuario");
        });
}

function mostrarUsuario() {

    const usuario = JSON.parse(localStorage.getItem("usuario"));

    const navUser = document.getElementById("nav-user");

    if (!navUser) return;

    navUser.innerHTML = `
        <span>
            Hola, ${usuario.nombre}
        </span>

        <button class="btn-nav" onclick="irTienda()">
            Tienda
        </button>

        <button class="btn-nav" onclick="logout()">
            Cerrar sesión
        </button>
    `;
}

function logout() {

    localStorage.removeItem("usuario");

    window.location.href = "login.html";
}

function irTienda() {
    window.location.href = "index.html";
}