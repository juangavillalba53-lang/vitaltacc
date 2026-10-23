async function pedir(ruta, opciones = {}) {

    const { json, ...resto } = opciones;
    const config = { ...resto, headers: { ...(resto.headers || {}) } };

    if (json !== undefined) {
        config.headers["Content-Type"] = "application/json";
        config.body = JSON.stringify(json);
    }

    // La sesión: el servidor sabe quién es y qué puede hacer
    Object.assign(config.headers, cabeceraSesion());

    let respuesta;

    try {
        respuesta = await fetch(ruta.startsWith("http") ? ruta : API + ruta, config);
    } catch {
        throw new Error("No se pudo conectar con el servidor. Revisá que esté iniciado.");
    }

    const texto = await respuesta.text();
    let datos = null;

    if (texto) {
        try {
            datos = JSON.parse(texto);
        } catch {
            datos = texto;
        }
    }

    // Sesión vencida o inválida: hay que volver a entrar
    if (respuesta.status === 401) {
        localStorage.removeItem("usuario");
        window.location.href = "login.html";
        throw new Error("Tu sesión venció. Volvé a iniciar sesión.");
    }

    if (!respuesta.ok) {
        const mensaje =
            (datos && typeof datos === "object" && (datos.error || datos.message)) ||
            (typeof datos === "string" && datos.length < 200 ? datos : "") ||
            "Algo salió mal. Probá de nuevo.";
        throw new Error(mensaje);
    }

    return datos;
}

// Días que faltan hasta una fecha "AAAA-MM-DD" (negativo si ya pasó). Sin líos de zona horaria.
function diasHasta(fecha) {
    const [anio, mes, dia] = String(fecha).substring(0, 10).split("-").map(Number);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return Math.round((new Date(anio, mes - 1, dia) - hoy) / 86400000);
}

// Mismos umbrales que el servidor: urgente 15 días o menos, atención hasta 30
const DIAS_URGENTE = 15;
const DIAS_ATENCION = 30;

function nivelVencimiento(dias) {
    if (dias < 0) return "vencido";
    if (dias <= DIAS_URGENTE) return "urgente";
    if (dias <= DIAS_ATENCION) return "atencion";
    return "ok";
}

function textoDias(dias) {
    if (dias < 0) return dias === -1 ? "Venció ayer" : `Venció hace ${-dias} días`;
    if (dias === 0) return "Vence hoy";
    if (dias === 1) return "Vence mañana";
    return `Vence en ${dias} días`;
}

(function () {

    // -----------------------------------------------------
    // AVISOS
    // -----------------------------------------------------

    const PALABRAS_ERROR = [
        "error", "no se pudo", "no tenés", "no tiene", "inválid",
        "incorrect", "falt", "complet", "debe", "no hay stock", "no encontr"
    ];

    function contenedorAvisos() {
        let cont = document.getElementById("avisos");

        if (!cont) {
            cont = document.createElement("div");
            cont.id = "avisos";
            cont.className = "avisos";
            cont.setAttribute("role", "status");
            cont.setAttribute("aria-live", "polite");
            document.body.appendChild(cont);
        }

        return cont;
    }

    function tipoDeMensaje(texto) {
        const t = String(texto).toLowerCase();
        return PALABRAS_ERROR.some(p => t.includes(p)) ? "error" : "ok";
    }

    window.mostrarAviso = function (mensaje, tipo) {

        const cont = contenedorAvisos();
        const aviso = document.createElement("div");
        const clase = tipo || tipoDeMensaje(mensaje);

        aviso.className = `aviso aviso-${clase}`;
        aviso.innerHTML = `
            <span class="aviso-punto" aria-hidden="true"></span>
            <span class="aviso-texto"></span>
            <button type="button" class="aviso-cerrar" aria-label="Cerrar aviso">×</button>
        `;
        aviso.querySelector(".aviso-texto").textContent = String(mensaje);

        const cerrar = () => {
            if (aviso.dataset.saliendo) return;
            aviso.dataset.saliendo = "1";
            aviso.classList.add("saliendo");
            setTimeout(() => aviso.remove(), 200);
        };

        aviso.querySelector(".aviso-cerrar").addEventListener("click", cerrar);

        // Pausa el temporizador mientras el mouse está encima
        // Los errores y advertencias quedan más tiempo a la vista
        let restante = clase === "ok" ? 3500 : 6000;
        let inicio = Date.now();
        let timer = setTimeout(cerrar, restante);

        aviso.addEventListener("mouseenter", () => {
            clearTimeout(timer);
            restante -= Date.now() - inicio;
        });

        aviso.addEventListener("mouseleave", () => {
            inicio = Date.now();
            timer = setTimeout(cerrar, Math.max(restante, 1200));
        });

        cont.appendChild(aviso);

        // Máximo 3 avisos a la vista
        while (cont.children.length > 3) {
            cont.firstElementChild.remove();
        }
    };

    // -----------------------------------------------------
    // VENTANAS DE CONFIRMACIÓN (en lugar de confirm/prompt)
    // -----------------------------------------------------

    const ICONOS_DIALOGO = {
        peligro: '<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>',
        nuevo: '<path d="M12 5v14M5 12h14"/>'
    };

    let dialogo = null;
    let resolverDialogo = null;
    let temporizadorCierre = null;

    function crearDialogo() {
        dialogo = document.createElement("dialog");
        dialogo.className = "dialogo";
        dialogo.setAttribute("aria-labelledby", "dialogoTitulo");
        dialogo.setAttribute("aria-describedby", "dialogoMensaje");
        dialogo.innerHTML = `
            <form class="dialogo-caja" novalidate>
                <span class="dialogo-icono" aria-hidden="true">
                    <svg viewBox="0 0 24 24"></svg>
                </span>
                <h2 class="dialogo-titulo" id="dialogoTitulo"></h2>
                <p class="dialogo-mensaje" id="dialogoMensaje"></p>
                <label class="dialogo-campo" hidden>
                    <span class="dialogo-etiqueta"></span>
                    <input type="text" autocomplete="off" maxlength="80">
                </label>
                <div class="dialogo-acciones">
                    <button type="button" class="dialogo-cancelar">Cancelar</button>
                    <button type="submit" class="dialogo-aceptar">Aceptar</button>
                </div>
            </form>
        `;
        document.body.appendChild(dialogo);

        const form = dialogo.querySelector("form");
        const input = dialogo.querySelector("input");
        const aceptar = dialogo.querySelector(".dialogo-aceptar");

        form.addEventListener("submit", evento => {
            evento.preventDefault();
            if (aceptar.disabled) return;
            const campo = dialogo.querySelector(".dialogo-campo");
            cerrarDialogo(campo.hidden ? true : input.value.trim());
        });

        dialogo.querySelector(".dialogo-cancelar")
            .addEventListener("click", () => cerrarDialogo(null));

        // Esc cierra con la animación de salida
        dialogo.addEventListener("cancel", evento => {
            evento.preventDefault();
            cerrarDialogo(null);
        });

        // Clic afuera de la caja = cancelar
        dialogo.addEventListener("click", evento => {
            if (evento.target === dialogo) cerrarDialogo(null);
        });

        input.addEventListener("input", () => {
            aceptar.disabled = input.value.trim() === "";
        });
    }

    function cerrarDialogo(valor) {
        if (!dialogo || !dialogo.open || dialogo.classList.contains("cerrando")) return;

        const resolver = resolverDialogo;
        resolverDialogo = null;

        dialogo.classList.add("cerrando");
        const terminar = () => {
            dialogo.classList.remove("cerrando");
            dialogo.close();
        };

        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) terminar();
        else temporizadorCierre = setTimeout(terminar, 150);

        if (resolver) resolver(valor);
    }

    function abrirDialogo(opciones) {
        if (!dialogo) crearDialogo();

        // Si había otro abierto, se toma como cancelado
        if (resolverDialogo) resolverDialogo(null);
        clearTimeout(temporizadorCierre);
        dialogo.classList.remove("cerrando");

        const {
            titulo, mensaje = "", aceptar = "Aceptar", cancelar = "Cancelar",
            tipo = "peligro", campo = null
        } = opciones;

        dialogo.dataset.tipo = tipo;
        dialogo.querySelector(".dialogo-icono svg").innerHTML =
            ICONOS_DIALOGO[tipo] || ICONOS_DIALOGO.peligro;
        dialogo.querySelector(".dialogo-titulo").textContent = titulo;

        const parrafo = dialogo.querySelector(".dialogo-mensaje");
        parrafo.textContent = mensaje;
        parrafo.hidden = !mensaje;

        const caja = dialogo.querySelector(".dialogo-campo");
        const input = caja.querySelector("input");
        const botonAceptar = dialogo.querySelector(".dialogo-aceptar");

        caja.hidden = !campo;
        input.value = campo?.valor || "";
        input.placeholder = campo?.placeholder || "";
        caja.querySelector(".dialogo-etiqueta").textContent = campo?.etiqueta || "";
        botonAceptar.disabled = !!campo && input.value.trim() === "";

        botonAceptar.textContent = aceptar;
        dialogo.querySelector(".dialogo-cancelar").textContent = cancelar;

        return new Promise(resolver => {
            resolverDialogo = resolver;
            if (!dialogo.open) dialogo.showModal();

            // Para borrar, el foco arranca en "Cancelar" (más seguro);
            // para escribir, en el campo.
            (campo ? input : dialogo.querySelector(".dialogo-cancelar")).focus();
        });
    }

    /**
     * Pide confirmación. Devuelve true si la persona acepta.
     * confirmar({ titulo, mensaje, aceptar: "Eliminar" })
     */
    window.confirmar = async function (opciones) {
        return (await abrirDialogo(opciones)) === true;
    };

    /**
     * Pide un texto. Devuelve el texto (sin espacios de más) o null.
     * pedirTexto({ titulo, etiqueta, placeholder, aceptar: "Crear" })
     */
    window.pedirTexto = async function ({ etiqueta, placeholder, valor, ...resto }) {
        const respuesta = await abrirDialogo({
            tipo: "nuevo",
            ...resto,
            campo: { etiqueta, placeholder, valor }
        });
        return typeof respuesta === "string" && respuesta ? respuesta : null;
    };

    /**
     * Texto de la fila donde se hizo clic (para nombrar lo que se borra).
     * Hay que llamarlo antes de cualquier await.
     */
    window.textoDeFila = function (selector) {
        const origen = window.event && window.event.target;
        if (!(origen instanceof Element)) return "";
        const fila = origen.closest("tr, .categoria-item");
        const celda = fila && fila.querySelector(selector);
        return celda ? celda.textContent.replace(/\s+/g, " ").trim() : "";
    };

    // -----------------------------------------------------
    // PAGINACIÓN (Usuarios, Promociones)
    // -----------------------------------------------------

    /**
     * Devuelve los elementos de una página y corrige la página si quedó fuera de rango.
     * paginar(lista, 2, 10) -> { items, pagina, totalPaginas }
     */
    window.paginar = function (lista, pagina, porPagina) {
        const totalPaginas = Math.max(1, Math.ceil(lista.length / porPagina));
        const actual = Math.min(Math.max(1, pagina), totalPaginas);
        const inicio = (actual - 1) * porPagina;
        return {
            items: lista.slice(inicio, inicio + porPagina),
            pagina: actual,
            totalPaginas
        };
    };

    /** Dibuja "Anterior · Página X de Y · Siguiente". Con una sola página no muestra nada. */
    window.dibujarPaginacion = function (contenedor, pagina, totalPaginas, alCambiar) {
        if (!contenedor) return;
        contenedor.replaceChildren();
        if (totalPaginas <= 1) return;

        const boton = (texto, deshabilitado, destino) => {
            const b = document.createElement("button");
            b.type = "button";
            b.textContent = texto;
            b.disabled = deshabilitado;
            b.addEventListener("click", () => alCambiar(destino));
            return b;
        };

        const texto = document.createElement("span");
        texto.textContent = `Página ${pagina} de ${totalPaginas}`;

        contenedor.append(
            boton("Anterior", pagina <= 1, pagina - 1),
            texto,
            boton("Siguiente", pagina >= totalPaginas, pagina + 1)
        );
    };

    // -----------------------------------------------------
    // INDICADOR DEL MENÚ
    // -----------------------------------------------------

    window.moverIndicadorMenu = function (boton) {

        const menu = document.querySelector(".sidebar-menu");
        const indicador = document.querySelector(".menu-indicador");

        if (!menu || !indicador || !boton) return;

        indicador.style.width = `${boton.offsetWidth}px`;
        indicador.style.height = `${boton.offsetHeight}px`;
        indicador.style.transform =
            `translate(${boton.offsetLeft}px, ${boton.offsetTop}px)`;
        indicador.classList.add("visible");

        // En celular el menú es horizontal: llevar el botón a la vista
        if (menu.scrollWidth > menu.clientWidth) {
            boton.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
        }
    };

    window.addEventListener("resize", () => {
        const activo = document.querySelector(".sidebar-menu .menu-principal.activo");
        const indicador = document.querySelector(".menu-indicador");

        if (indicador) indicador.classList.add("sin-transicion");
        window.moverIndicadorMenu(activo);
        requestAnimationFrame(() => indicador && indicador.classList.remove("sin-transicion"));
    });

    // -----------------------------------------------------
    // NÚMEROS QUE CUENTAN HACIA ARRIBA (solo la primera vez)
    // -----------------------------------------------------

    function animarNumero(el) {
        const destino = Number(String(el.textContent).replace(/[^\d]/g, ""));
        if (!Number.isFinite(destino) || destino <= 0 || el.dataset.contado) return;

        el.dataset.contado = "1";

        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

        const duracion = 900;
        const inicio = performance.now();

        const paso = ahora => {
            const t = Math.min(1, (ahora - inicio) / duracion);
            const suave = 1 - Math.pow(1 - t, 3);
            el.textContent = Math.round(destino * suave);
            if (t < 1) requestAnimationFrame(paso);
            else el.textContent = destino;
        };

        requestAnimationFrame(paso);
    }

    function observarNumeros() {
        const ids = [
            "dashboardProductos", "dashboardLotes", "dashboardPromociones",
            "dashboardUsuarios", "totalUrgentes", "totalAtencion", "totalProximos"
        ];

        ids.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;

            const observador = new MutationObserver(() => {
                if (el.dataset.contado) {
                    observador.disconnect();
                    return;
                }
                observador.disconnect();
                animarNumero(el);
            });

            observador.observe(el, { childList: true, characterData: true, subtree: true });
        });
    }

    // El total de la venta late cuando cambia
    function observarTotalVenta() {
        const total = document.getElementById("totalVenta");
        if (!total) return;

        let anterior = total.textContent;

        new MutationObserver(() => {
            if (total.textContent === anterior) return;
            anterior = total.textContent;
            total.classList.remove("cambio");
            void total.offsetWidth;
            total.classList.add("cambio");
        }).observe(total, { childList: true, characterData: true, subtree: true });
    }

    // -----------------------------------------------------
    // OJITO PARA VER U OCULTAR LA CONTRASEÑA
    // -----------------------------------------------------

    const ICONO_OJO =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
    const ICONO_OJO_TACHADO =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.6 5.1A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-2.6 3.5"/><path d="M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7a9.9 9.9 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="M3 3l18 18"/></svg>';

    function agregarOjitosContrasena(raiz = document) {

        raiz.querySelectorAll('input[type="password"]').forEach(input => {

            if (input.closest(".campo-clave")) return;

            const envoltorio = document.createElement("div");
            envoltorio.className = "campo-clave";
            input.parentNode.insertBefore(envoltorio, input);
            envoltorio.appendChild(input);

            const boton = document.createElement("button");
            boton.type = "button";
            boton.className = "ver-clave";
            envoltorio.appendChild(boton);

            const mostrar = visible => {
                input.type = visible ? "text" : "password";
                boton.innerHTML = visible ? ICONO_OJO_TACHADO : ICONO_OJO;
                boton.setAttribute("aria-label", visible ? "Ocultar contraseña" : "Mostrar contraseña");
                boton.setAttribute("aria-pressed", String(visible));
                boton.title = boton.getAttribute("aria-label");
            };

            mostrar(false);

            boton.addEventListener("click", () => {
                const inicio = input.selectionStart;
                const fin = input.selectionEnd;
                mostrar(input.type === "password");
                input.focus();
                try { input.setSelectionRange(inicio, fin); } catch (e) { /* sin cursor */ }
            });

            // Al enviar o limpiar el formulario se vuelve a ocultar
            const formulario = input.form;
            if (formulario) {
                formulario.addEventListener("submit", () => mostrar(false));
                formulario.addEventListener("reset", () => mostrar(false));
            }
        });
    }

    window.agregarOjitosContrasena = agregarOjitosContrasena;

    // -----------------------------------------------------
    // CARGA INICIAL
    // -----------------------------------------------------

    document.addEventListener("DOMContentLoaded", () => {

        // Animación de entrada solo la primera vez
        document.body.classList.add("inicio");
        observarNumeros();
        observarTotalVenta();
        agregarOjitosContrasena();
        setTimeout(() => document.body.classList.remove("inicio"), 900);

        // Si una tabla sigue mostrando el esqueleto, avisar que no cargó
        setTimeout(() => {
            const tablas = new Set([...document.querySelectorAll("tr.fila-esqueleto")].map(fila => fila.parentElement));

            tablas.forEach(tbody => {
                if (!tbody) return;
                const columnas =
                    tbody.closest("table")?.querySelectorAll("thead th").length || 1;

                tbody.innerHTML = `
                    <tr class="fila-sin-datos">
                        <td colspan="${columnas}">
                            No se pudieron cargar los datos. Revisá que el servidor esté iniciado y recargá la página.
                        </td>
                    </tr>
                `;
            });
        }, 10000);
    });

})();
