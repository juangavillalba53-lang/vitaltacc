// Orden en que se ofrecen los métodos de pago online (los nombres están en js/comun.js)
const METODOS_PAGO = ["MERCADO_PAGO", "TRANSFERENCIA", "TARJETA_DEBITO", "TARJETA_CREDITO", "MODO", "EFECTIVO"]
    .map(valor => [valor, NOMBRES_PAGO[valor]]);

// Cómo recibe el pedido: se guarda acá para no perderlo si el resumen se vuelve a dibujar
const entrega = {
    forma: "RETIRO",
    direccion: "",
    localidad: "Posadas",
    telefono: "",
    indicaciones: ""
};

function contenedorCheckout() {
    return document.getElementById("checkout");
}

function mostrarMensajeCheckout(titulo, texto, botones) {
    contenedorCheckout().innerHTML = `
        <div class="estado-vacio">
            <h3>${titulo}</h3>
            <p>${texto}</p>
            <div class="compra-lista-botones">${botones}</div>
        </div>`;
}

// Precios y stock actualizados desde el servidor antes de confirmar
async function sincronizarCarrito() {
    const productos = await obtenerProductos();
    const porId = new Map(productos.map(p => [Number(p.id), datosProducto(p)]));
    const cambios = [];

    const items = Carrito.items()
        .map(item => {
            const actual = porId.get(Number(item.id));

            if (!actual || actual.stock <= 0) {
                cambios.push(`${item.nombre} ya no está disponible y lo sacamos del pedido.`);
                return null;
            }

            if (item.cantidad > actual.stock) {
                cambios.push(`De ${item.nombre} quedan ${actual.stock} unidades.`);
                item.cantidad = actual.stock;
            }

            if (Math.abs(actual.precio - item.precio) > 0.009) {
                cambios.push(`El precio de ${item.nombre} cambió a ${pesos(actual.precio)}.`);
            }

            return { ...item, precio: actual.precio, stock: actual.stock, imagen: actual.imagen || item.imagen };
        })
        .filter(Boolean);

    Carrito.guardar(items, false);
    return cambios;
}

function renderCheckout(cambios = []) {
    const items = Carrito.items();

    if (!items.length) {
        mostrarMensajeCheckout(
            "Tu pedido está vacío",
            "Agregá productos desde el catálogo para finalizar la compra.",
            `<a class="boton boton-primario" href="productos.html">Ver productos</a>`);
        return;
    }

    const usuario = obtenerUsuario();

    if (!entrega.telefono && usuario.telefono) {
        entrega.telefono = usuario.telefono;
    }

    contenedorCheckout().innerHTML = `
        <div class="checkout">
            <div class="checkout-columna">
            <section class="caja" aria-labelledby="tituloPedido">
                <h2 id="tituloPedido">Tu pedido</h2>
                ${cambios.length ? `<p class="mensaje-formulario error">${cambios.map(escaparHTML).join(" ")}</p>` : ""}
                <ul class="lista-pedido">
                    ${items.map(item => `
                        <li>
                            <div class="miniatura">
                                ${item.imagen
            ? `<img src="${escaparHTML(item.imagen)}" alt="">`
            : icono("trigo", "icono-placeholder")}
                            </div>
                            <div>
                                <strong>${escaparHTML(item.nombre)}</strong>
                                <small>${item.cantidad} × ${pesos(item.precio)}</small>
                            </div>
                            <span class="importe">${pesos(item.precio * item.cantidad)}</span>
                        </li>
                    `).join("")}
                </ul>
                <button type="button" class="boton-texto" id="editarPedido">Editar el pedido</button>
            </section>

            <section class="caja" aria-labelledby="tituloEntrega">
                <h2 id="tituloEntrega">¿Cómo lo recibís?</h2>

                <fieldset class="formas-entrega">
                    <legend class="solo-lectores">Forma de entrega</legend>
                    <label class="forma-entrega">
                        <input type="radio" name="formaEntrega" value="RETIRO" ${entrega.forma === "RETIRO" ? "checked" : ""}>
                        <span>
                            ${icono("ubicacion")}
                            <strong>Retiro en el local</strong>
                            <small>Sin costo · <span data-config="direccion">${escaparHTML(configuracionNegocio.direccion)}</span></small>
                        </span>
                    </label>
                    <label class="forma-entrega">
                        <input type="radio" name="formaEntrega" value="ENVIO" ${entrega.forma === "ENVIO" ? "checked" : ""}>
                        <span>
                            ${icono("bolsa")}
                            <strong>Envío a domicilio</strong>
                            <small>Costo y horario a coordinar por WhatsApp</small>
                        </span>
                    </label>
                </fieldset>

                <div class="datos-envio" id="datosEnvio" ${entrega.forma === "ENVIO" ? "" : "hidden"}>
                    <p class="nota-obligatorio">Los campos con <span class="obligatorio" aria-hidden="true">*</span> son obligatorios.</p>
                    <div class="campo">
                        <label for="envioDireccion">Dirección <span class="obligatorio" aria-hidden="true">*</span></label>
                        <input type="text" id="envioDireccion" aria-required="true" autocomplete="street-address" maxlength="150"
                            placeholder="Calle y número" value="${escaparHTML(entrega.direccion)}">
                    </div>
                    <div class="fila-campos">
                        <div class="campo">
                            <label for="envioLocalidad">Localidad <span class="obligatorio" aria-hidden="true">*</span></label>
                            <input type="text" id="envioLocalidad" aria-required="true" autocomplete="address-level2" maxlength="80"
                                value="${escaparHTML(entrega.localidad)}">
                        </div>
                        <div class="campo">
                            <label for="envioTelefono">Teléfono <span class="obligatorio" aria-hidden="true">*</span></label>
                            <input type="tel" id="envioTelefono" aria-required="true" autocomplete="tel" maxlength="40"
                                placeholder="Para coordinar la entrega" value="${escaparHTML(entrega.telefono)}">
                        </div>
                    </div>
                    <div class="campo">
                        <label for="envioIndicaciones">Indicaciones <small>(opcional)</small></label>
                        <input type="text" id="envioIndicaciones" maxlength="250"
                            placeholder="Piso, timbre, entre calles…" value="${escaparHTML(entrega.indicaciones)}">
                    </div>
                </div>
            </section>
            </div>

            <aside class="caja resumen-pago" aria-labelledby="tituloResumen">
                <h2 id="tituloResumen">Resumen</h2>
                <div class="resumen-fila"><span>Comprás como</span><span>${escaparHTML(usuario.nombre)} ${escaparHTML(usuario.apellido || "")}</span></div>
                <div class="resumen-fila"><span>Productos</span><span>${Carrito.cantidadTotal()}</span></div>
                <div class="resumen-fila"><span>Entrega</span><span id="resumenEntrega">${entrega.forma === "ENVIO" ? "A coordinar" : "Sin costo"}</span></div>

                <fieldset class="metodos-pago">
                    <legend>¿Cómo vas a pagar?</legend>
                    ${METODOS_PAGO.map(([valor, texto], i) => `
                        <label class="metodo">
                            <input type="radio" name="metodoPago" value="${valor}" ${i === 0 ? "checked" : ""}>
                            <span>${texto}</span>
                        </label>
                    `).join("")}
                </fieldset>

                <div class="resumen-total">
                    <span>Total</span>
                    <strong>${pesos(Carrito.total())}</strong>
                </div>

                <p class="mensaje-formulario" id="mensajeCheckout" role="alert"></p>

                <button type="button" class="boton boton-primario boton-ancho" id="confirmarCompra">Confirmar compra</button>
            </aside>
        </div>
    `;

    document.getElementById("editarPedido").addEventListener("click", abrirCarrito);

    document.querySelectorAll('input[name="formaEntrega"]').forEach(opcion => {
        opcion.addEventListener("change", () => {
            entrega.forma = opcion.value;
            document.getElementById("datosEnvio").hidden = entrega.forma !== "ENVIO";
            document.getElementById("resumenEntrega").textContent = entrega.forma === "ENVIO" ? "A coordinar" : "Sin costo";
            if (entrega.forma === "ENVIO") document.getElementById("envioDireccion").focus();
        });
    });

    [["envioDireccion", "direccion"], ["envioLocalidad", "localidad"],
    ["envioTelefono", "telefono"], ["envioIndicaciones", "indicaciones"]].forEach(([id, clave]) => {
        const campo = document.getElementById(id);
        campo.addEventListener("input", () => {
            entrega[clave] = campo.value;
            campo.removeAttribute("aria-invalid");
            // Si había un aviso por datos faltantes, se borra al completarlos
            const aviso = document.getElementById("mensajeCheckout");
            if (aviso.classList.contains("error") && !document.querySelector('#datosEnvio [aria-invalid="true"]')) {
                aviso.textContent = "";
                aviso.className = "mensaje-formulario";
            }
        });
    });
    document.getElementById("confirmarCompra").addEventListener("click", confirmarCompra);
}

async function confirmarCompra(evento) {
    const boton = evento.currentTarget;
    const usuario = obtenerUsuario();
    const metodo = document.querySelector('input[name="metodoPago"]:checked')?.value;
    const aviso = document.getElementById("mensajeCheckout");

    aviso.textContent = "";
    aviso.className = "mensaje-formulario";

    if (!metodo) {
        aviso.textContent = "Elegí cómo vas a pagar.";
        aviso.classList.add("error");
        return;
    }

    // Para el envío hacen falta dirección, localidad y teléfono
    if (entrega.forma === "ENVIO") {
        const faltantes = [["envioDireccion", "direccion"], ["envioLocalidad", "localidad"], ["envioTelefono", "telefono"]]
            .filter(([, clave]) => !entrega[clave].trim());

        faltantes.forEach(([id]) => document.getElementById(id).setAttribute("aria-invalid", "true"));

        if (faltantes.length) {
            aviso.textContent = "Para el envío completá la dirección, la localidad y un teléfono.";
            aviso.classList.add("error");
            document.getElementById(faltantes[0][0]).focus();
            return;
        }
    }

    boton.disabled = true;
    boton.textContent = "Confirmando…";

    try {
        // Último control de stock y precios
        const cambios = await sincronizarCarrito();
        if (cambios.length) {
            renderCheckout(cambios);
            mostrarAviso("Actualizamos tu pedido. Revisalo antes de confirmar.", "error");
            return;
        }

        const venta = {
            tipoVenta: "ONLINE",
            metodoPago: metodo,
            clienteId: Number(usuario.id),
            formaEntrega: entrega.forma,
            ...(entrega.forma === "ENVIO" ? {
                envioDireccion: entrega.direccion.trim(),
                envioLocalidad: entrega.localidad.trim(),
                envioTelefono: entrega.telefono.trim(),
                envioIndicaciones: entrega.indicaciones.trim()
            } : {}),
            detalles: Carrito.items().map(item => ({
                productoId: Number(item.id),
                cantidad: Number(item.cantidad)
            }))
        };

        const respuesta = await fetch(`${API}/ventas`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...cabeceraSesion() },
            body: JSON.stringify(venta)
        });

        if (sesionVencida(respuesta)) return;

        if (!respuesta.ok) {
            throw new Error(await leerError(respuesta, "No pudimos registrar la compra."));
        }

        const compra = await respuesta.json();
        Carrito.vaciar();
        mostrarCompraLista(compra, { ...entrega });

    } catch (error) {
        aviso.textContent = error.message === "Failed to fetch"
            ? "No pudimos conectarnos. Tu pedido sigue guardado, probá de nuevo en unos minutos."
            : error.message;
        aviso.classList.add("error");
        boton.disabled = false;
        boton.textContent = "Confirmar compra";
    }
}

// Link de WhatsApp del local con el mensaje ya escrito
function linkWhatsapp(texto) {
    const base = configuracionNegocio.whatsapp || CONFIG_POR_DEFECTO.whatsapp;
    return `${base}${base.includes("?") ? "&" : "?"}text=${encodeURIComponent(texto)}`;
}

function mostrarCompraLista(compra, datosEntrega) {
    document.querySelector(".cabecera-pagina").hidden = true;

    const usuario = obtenerUsuario();
    const conEnvio = datosEntrega.forma === "ENVIO";

    // Con envío, el siguiente paso es coordinarlo por WhatsApp
    const mensajeWhatsapp =
        `Hola! Soy ${usuario.nombre} ${usuario.apellido || ""}. Hice el pedido N.º ${compra.id} ` +
        `con envío a ${datosEntrega.direccion.trim()}, ${datosEntrega.localidad.trim()}. ¿Coordinamos el envío?`;

    const entregaHTML = conEnvio ? `
        <div class="compra-lista-envio">
            <h2>Coordiná el envío</h2>
            <p>Escribinos por WhatsApp y acordamos el costo y el horario. El mensaje ya va con tu pedido y tu dirección.</p>
            <a class="boton boton-whatsapp" href="${escaparHTML(linkWhatsapp(mensajeWhatsapp))}" target="_blank" rel="noopener noreferrer">
                ${icono("whatsapp")}<span>Coordinar por WhatsApp</span>
            </a>
        </div>` : `
        <p class="compra-lista-retiro">
            ${icono("ubicacion")}
            <span>Te avisamos por mail cuando esté <strong>listo para retirar</strong> en ${escaparHTML(configuracionNegocio.direccion)}.</span>
        </p>`;

    // Las cuentas creadas en el local tienen un mail interno: a esas no se les escribe
    const email = String(obtenerUsuario()?.email || "");
    const tieneMail = email && !email.endsWith("@local.com");

    contenedorCheckout().innerHTML = `
        <div class="compra-lista">
            <span class="compra-lista-sello"><svg class="icono" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></span>
            <h1>Gracias por tu compra</h1>
            <p>Registramos tu pedido N.º ${escaparHTML(compra.id)} por ${pesos(compra.total)}. Lo vas a encontrar siempre en Mis compras.</p>
            ${entregaHTML}
            ${tieneMail ? `<p class="compra-lista-mail">Te enviamos el comprobante a <strong>${escaparHTML(email)}</strong>. Si no lo ves, revisá la carpeta de spam.</p>` : ""}
            <div class="compra-lista-botones">
                <a class="boton boton-primario" href="mis-compras.html">Ver mis compras</a>
                <button type="button" class="boton boton-secundario" onclick="descargarComprobante(${Number(compra.id)}, this)">Descargar comprobante</button>
                <a class="boton boton-secundario" href="productos.html">Seguir comprando</a>
            </div>
        </div>
    `;
    window.scrollTo({ top: 0 });
}

document.addEventListener("DOMContentLoaded", async () => {
    const usuario = obtenerUsuario();

    if (!usuario) {
        mostrarMensajeCheckout(
            "Ingresá para terminar tu compra",
            "Tu pedido queda guardado. Si ya compraste en el local, creá tu cuenta con el mismo DNI.",
            `<a class="boton boton-primario" href="login.html?volver=checkout.html">Ingresar</a>
             <a class="boton boton-secundario" href="login.html?volver=checkout.html#registro">Crear cuenta</a>`);
        return;
    }

    if (esPersonal(usuario)) {
        mostrarMensajeCheckout(
            "Las ventas del local se cargan desde el panel",
            "Para registrar una venta a un cliente, usá la sección Ventas del panel. Ahí podés buscarlo por DNI.",
            `<a class="boton boton-primario" href="admin.html">Ir al panel</a>`);
        return;
    }

    contenedorCheckout().innerHTML = `<div class="esqueleto-linea"></div>`;

    let cambios = [];
    try {
        cambios = await sincronizarCarrito();
    } catch {
        // Si no hay conexión mostramos lo que hay guardado
    }

    renderCheckout(cambios);

    // Si edita el pedido desde el carrito lateral, se actualiza el resumen
    document.addEventListener("carrito-cambio", () => renderCheckout());
});
