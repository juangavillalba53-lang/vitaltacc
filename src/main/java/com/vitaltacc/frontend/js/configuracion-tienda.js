const API_CONFIGURACION_TIENDA = "http://localhost:8080/configuracion";

async function cargarConfiguracionTienda() {
    try {
        const respuesta = await fetch(API_CONFIGURACION_TIENDA);

        if (!respuesta.ok) {
            throw new Error("No se pudo obtener la configuración del negocio.");
        }

        const datos = await respuesta.json();

        // Nombre del negocio
        const nombre = datos.nombreNegocio?.trim() || "VitalTacc";

        const titulo = document.querySelector("title");
        if (titulo) {
            titulo.textContent = nombre;
        }

        const logo = document.getElementById("footerLogo");
        if (logo) {
            logo.alt = nombre;
        }

        const nombreFooter = document.getElementById("footerNombreNegocio");
        if (nombreFooter) {
            nombreFooter.textContent = nombre;
        }

        // Dirección
        const direccion = document.getElementById("footerDireccion");
        if (direccion && datos.direccion?.trim()) {
            direccion.textContent = datos.direccion.trim();
        }

        // Teléfono
        const telefono = document.getElementById("footerTelefono");

        if (telefono) {
            const numero = datos.telefono?.trim() || "";

            telefono.textContent = numero;
            telefono.style.display = numero ? "" : "none";
        }

        // Horarios de atención
        const horarios = {
            horarioLunes: "footerHorarioLunes",
            horarioMartes: "footerHorarioMartes",
            horarioMiercoles: "footerHorarioMiercoles",
            horarioJueves: "footerHorarioJueves",
            horarioViernes: "footerHorarioViernes",
            horarioSabado: "footerHorarioSabado",
            horarioDomingo: "footerHorarioDomingo"
        };

        Object.entries(horarios).forEach(([campo, id]) => {
            const elemento = document.getElementById(id);

            if (elemento) {
                const horario = datos[campo]?.trim();

                if (horario) {
                    elemento.textContent = horario;
                }
            }
        });

        // Instagram
        actualizarEnlace(
            "footerInstagram",
            datos.instagram,
            "https://instagram.com/"
        );

        // WhatsApp
        actualizarEnlace(
            "footerWhatsapp",
            datos.whatsapp,
            "https://wa.me/"
        );

        // Google Maps
        actualizarEnlace(
            "footerMaps",
            datos.ubicacionMaps,
            "https://maps.app.goo.gl/hDy4N3ZFMr4rXz6CA?g_st=iwb"
        );

    } catch (error) {
        console.error("Error cargando la configuración de la tienda:", error);
    }
}

function actualizarEnlace(id, urlConfigurada, urlRespaldo) {
    const enlace = document.getElementById(id);

    if (!enlace) {
        return;
    }

    const url = urlConfigurada?.trim() || urlRespaldo;

    enlace.href = url;
}

// Cargar los datos cuando el HTML esté disponible
document.addEventListener("DOMContentLoaded", cargarConfiguracionTienda);