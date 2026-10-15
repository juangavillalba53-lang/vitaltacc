
const API_CONFIGURACION = "http://localhost:8080/configuracion";

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

function mostrarEstadoConfiguracion(mensaje, error = false) {
    const estado = document.getElementById("estadoConfiguracion");

    if (!estado) return;

    estado.textContent = mensaje;
    estado.style.color = error ? "red" : "green";
}

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

            if (elemento) {
                elemento.value = datos[campo] ?? "";
            }
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
        mostrarEstadoConfiguracion(
            "El nombre del negocio es obligatorio.",
            true
        );
        return;
    }

    const boton = formulario.querySelector('button[type="submit"]');

    if (boton) boton.disabled = true;

    mostrarEstadoConfiguracion("Guardando configuración...");

    try {
        const respuesta = await fetch(API_CONFIGURACION, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
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

document.addEventListener("DOMContentLoaded", () => {
    const formulario = document.getElementById("formConfiguracionNegocio");

    if (!formulario) return;

    formulario.addEventListener("submit", guardarConfiguracionNegocio);
    cargarConfiguracionNegocio();
});
