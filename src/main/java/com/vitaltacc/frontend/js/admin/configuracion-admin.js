
const API_CONFIGURACION = "http://localhost:8080/configuracion";
const API_USUARIOS = "http://localhost:8080/usuarios";

const camposConfiguracion = {
    nombreNegocio: "configNombre",
    direccion: "configDireccion",
    telefono: "configTelefono",
    email: "configEmail",
    horarioLunes: "configHorarioLunes",
    horarioMartes: "configHorarioMartes",
    horarioMiercoles: "configHorarioMiercoles",
    horarioJueves: "configHorarioJueves",
    horarioViernes: "configHorarioViernes",
    horarioSabado: "configHorarioSabado",
    horarioDomingo: "configHorarioDomingo",
    instagram: "configInstagram",
    whatsapp: "configWhatsapp",
    ubicacionMaps: "configMaps"
};

function obtenerUsuarioActual() {
    try {
        return JSON.parse(localStorage.getItem("usuario") || "null");
    } catch {
        return null;
    }
}

function mostrarEstadoConfiguracion(mensaje, error = false) {
    const estado = document.getElementById("estadoConfiguracion");
    if (!estado) return;

    estado.textContent = mensaje;
    estado.dataset.tipo = error ? "error" : "ok";
}

function mostrarEstadoMiCuenta(mensaje, error = false) {
    const estado = document.getElementById("estadoMiCuenta");
    if (!estado) return;

    estado.textContent = mensaje;
    estado.dataset.tipo = error ? "error" : "ok";
}


function mostrarOpcionConfiguracion(opcion) {
    const usuario = obtenerUsuarioActual();
    const esAdmin = usuario?.rol === "ADMIN";

    const opciones = {
        datosNegocio: "configOpcionDatosNegocio",
        miCuenta: "configOpcionMiCuenta",
        cambiarContrasena: "configOpcionCambiarContrasena"
    };

    // Los empleados no pueden acceder a los datos del negocio.
    if (opcion === "datosNegocio" && !esAdmin) {
        opcion = "miCuenta";
    }

    Object.entries(opciones).forEach(([nombre, id]) => {
        const panel = document.getElementById(id);

        if (panel) {
            panel.style.display = nombre === opcion ? "" : "none";
        }
    });

    document.querySelectorAll(".tab-configuracion").forEach(boton => {
        const esPestanaNegocio =
            boton.getAttribute("onclick")?.includes("'datosNegocio'");

        // Ocultar la pestaña Datos del negocio a los empleados.
        if (esPestanaNegocio) {
            boton.style.display = esAdmin ? "" : "none";
        }

        boton.classList.toggle(
            "activo",
            boton.getAttribute("onclick")?.includes(`'${opcion}'`)
        );
    });

    if (opcion === "miCuenta") {
        cargarMiCuenta();
    }
}


// ------------------------------
// DATOS DEL NEGOCIO
// ------------------------------

async function cargarConfiguracionNegocio() {
    const formulario = document.getElementById("formConfiguracionNegocio");
    if (!formulario) return;

    mostrarEstadoConfiguracion("Cargando configuración...");

    try {
        const respuesta = await fetch(API_CONFIGURACION);

        if (!respuesta.ok) {
            throw new Error("No se pudo obtener la configuración.");
        }

        const datos = await respuesta.json();

        Object.entries(camposConfiguracion).forEach(([campo, id]) => {
            const elemento = document.getElementById(id);
            if (elemento) elemento.value = datos[campo] ?? "";
        });

        mostrarEstadoConfiguracion("Configuración cargada.");
    } catch (error) {
        console.error("Error al cargar la configuración:", error);
        mostrarEstadoConfiguracion(
            "No se pudo cargar la configuración. Verificá que el backend esté iniciado.",
            true
        );
    }
}

async function guardarConfiguracionNegocio(evento) {
    evento.preventDefault();

    const formulario = document.getElementById("formConfiguracionNegocio");
    if (!formulario) return;

    const datos = {};

    Object.entries(camposConfiguracion).forEach(([campo, id]) => {
        const elemento = document.getElementById(id);
        datos[campo] = elemento ? elemento.value.trim() : "";
    });

    if (!datos.nombreNegocio) {
        mostrarEstadoConfiguracion("El nombre del negocio es obligatorio.", true);
        return;
    }

    const boton = formulario.querySelector('button[type="submit"]');
    if (boton) boton.disabled = true;

    mostrarEstadoConfiguracion("Guardando configuración...");

    try {
        const respuesta = await fetch(API_CONFIGURACION, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        });

        if (!respuesta.ok) {
            throw new Error("No se pudo guardar la configuración.");
        }

        mostrarEstadoConfiguracion("Configuración guardada correctamente.");
    } catch (error) {
        console.error("Error al guardar la configuración:", error);
        mostrarEstadoConfiguracion(
            "No se pudo guardar. Revisá el backend y la conexión.",
            true
        );
    } finally {
        if (boton) boton.disabled = false;
    }
}

// ------------------------------
// MI CUENTA
// ------------------------------

async function cargarMiCuenta() {
    const usuarioGuardado = obtenerUsuarioActual();

    if (!usuarioGuardado?.id) {
        mostrarEstadoMiCuenta("No se pudo identificar al usuario de la sesión.", true);
        return;
    }

    mostrarEstadoMiCuenta("Cargando datos...");

    try {
        const respuesta = await fetch(`${API_USUARIOS}/${usuarioGuardado.id}`);

        if (!respuesta.ok) {
            throw new Error("No se pudieron cargar los datos de la cuenta.");
        }

        const usuario = await respuesta.json();

        const camposCuenta = {
            cuentaNombre: usuario.nombre,
            cuentaApellido: usuario.apellido,
            cuentaEmail: usuario.email,
            cuentaDni: usuario.dni,
            cuentaTelefono: usuario.telefono,
            cuentaRol: usuario.rol
        };

        Object.entries(camposCuenta).forEach(([id, valor]) => {
            const elemento = document.getElementById(id);
            if (elemento) {
                elemento.value = valor ?? "";
            }
        });

        mostrarEstadoMiCuenta("");
    } catch (error) {
        console.error("Error al cargar la cuenta:", error);
        mostrarEstadoMiCuenta("No se pudieron cargar los datos de la cuenta.", true);
    }
}

async function guardarMiCuenta(evento) {
    evento.preventDefault();

    const formulario = document.getElementById("formMiCuenta");
    const boton = formulario?.querySelector('button[type="submit"]');
    const usuarioActual = obtenerUsuarioActual();

    if (!usuarioActual?.id) {
        mostrarEstadoMiCuenta("No se pudo identificar al usuario de la sesión.", true);
        return;
    }

    const datos = {
        nombre: document.getElementById("cuentaNombre")?.value.trim() ?? "",
        apellido: document.getElementById("cuentaApellido")?.value.trim() ?? "",
        email: document.getElementById("cuentaEmail")?.value.trim() ?? "",
        telefono: document.getElementById("cuentaTelefono")?.value.trim() ?? ""
    };

    if (!datos.nombre || !datos.apellido || !datos.email) {
        mostrarEstadoMiCuenta(
            "Nombre, apellido y correo electrónico son obligatorios.",
            true
        );
        return;
    }

    if (boton) boton.disabled = true;
    mostrarEstadoMiCuenta("Guardando cambios...");

    try {
        const respuesta = await fetch(`${API_USUARIOS}/${usuarioActual.id}/datos`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(datos)
        });

        const resultado = await respuesta.json().catch(() => ({}));

        if (!respuesta.ok) {
            throw new Error(
                resultado.message ||
                resultado.mensaje ||
                "No se pudieron guardar los cambios."
            );
        }

        // Mantener actualizados los datos básicos de la sesión local.
        const sesionActualizada = {
            ...usuarioActual,
            nombre: resultado.nombre ?? datos.nombre,
            apellido: resultado.apellido ?? datos.apellido,
            email: resultado.email ?? datos.email,
            telefono: resultado.telefono ?? datos.telefono
        };

        localStorage.setItem("usuario", JSON.stringify(sesionActualizada));

        await cargarMiCuenta();
        mostrarEstadoMiCuenta("Datos actualizados correctamente.");
    } catch (error) {
        console.error("Error al guardar los datos de la cuenta:", error);
        mostrarEstadoMiCuenta(error.message, true);
    } finally {
        if (boton) boton.disabled = false;
    }
}

// ------------------------------
// CAMBIAR CONTRASEÑA
// ------------------------------

async function cambiarContrasena(evento) {
    evento.preventDefault();

    const formulario = document.getElementById("formCambiarContrasena");
    const estado = document.getElementById("estadoCambiarContrasena");
    const boton = formulario?.querySelector('button[type="submit"]');

    const mostrarEstado = (mensaje, error = false) => {
        if (!estado) return;
        estado.textContent = mensaje;
        estado.dataset.tipo = error ? "error" : "ok";
    };

    const usuario = obtenerUsuarioActual();

    if (!usuario?.id) {
        mostrarEstado("No se pudo identificar al usuario.", true);
        return;
    }

    const contrasenaActual =
        document.getElementById("contrasenaActual")?.value ?? "";
    const contrasenaNueva =
        document.getElementById("contrasenaNueva")?.value ?? "";
    const confirmarContrasena =
        document.getElementById("confirmarContrasenaNueva")?.value ?? "";

    if (!contrasenaActual || !contrasenaNueva || !confirmarContrasena) {
        mostrarEstado("Completá los tres campos.", true);
        return;
    }

    if (contrasenaNueva.length < 8) {
        mostrarEstado("La nueva contraseña debe tener al menos 8 caracteres.", true);
        return;
    }

    if (contrasenaNueva !== confirmarContrasena) {
        mostrarEstado("Las contraseñas nuevas no coinciden.", true);
        return;
    }

    if (boton) boton.disabled = true;
    mostrarEstado("Actualizando contraseña...");

    try {
        const respuesta = await fetch(
            `${API_USUARIOS}/${usuario.id}/contrasena`,
            {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contrasenaActual,
                    contrasenaNueva
                })
            }
        );

        const datos = await respuesta.json().catch(() => ({}));

        if (!respuesta.ok) {
            throw new Error(
                datos.message || datos.mensaje ||
                "No se pudo cambiar la contraseña."
            );
        }

        formulario.reset();
        mostrarEstado("Contraseña actualizada correctamente.");
    } catch (error) {
        console.error("Error al cambiar la contraseña:", error);
        mostrarEstado(error.message, true);
    } finally {
        if (boton) boton.disabled = false;
    }
}

// ------------------------------
// INICIALIZACIÓN
// ------------------------------

document.addEventListener("DOMContentLoaded", () => {
    const formularioNegocio =
        document.getElementById("formConfiguracionNegocio");

    if (formularioNegocio) {
        formularioNegocio.addEventListener(
            "submit",
            guardarConfiguracionNegocio
        );
        cargarConfiguracionNegocio();
    }

    const formularioCuenta = document.getElementById("formMiCuenta");

    if (formularioCuenta) {
        formularioCuenta.addEventListener("submit", guardarMiCuenta);
    }

    const formularioContrasena =
        document.getElementById("formCambiarContrasena");

    if (formularioContrasena) {
        formularioContrasena.addEventListener("submit", cambiarContrasena);
    }

    const usuario = obtenerUsuarioActual();

    mostrarOpcionConfiguracion(
        usuario?.rol === "ADMIN" ? "datosNegocio" : "miCuenta"
    );
});
