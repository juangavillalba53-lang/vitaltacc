function mostrarPestana(cual) {
    const ingresar = cual === "ingresar";

    document.getElementById("tabIngresar").setAttribute("aria-selected", String(ingresar));
    document.getElementById("tabRegistro").setAttribute("aria-selected", String(!ingresar));
    document.getElementById("formIngresar").hidden = !ingresar;
    document.getElementById("formRegistro").hidden = ingresar;

    history.replaceState(null, "", ingresar ? "login.html" : "login.html#registro");
}

function mensaje(id, texto, tipo = "error") {
    const el = document.getElementById(id);
    el.textContent = texto;
    el.className = `mensaje-formulario ${texto ? tipo : ""}`;
}

function marcarInvalido(input, invalido) {
    input.setAttribute("aria-invalid", String(invalido));
}

// A dónde volver después de ingresar (por ejemplo, al checkout)
function destinoDespuesDeIngresar(usuario) {
    if (esPersonal(usuario)) return "admin.html";

    const volver = new URLSearchParams(location.search).get("volver");
    return volver && /^[a-z-]+\.html$/.test(volver) ? volver : "index.html";
}

async function contarComprasPrevias(usuario) {
    try {
        const respuesta = await fetch(`${API}/ventas/cliente/${usuario.id}`);
        if (!respuesta.ok) return 0;
        return (await respuesta.json()).length;
    } catch {
        return 0;
    }
}

async function ingresar(evento) {
    evento.preventDefault();

    const email = document.getElementById("loginEmail");
    const contrasena = document.getElementById("loginContrasena");
    const boton = evento.submitter || evento.target.querySelector("button[type=submit]");

    mensaje("mensajeIngresar", "");
    marcarInvalido(email, !email.value.trim());
    marcarInvalido(contrasena, !contrasena.value);

    if (!email.value.trim() || !contrasena.value) {
        mensaje("mensajeIngresar", "Completá tu email y tu contraseña.");
        return;
    }

    boton.disabled = true;
    boton.textContent = "Ingresando…";

    try {
        const respuesta = await fetch(`${API}/usuarios/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email.value.trim(), contrasena: contrasena.value })
        });

        if (!respuesta.ok) {
            throw new Error(await leerError(respuesta, "Email o contraseña incorrectos."));
        }

        const usuario = await respuesta.json();
        guardarSesion(usuario);
        window.location.href = destinoDespuesDeIngresar(usuario);

    } catch (error) {
        const texto = error.message === "Failed to fetch"
            ? "No pudimos conectarnos. Probá de nuevo en unos minutos."
            : error.message;

        mensaje("mensajeIngresar", texto);

        // Cuenta creada en el local: le mostramos cómo activarla
        if (/no está activada/i.test(texto)) {
            mostrarPestana("registro");
            mensaje("mensajeRegistro",
                "Tu cuenta se creó en el local. Completá tus datos con el mismo DNI para activarla.",
                "ok");
            document.getElementById("regDni").focus();
        }

        boton.disabled = false;
        boton.textContent = "Ingresar";
    }
}

async function registrarse(evento) {
    evento.preventDefault();

    const campo = id => document.getElementById(id);
    const datos = {
        nombre: campo("regNombre").value.trim(),
        apellido: campo("regApellido").value.trim(),
        dni: soloNumeros(campo("regDni").value),
        telefono: campo("regTelefono").value.trim(),
        email: campo("regEmail").value.trim().toLowerCase(),
        contrasena: campo("regContrasena").value,
        rol: "CLIENTE"
    };
    const repetir = campo("regContrasena2").value;
    const boton = evento.submitter || evento.target.querySelector("button[type=submit]");

    mensaje("mensajeRegistro", "");

    const errores = [];
    const validar = (id, invalido, texto) => {
        marcarInvalido(campo(id), invalido);
        if (invalido) errores.push(texto);
    };

    validar("regNombre", !datos.nombre, "tu nombre");
    validar("regApellido", !datos.apellido, "tu apellido");
    validar("regDni", datos.dni.length < 7 || datos.dni.length > 8, "un DNI de 7 u 8 números");
    validar("regEmail", !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email), "un email válido");
    validar("regContrasena", datos.contrasena.length < 8, "una contraseña de al menos 8 caracteres");

    if (errores.length) {
        mensaje("mensajeRegistro", `Revisá los datos: falta ${errores.join(", ")}.`);
        return;
    }

    if (datos.contrasena !== repetir) {
        marcarInvalido(campo("regContrasena2"), true);
        mensaje("mensajeRegistro", "Las contraseñas no coinciden.");
        return;
    }

    marcarInvalido(campo("regContrasena2"), false);

    boton.disabled = true;
    boton.textContent = "Creando tu cuenta…";

    try {
        const respuesta = await fetch(`${API}/usuarios`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        });

        if (!respuesta.ok) {
            throw new Error(await leerError(respuesta, "No pudimos crear tu cuenta."));
        }

        const usuario = await respuesta.json();
        guardarSesion(usuario);

        const compras = await contarComprasPrevias(usuario);

        if (compras > 0) {
            mensaje("mensajeRegistro",
                compras === 1
                    ? "Listo. Encontramos 1 compra que hiciste en el local y ya está en tu cuenta."
                    : `Listo. Encontramos ${compras} compras que hiciste en el local y ya están en tu cuenta.`,
                "ok");

            setTimeout(() => { window.location.href = "mis-compras.html"; }, 1800);
            return;
        }

        window.location.href = destinoDespuesDeIngresar(usuario);

    } catch (error) {
        const texto = error.message === "Failed to fetch"
            ? "No pudimos conectarnos. Probá de nuevo en unos minutos."
            : error.message;

        mensaje("mensajeRegistro", texto);

        if (/ya existe una cuenta/i.test(texto)) {
            document.getElementById("loginEmail").value = datos.email;
        }

        boton.disabled = false;
        boton.textContent = "Crear cuenta";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // Si ya inició sesión, no tiene sentido mostrar el formulario
    const usuario = obtenerUsuario();
    if (usuario) {
        window.location.replace(destinoDespuesDeIngresar(usuario));
        return;
    }

    document.getElementById("tabIngresar").addEventListener("click", () => mostrarPestana("ingresar"));
    document.getElementById("tabRegistro").addEventListener("click", () => mostrarPestana("registro"));
    document.getElementById("formIngresar").addEventListener("submit", ingresar);
    document.getElementById("formRegistro").addEventListener("submit", registrarse);

    // El DNI acepta puntos al tipear, pero se limpia al salir del campo
    document.getElementById("regDni").addEventListener("blur", e => {
        e.target.value = soloNumeros(e.target.value);
    });

    if (location.hash === "#registro") mostrarPestana("registro");
});
