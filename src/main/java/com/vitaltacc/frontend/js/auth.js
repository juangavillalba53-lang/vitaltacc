function mostrarUsuario() {

    const usuario =
        JSON.parse(localStorage.getItem("usuario"));

    const navUser =
        document.getElementById("nav-user");

    const navbarActions =
        document.getElementById("navbar-actions");

    // LIMPIAR

    if (navUser) {
        navUser.innerHTML = "";
    }

    if (navbarActions) {
        navbarActions.innerHTML = "";
    }

    // =========================
    // INVITADO
    // =========================

    if (!usuario) {

        if (navUser) {

            navUser.innerHTML = `

                <a href="login.html" class="menu-link">

                    <i class="fa-regular fa-user"></i>

                    Iniciar sesión

                </a>

            `;
        }

        return;
    }

    // =========================
    // PANEL SOLO ADMIN/EMPLEADO
    // =========================

    if (
        usuario.rol === "ADMIN" ||
        usuario.rol === "EMPLEADO"
    ) {

        if (navbarActions) {

            navbarActions.innerHTML = `

                <button
                    class="btn-nav"
                    onclick="irPanel()"
                >
                    Panel
                </button>

            `;
        }
    }

    // =========================
    // MENU ADMIN / EMPLEADO
    // =========================

    if (navUser && (
        usuario.rol === "ADMIN" ||
        usuario.rol === "EMPLEADO"
    )) {

        navUser.innerHTML = `

            <p class="menu-user">

                Hola, ${usuario.nombre} 👋

            </p>

            <a href="#" class="menu-link">

                <i class="fa-regular fa-user"></i>

                Mi cuenta

            </a>

            <button
                class="menu-link logout-link"
                onclick="logout()"
            >

                <i class="fa-solid fa-right-from-bracket"></i>

                Cerrar sesión

            </button>

        `;

        return;
    }

    // MENU CLIENTE

    if (navUser) {

        navUser.innerHTML = `

            <p class="menu-user">

                Hola, ${usuario.nombre} 👋

            </p>

            <a href="#" class="menu-link">

                <i class="fa-regular fa-user"></i>

                Mi cuenta

            </a>

            <a href="#" class="menu-link">

                <i class="fa-solid fa-box"></i>

                Mis pedidos

            </a>

            <a href="#" class="menu-link">

                <i class="fa-regular fa-circle-question"></i>

                Preguntas frecuentes

            </a>

            <a href="#" class="menu-link">

                <i class="fa-regular fa-envelope"></i>

                Contacto

            </a>

            <button
                class="menu-link logout-link"
                onclick="logout()"
            >

                <i class="fa-solid fa-right-from-bracket"></i>

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

    const usuario =
        JSON.parse(localStorage.getItem("usuario"));

    if (!usuario) return;

    if (
        usuario.rol === "ADMIN" ||
        usuario.rol === "EMPLEADO"
    ) {

        window.location.href = "admin.html";
    }
}

mostrarUsuario();