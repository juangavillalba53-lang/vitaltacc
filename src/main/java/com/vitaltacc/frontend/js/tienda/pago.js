// =========================================================
// CHECKOUT: compra online del cliente
// =========================================================

const METODOS_PAGO = [
    ["MERCADO_PAGO", "Mercado Pago"],
    ["TRANSFERENCIA", "Transferencia"],
    ["TARJETA_DEBITO", "Tarjeta de débito"],
    ["TARJETA_CREDITO", "Tarjeta de crédito"],
    ["MODO", "MODO"],
    ["EFECTIVO", "Efectivo"]
];

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

    contenedorCheckout().innerHTML = `
        <div class="checkout">
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

            <aside class="caja resumen-pago" aria-labelledby="tituloResumen">
                <h2 id="tituloResumen">Resumen</h2>
                <div class="resumen-fila"><span>Comprás como</span><span>${escaparHTML(usuario.nombre)} ${escaparHTML(usuario.apellido || "")}</span></div>
                <div class="resumen-fila"><span>Productos</span><span>${Carrito.cantidadTotal()}</span></div>

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
                <p class="nota">Los precios ya incluyen las promociones vigentes. La compra queda guardada en tu cuenta.</p>
            </aside>
        </div>
    `;

    document.getElementById("editarPedido").addEventListener("click", abrirCarrito);
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
            detalles: Carrito.items().map(item => ({
                productoId: Number(item.id),
                cantidad: Number(item.cantidad)
            }))
        };

        const respuesta = await fetch(`${API}/ventas`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(venta)
        });

        if (!respuesta.ok) {
            throw new Error(await leerError(respuesta, "No pudimos registrar la compra."));
        }

        const compra = await respuesta.json();
        Carrito.vaciar();
        mostrarCompraLista(compra);

    } catch (error) {
        aviso.textContent = error.message === "Failed to fetch"
            ? "No pudimos conectarnos. Tu pedido sigue guardado, probá de nuevo en unos minutos."
            : error.message;
        aviso.classList.add("error");
        boton.disabled = false;
        boton.textContent = "Confirmar compra";
    }
}

function mostrarCompraLista(compra) {
    document.querySelector(".cabecera-pagina").hidden = true;

    // Las cuentas creadas en el local tienen un mail interno: a esas no se les escribe
    const email = String(obtenerUsuario()?.email || "");
    const tieneMail = email && !email.endsWith("@local.com");

    contenedorCheckout().innerHTML = `
        <div class="compra-lista">
            <span class="compra-lista-sello"><svg class="icono" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></span>
            <h1>Gracias por tu compra</h1>
            <p>Registramos tu pedido N.º ${escaparHTML(compra.id)} por ${pesos(compra.total)}. Lo vas a encontrar siempre en Mis compras.</p>
            ${tieneMail ? `<p class="compra-lista-mail">Te enviamos el comprobante a <strong>${escaparHTML(email)}</strong>. Si no lo ves, revisá la carpeta de spam.</p>` : ""}
            <div class="compra-lista-botones">
                <a class="boton boton-primario" href="mis-compras.html">Ver mis compras</a>
                <a class="boton boton-secundario" href="${API}/ventas/${encodeURIComponent(compra.id)}/pdf" download>Descargar comprobante</a>
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
