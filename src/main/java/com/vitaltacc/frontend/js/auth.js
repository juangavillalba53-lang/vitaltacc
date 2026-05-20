function mostrarUsuario() {

    const usuario = JSON.parse(localStorage.getItem("usuario"));

    const navUser = document.getElementById("nav-user");

    if (!navUser) return;

    // INVITADO
    if (!usuario) {

        navUser.innerHTML = `
            <a href="login.html" class="btn-nav">
                Iniciar sesión
            </a>
        `;

        return;
    }

    // ADMIN / EMPLEADO
    if (
        usuario.rol === "ADMIN" ||
        usuario.rol === "EMPLEADO"
    ) {

        navUser.innerHTML = `
            <span>
                Hola, ${usuario.nombre}
            </span>

            <button class="btn-nav" onclick="irPanel()">
                Panel
            </button>

            <button class="btn-nav" onclick="logout()">
                Cerrar sesión
            </button>
        `;
    }

    // CLIENTE
    else {

        navUser.innerHTML = `
            <span>
                Hola, ${usuario.nombre}
            </span>

            <button class="btn-nav" onclick="logout()">
                Cerrar sesión
            </button>
        `;
    }
}

function logout() {

    localStorage.removeItem("usuario");

    window.location.href = "index.html";
}

function irPanel() {

    const usuario = JSON.parse(localStorage.getItem("usuario"));

    if (!usuario) return;

    if (
        usuario.rol === "ADMIN" ||
        usuario.rol === "EMPLEADO"
    ) {

        window.location.href = "admin.html";
    }
}

mostrarUsuario();

const usuarioLogueado = JSON.parse(localStorage.getItem("usuario"));

const btnRegistro = document.getElementById("btnRegistro");

if (usuarioLogueado && btnRegistro) {

    btnRegistro.style.display = "none";
}