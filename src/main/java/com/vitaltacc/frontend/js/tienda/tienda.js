function soloNumeros(texto) {
    return String(texto ?? "").replace(/\D/g, "");
}

// Lee el mensaje de error que devuelve el backend ({ "error": "..." })
async function leerError(respuesta, mensajePorDefecto) {
    try {
        const datos = await respuesta.json();
        return datos.error || datos.message || mensajePorDefecto;
    } catch {
        return mensajePorDefecto;
    }
}

function leerJSON(clave, valorPorDefecto) {
    try {
        const valor = JSON.parse(localStorage.getItem(clave));
        return valor ?? valorPorDefecto;
    } catch {
        return valorPorDefecto;
    }
}

function obtenerUsuario() {
    const usuario = leerJSON("usuario", null);
    // Una sesión guardada antes del cambio de seguridad no tiene token: hay que volver a entrar
    if (usuario && !usuario.token) {
        localStorage.removeItem("usuario");
        return null;
    }
    return usuario;
}

// Si el servidor dice que la sesión venció, se sale y se vuelve a ingresar
function sesionVencida(respuesta) {
    if (respuesta.status !== 401) return false;
    localStorage.removeItem("usuario");
    window.location.href = `login.html?volver=${encodeURIComponent(location.pathname.split("/").pop() || "index.html")}`;
    return true;
}

// Descarga el comprobante PDF de una compra (lo usan Mis compras y el checkout)
async function descargarComprobante(id, boton) {
    boton.disabled = true;
    boton.textContent = "Descargando…";

    try {
        const respuesta = await fetch(`${API}/ventas/${id}/pdf`, { headers: cabeceraSesion() });
        if (sesionVencida(respuesta)) return;
        if (!respuesta.ok) throw new Error();

        const url = URL.createObjectURL(await respuesta.blob());
        const enlace = document.createElement("a");
        enlace.href = url;
        enlace.download = `comprobante-vitaltacc-${id}.pdf`;
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);

    } catch {
        mostrarAviso("No pudimos descargar el comprobante. Probá de nuevo.", "error");
    } finally {
        boton.disabled = false;
        boton.textContent = "Descargar comprobante";
    }
}

function guardarSesion(usuario) {
    // Nunca se guarda la contraseña en el navegador
    const { contrasena, ...datos } = usuario || {};
    localStorage.setItem("usuario", JSON.stringify(datos));
    Carrito.unirCarritoInvitado();
}

function cerrarSesion() {
    avisarCierreSesion();
    localStorage.removeItem("usuario");
    window.location.href = "index.html";
}

function esPersonal(usuario) {
    return usuario && (usuario.rol === "ADMIN" || usuario.rol === "EMPLEADO");
}

// ---------------------------------------------------------
// CARRITO (uno por usuario, y otro para invitados)
// ---------------------------------------------------------

const Carrito = {

    clave() {
        const usuario = obtenerUsuario();
        return usuario ? `carrito_${usuario.id}` : "carrito_invitado";
    },

    items() {
        return leerJSON(this.clave(), [])
            .filter(item => item && item.id && Number(item.cantidad) > 0);
    },

    guardar(items, notificar = true) {
        localStorage.setItem(this.clave(), JSON.stringify(items));
        actualizarContadorCarrito();
        renderCarrito();
        if (notificar) document.dispatchEvent(new Event("carrito-cambio"));
    },

    cantidadTotal() {
        return this.items().reduce((suma, item) => suma + Number(item.cantidad), 0);
    },

    total() {
        return this.items().reduce(
            (suma, item) => suma + Number(item.precio) * Number(item.cantidad), 0);
    },

    agregar(producto, cantidad = 1) {
        const items = this.items();
        const existente = items.find(item => item.id === producto.id);
        const enCarrito = existente ? existente.cantidad : 0;
        const stock = Number(producto.stock) || 0;

        if (enCarrito + cantidad > stock) {
            mostrarAviso(
                stock - enCarrito > 0
                    ? `Solo quedan ${stock} unidades de ${producto.nombre}.`
                    : `Ya agregaste todo el stock de ${producto.nombre}.`,
                "error");
            return false;
        }

        if (existente) {
            existente.cantidad += cantidad;
            existente.stock = stock;
            existente.precio = producto.precio;
        } else {
            items.push({
                id: producto.id,
                nombre: producto.nombre,
                precio: producto.precio,
                stock,
                imagen: producto.imagen || null,
                cantidad
            });
        }

        this.guardar(items);
        return true;
    },

    cambiarCantidad(id, cambio) {
        const items = this.items();
        const item = items.find(i => i.id === id);
        if (!item) return;

        const nueva = item.cantidad + cambio;

        if (nueva > (Number(item.stock) || Infinity)) {
            mostrarAviso(`No hay más stock de ${item.nombre}.`, "error");
            return;
        }

        item.cantidad = nueva;
        this.guardar(items.filter(i => i.cantidad > 0));
    },

    quitar(id) {
        this.guardar(this.items().filter(i => i.id !== id));
    },

    vaciar() {
        localStorage.removeItem(this.clave());
        actualizarContadorCarrito();
        renderCarrito();
    },

    // Si eligió productos antes de iniciar sesión, no se pierden
    unirCarritoInvitado() {
        const invitado = leerJSON("carrito_invitado", []);
        if (!invitado.length) return;

        const items = this.items();

        invitado.forEach(producto => {
            const existente = items.find(i => i.id === producto.id);
            if (existente) {
                existente.cantidad = Math.min(
                    existente.cantidad + producto.cantidad,
                    Number(producto.stock) || existente.cantidad + producto.cantidad);
            } else {
                items.push(producto);
            }
        });

        localStorage.setItem(this.clave(), JSON.stringify(items));
        localStorage.removeItem("carrito_invitado");
    }
};

// ---------------------------------------------------------
// ÍCONOS (trazo de 1,8 px, mismo set en toda la tienda)
// ---------------------------------------------------------

const ICONOS = {
    bolsa: '<path d="M5 8h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
    usuario: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
    cerrar: '<path d="M6 6l12 12M18 6 6 18"/>',
    mas: '<path d="M12 5v14M5 12h14"/>',
    menos: '<path d="M5 12h14"/>',
    ubicacion: '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    reloj: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    telefono: '<path d="M5 4h3l1.5 4-2 1.5a11 11 0 0 0 7 7l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    instagram: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="0.6" fill="currentColor"/>',
    whatsapp: '<path d="M4 20l1.3-4A8.5 8.5 0 1 1 8 18.8z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a4 4 0 0 1-1.8-1.8l.8-1-1-2z"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    abajo: '<path d="m6 9 6 6 6-6"/>',
    derecha: '<path d="m9 6 6 6-6 6"/>',
    trigo: '<path d="M12 21V9"/><path d="M12 13c-2.5 0-4-1.6-4-4 2.5 0 4 1.6 4 4zM12 13c2.5 0 4-1.6 4-4-2.5 0-4 1.6-4 4zM12 9c-2 0-3.3-1.3-3.3-3.3C10.7 5.7 12 7 12 9zM12 9c2 0 3.3-1.3 3.3-3.3C13.3 5.7 12 7 12 9zM12 5.5V3"/>'
};

function icono(nombre, clase = "icono") {
    return `<svg class="${clase}" viewBox="0 0 24 24" aria-hidden="true">${ICONOS[nombre] || ""}</svg>`;
}

// ---------------------------------------------------------
// AVISOS
// ---------------------------------------------------------

function mostrarAviso(mensaje, tipo = "ok") {
    let contenedor = document.getElementById("avisos");

    if (!contenedor) {
        contenedor = document.createElement("div");
        contenedor.id = "avisos";
        contenedor.className = "avisos";
        contenedor.setAttribute("role", "status");
        contenedor.setAttribute("aria-live", "polite");
        document.body.appendChild(contenedor);
    }

    const aviso = document.createElement("div");
    aviso.className = `aviso aviso-${tipo}`;
    aviso.innerHTML = `<span class="aviso-punto" aria-hidden="true"></span><span></span>`;
    aviso.lastElementChild.textContent = mensaje;

    contenedor.appendChild(aviso);
    ubicarAvisos();

    while (contenedor.children.length > 3) {
        contenedor.firstElementChild.remove();
    }

    setTimeout(() => {
        aviso.classList.add("saliendo");
        setTimeout(() => aviso.remove(), 180);
    }, tipo === "error" ? 5000 : 2800);
}

// Con el carrito abierto, los avisos van arriba de su pie para no tapar "Finalizar compra"
function ubicarAvisos() {
    const contenedor = document.getElementById("avisos");
    if (!contenedor) return;
    const pie = document.querySelector("#panelCarrito:not([hidden]) #pieCarrito:not([hidden])");
    contenedor.style.bottom = pie ? `${pie.offsetHeight + 16}px` : "";
}

// ---------------------------------------------------------
// ENCABEZADO
// ---------------------------------------------------------

function renderEncabezado() {
    const destino = document.getElementById("encabezado");
    if (!destino) return;

    const usuario = obtenerUsuario();
    const pagina = document.body.dataset.pagina || "";

    // Admin y empleados no compran desde la tienda: no ven el carrito
    const puedeComprar = !esPersonal(usuario);

    const enlace = (href, texto, clave) =>
        `<a href="${href}" ${pagina === clave ? 'aria-current="page"' : ""}>${texto}</a>`;

    const cuenta = usuario
        ? `
            <div class="cuenta">
                <button class="boton-cuenta" type="button" aria-expanded="false" aria-controls="menuCuenta">
                    ${icono("usuario")}
                    <span>${escaparHTML(usuario.nombre)}</span>
                </button>
                <div class="menu-cuenta" id="menuCuenta" hidden>
                    <p class="menu-cuenta-nombre">${escaparHTML(usuario.nombre)} ${escaparHTML(usuario.apellido || "")}</p>
                    ${esPersonal(usuario)
            ? `<a href="admin.html">Ir al panel</a>`
            : `<a href="mis-compras.html">Mis compras</a>`}
                    <button type="button" data-accion="salir">Cerrar sesión</button>
                </div>
            </div>`
        : `<a class="boton-ingresar" href="login.html">${icono("usuario")}<span>Ingresar</span></a>`;

    destino.className = "encabezado";
    destino.innerHTML = `
        <a class="saltar-contenido" href="#contenido">Saltar al contenido</a>
        <div class="encabezado-interior">
            <a href="index.html" class="encabezado-logo">
                <img src="img/logo-vitaltacc.png" alt="VitalTacc, alimentos libres de gluten" width="150" height="60">
            </a>

            <nav class="encabezado-nav" id="navPrincipal" aria-label="Principal">
                ${enlace("index.html", "Inicio", "inicio")}
                <div class="nav-categorias" id="navCategorias">
                    ${enlace("productos.html", "Categorías", "productos")}
                    <button type="button" class="nav-categorias-abrir" aria-expanded="false" aria-controls="menuCategorias"
                        aria-label="Ver las categorías" hidden>${icono("abajo")}</button>
                    <div class="menu-categorias" id="menuCategorias"></div>
                </div>
                ${enlace("nosotras.html", "Nosotras", "nosotras")}
            </nav>

            <div class="encabezado-acciones">
                ${cuenta}
                ${puedeComprar ? `
                <button class="boton-carrito" type="button" aria-label="Abrir carrito">
                    ${icono("bolsa")}
                    <span class="contador-carrito" id="contadorCarrito">0</span>
                </button>` : ""}
                <button class="boton-menu" type="button" aria-label="Abrir menú" aria-expanded="false" aria-controls="navPrincipal">
                    ${icono("menu")}
                </button>
            </div>
        </div>
    `;

    destino.querySelector(".boton-carrito")?.addEventListener("click", abrirCarrito);

    const botonMenu = destino.querySelector(".boton-menu");
    const nav = destino.querySelector(".encabezado-nav");

    botonMenu.addEventListener("click", () => {
        const abierto = nav.classList.toggle("abierto");
        botonMenu.setAttribute("aria-expanded", String(abierto));
    });

    const botonCuenta = destino.querySelector(".boton-cuenta");

    if (botonCuenta) {
        const menu = destino.querySelector(".menu-cuenta");

        botonCuenta.addEventListener("click", evento => {
            evento.stopPropagation();
            const abrir = menu.hidden;
            menu.hidden = !abrir;
            botonCuenta.setAttribute("aria-expanded", String(abrir));
        });

        document.addEventListener("click", evento => {
            if (!menu.hidden && !menu.contains(evento.target)) {
                menu.hidden = true;
                botonCuenta.setAttribute("aria-expanded", "false");
            }
        });

        menu.querySelector('[data-accion="salir"]').addEventListener("click", cerrarSesion);
    }

    // El encabezado queda fijo arriba; al hacer scroll gana una sombra
    const marcarScroll = () => {
        destino.classList.toggle("con-sombra", window.scrollY > 8);
    };

    window.addEventListener("scroll", marcarScroll, { passive: true });
    marcarScroll();

    actualizarContadorCarrito();
    cargarMenuCategorias();
}

async function cargarMenuCategorias() {
    const contenedor = document.getElementById("navCategorias");
    if (!contenedor) return;

    let productos;
    try {
        productos = await obtenerProductos();
    } catch {
        return;
    }

    const porTipo = new Map();
    productos
        .filter(p => Number(p.stock) > 0 && p.categoria)
        .forEach(p => {
            const tipo = p.tipoCategoria || "";
            if (!porTipo.has(tipo)) porTipo.set(tipo, new Set());
            porTipo.get(tipo).add(p.categoria);
        });

    if (!porTipo.size) return;

    const orden = (a, b) => a.localeCompare(b, "es");
    const direccion = (clave, valor) => `productos.html?${clave}=${encodeURIComponent(valor)}`;
    const enlaces = categorias => [...categorias].sort(orden)
        .map(c => `<li><a href="${direccion("categoria", c)}">${escaparHTML(c)}</a></li>`).join("");

    const tipos = [...porTipo.keys()].filter(Boolean).sort(orden);

    contenedor.querySelector(".menu-categorias").innerHTML = `
        <a class="menu-categorias-todos" href="productos.html">Todos los productos</a>
        <ul class="menu-tipos">
            ${tipos.map((tipo, i) => `
            <li class="menu-tipo">
                <div class="menu-tipo-fila">
                    <a href="${direccion("tipo", tipo)}">${escaparHTML(tipo)}</a>
                    <button type="button" class="menu-tipo-abrir" aria-expanded="false" aria-controls="menuTipo${i}"
                        aria-label="Ver las categorías de ${escaparHTML(tipo)}">${icono("derecha")}</button>
                </div>
                <ul class="menu-subcategorias" id="menuTipo${i}">${enlaces(porTipo.get(tipo))}</ul>
            </li>`).join("")}
            ${enlaces(porTipo.get("") || [])}
        </ul>`;

    const botonAbrir = contenedor.querySelector(".nav-categorias-abrir");
    botonAbrir.hidden = false;
    contenedor.classList.add("con-menu");

    const cerrarTipos = (salvo = null) => {
        contenedor.querySelectorAll(".menu-tipo").forEach(li => {
            if (li === salvo) return;
            li.classList.remove("abierto");
            li.querySelector(".menu-tipo-abrir").setAttribute("aria-expanded", "false");
        });
    };

    const cerrarMenu = () => {
        contenedor.classList.remove("abierto");
        botonAbrir.setAttribute("aria-expanded", "false");
        cerrarTipos();
    };

    botonAbrir.addEventListener("click", () => {
        const abrir = !contenedor.classList.contains("abierto");
        contenedor.classList.toggle("abierto", abrir);
        botonAbrir.setAttribute("aria-expanded", String(abrir));
        if (!abrir) cerrarTipos();
    });

    contenedor.querySelectorAll(".menu-tipo-abrir").forEach(boton => {
        boton.addEventListener("click", () => {
            const tipo = boton.closest(".menu-tipo");
            const abrir = !tipo.classList.contains("abierto");
            cerrarTipos(tipo);
            tipo.classList.toggle("abierto", abrir);
            boton.setAttribute("aria-expanded", String(abrir));
        });
    });

    const enlaceCategorias = contenedor.querySelector("a");
    contenedor.addEventListener("keydown", evento => {
        if (evento.key !== "Escape") return;
        cerrarMenu();
        contenedor.classList.add("sin-hover");
        enlaceCategorias.focus();
    });
    contenedor.addEventListener("mouseleave", () => contenedor.classList.remove("sin-hover"));
    contenedor.addEventListener("focusin", evento => {
        if (evento.target !== enlaceCategorias) contenedor.classList.remove("sin-hover");
    });

    document.addEventListener("click", evento => {
        if (!contenedor.contains(evento.target)) cerrarMenu();
    });
}

// El botón del carrito "salta" para mostrar que entró algo
function saltarCarrito() {
    const boton = document.querySelector(".boton-carrito");
    if (!boton) return;
    boton.classList.remove("salto");
    void boton.offsetWidth; // reinicia la animación
    boton.classList.add("salto");
}

function actualizarContadorCarrito() {
    const contador = document.getElementById("contadorCarrito");
    if (!contador) return;

    const cantidad = Carrito.cantidadTotal();
    contador.textContent = cantidad;
    contador.hidden = cantidad === 0;
}

// ---------------------------------------------------------
// CARRITO LATERAL
// ---------------------------------------------------------

function crearPanelCarrito() {
    if (document.getElementById("panelCarrito")) return;

    const panel = document.createElement("div");
    panel.id = "panelCarrito";
    panel.className = "panel-carrito";
    panel.hidden = true;
    panel.innerHTML = `
        <div class="panel-carrito-fondo" data-cerrar></div>
        <aside class="panel-carrito-contenido" role="dialog" aria-modal="true" aria-labelledby="tituloCarrito">
            <header class="panel-carrito-encabezado">
                <h2 id="tituloCarrito">Tu pedido</h2>
                <button class="boton-icono" type="button" data-cerrar aria-label="Cerrar carrito">
                    ${icono("cerrar")}
                </button>
            </header>
            <div class="panel-carrito-lista" id="listaCarrito"></div>
            <footer class="panel-carrito-pie" id="pieCarrito"></footer>
        </aside>
    `;

    document.body.appendChild(panel);

    panel.querySelectorAll("[data-cerrar]").forEach(el =>
        el.addEventListener("click", cerrarCarrito));

    document.addEventListener("keydown", evento => {
        if (evento.key === "Escape" && !panel.hidden) cerrarCarrito();
    });

    panel.querySelector("#listaCarrito").addEventListener("click", evento => {
        const boton = evento.target.closest("button[data-id]");
        if (!boton) return;

        const id = Number(boton.dataset.id);
        const accion = boton.dataset.accion;

        if (accion === "sumar") Carrito.cambiarCantidad(id, 1);
        if (accion === "restar") Carrito.cambiarCantidad(id, -1);
        if (accion === "quitar") Carrito.quitar(id);
    });

    renderCarrito();
}

function renderCarrito() {
    const lista = document.getElementById("listaCarrito");
    const pie = document.getElementById("pieCarrito");
    if (!lista || !pie) return;

    const items = Carrito.items();

    if (!items.length) {
        lista.innerHTML = `
            <div class="carrito-vacio">
                ${icono("bolsa", "icono-grande")}
                <p>Tu pedido está vacío.</p>
                <a class="boton boton-secundario" href="productos.html">Ver productos</a>
            </div>
        `;
        pie.hidden = true;
        return;
    }

    lista.innerHTML = items.map(item => `
        <div class="item-carrito">
            <div class="item-carrito-foto">
                ${item.imagen
            ? `<img src="${escaparHTML(item.imagen)}" alt="" loading="lazy">`
            : icono("trigo", "icono-placeholder")}
            </div>
            <div class="item-carrito-info">
                <p class="item-carrito-nombre">${escaparHTML(item.nombre)}</p>
                <p class="item-carrito-precio">${pesos(item.precio)} c/u</p>
                <div class="selector-cantidad selector-chico">
                    <button type="button" data-accion="restar" data-id="${item.id}" aria-label="Restar uno">${icono("menos")}</button>
                    <span>${item.cantidad}</span>
                    <button type="button" data-accion="sumar" data-id="${item.id}" aria-label="Sumar uno"
                        ${item.cantidad >= item.stock ? "disabled" : ""}>${icono("mas")}</button>
                </div>
            </div>
            <div class="item-carrito-derecha">
                <p class="item-carrito-subtotal">${pesos(item.precio * item.cantidad)}</p>
                <button type="button" class="boton-texto" data-accion="quitar" data-id="${item.id}">Quitar</button>
            </div>
        </div>
    `).join("");

    pie.hidden = false;
    pie.innerHTML = `
        <div class="carrito-total">
            <span>Total</span>
            <strong>${pesos(Carrito.total())}</strong>
        </div>
        <a class="boton boton-primario boton-ancho" href="checkout.html">Finalizar compra</a>
    `;
}

let ultimoFoco = null;

function abrirCarrito() {
    crearPanelCarrito();
    const panel = document.getElementById("panelCarrito");
    ultimoFoco = document.activeElement;
    panel.hidden = false;
    document.body.classList.add("sin-scroll");
    requestAnimationFrame(() => panel.classList.add("visible"));
    panel.querySelector(".boton-icono").focus();
    ubicarAvisos();
}

function cerrarCarrito() {
    const panel = document.getElementById("panelCarrito");
    if (!panel) return;
    panel.classList.remove("visible");
    document.body.classList.remove("sin-scroll");
    setTimeout(() => { panel.hidden = true; ubicarAvisos(); }, 220);
    if (ultimoFoco) ultimoFoco.focus();
}

// ---------------------------------------------------------
// TARJETA DE PRODUCTO
// ---------------------------------------------------------

function datosProducto(prod) {
    const precioLista = Number(prod.precio) || 0;
    const precioFinal = prod.precioFinal != null ? Number(prod.precioFinal) : precioLista;
    const imagen = prod.imagenes && prod.imagenes.length
        ? `${API}${prod.imagenes[0].url}`
        : null;

    return {
        id: Number(prod.id),
        nombre: prod.nombre || "Producto",
        descripcion: prod.descripcion || "",
        categoria: prod.categoria || "",
        precioLista,
        precio: precioFinal,
        descuento: precioFinal < precioLista
            ? Math.round((1 - precioFinal / precioLista) * 100)
            : 0,
        stock: Number(prod.stock) || 0,
        imagen
    };
}

function crearTarjetaProducto(prod) {
    const p = datosProducto(prod);
    const tarjeta = document.createElement("article");
    tarjeta.className = "tarjeta-producto revelar";

    const pocasUnidades = p.stock <= 5;
    const puedeComprar = !esPersonal(obtenerUsuario());

    tarjeta.innerHTML = `
        <div class="tarjeta-foto">
            ${p.imagen
            ? `<img src="${escaparHTML(p.imagen)}" alt="${escaparHTML(p.nombre)}" loading="lazy">`
            : `<div class="tarjeta-sin-foto">${icono("trigo", "icono-placeholder")}</div>`}
            <span class="cinta-sin-tacc">Sin TACC</span>
            ${p.descuento ? `<span class="etiqueta-descuento">-${p.descuento}%</span>` : ""}
        </div>
        <div class="tarjeta-cuerpo">
            ${p.categoria ? `<p class="tarjeta-categoria">${escaparHTML(p.categoria)}</p>` : ""}
            <h3 class="tarjeta-nombre">${escaparHTML(p.nombre)}</h3>
            ${p.descripcion ? `<p class="tarjeta-descripcion">${escaparHTML(p.descripcion)}</p>` : ""}
            <div class="tarjeta-precio">
                <strong>${pesos(p.precio)}</strong>
                ${p.descuento ? `<s>${pesos(p.precioLista)}</s>` : ""}
            </div>
            <p class="tarjeta-stock ${pocasUnidades ? "pocas" : ""}">
                ${pocasUnidades ? `Últimas ${p.stock} unidades` : "Disponible"}
            </p>
            ${puedeComprar ? `
            <div class="tarjeta-acciones">
                <div class="selector-cantidad">
                    <button type="button" data-accion="restar" aria-label="Restar uno" disabled>${icono("menos")}</button>
                    <span data-cantidad>1</span>
                    <button type="button" data-accion="sumar" aria-label="Sumar uno" ${p.stock <= 1 ? "disabled" : ""}>${icono("mas")}</button>
                </div>
                <button type="button" class="boton boton-primario" data-accion="agregar">Agregar</button>
            </div>` : ""}
        </div>
    `;

    // El personal ve el catálogo como vidriera, sin botones de compra
    if (!puedeComprar) {
        return tarjeta;
    }

    let cantidad = 1;
    const visor = tarjeta.querySelector("[data-cantidad]");
    const restar = tarjeta.querySelector('[data-accion="restar"]');
    const sumar = tarjeta.querySelector('[data-accion="sumar"]');

    const refrescar = () => {
        visor.textContent = cantidad;
        restar.disabled = cantidad <= 1;
        sumar.disabled = cantidad >= p.stock;
    };

    restar.addEventListener("click", () => { cantidad = Math.max(1, cantidad - 1); refrescar(); });
    sumar.addEventListener("click", () => { cantidad = Math.min(p.stock, cantidad + 1); refrescar(); });

    tarjeta.querySelector('[data-accion="agregar"]').addEventListener("click", evento => {
        if (Carrito.agregar(p, cantidad)) {
            mostrarAviso(`${p.nombre} agregado a tu pedido.`);
            cantidad = 1;
            refrescar();

            const boton = evento.currentTarget;
            clearTimeout(boton._espera);
            boton.classList.add("agregado");
            boton.innerHTML = `${icono("check")}<span>Agregado</span>`;
            boton._espera = setTimeout(() => {
                boton.classList.remove("agregado");
                boton.textContent = "Agregar";
            }, 1400);

            saltarCarrito();
        }
    });

    return tarjeta;
}

function tarjetasEsqueleto(cantidad) {
    return Array.from({ length: cantidad }, () => `
        <div class="tarjeta-producto esqueleto" aria-hidden="true">
            <div class="tarjeta-foto"></div>
            <div class="tarjeta-cuerpo">
                <span></span><span></span><span></span>
            </div>
        </div>
    `).join("");
}

async function obtenerProductos() {
    const respuesta = await fetch(`${API}/productos`);
    if (!respuesta.ok) throw new Error("No se pudieron cargar los productos.");
    return respuesta.json();
}

// ---------------------------------------------------------
// PIE DE PÁGINA (con los datos que carga el panel admin)
// ---------------------------------------------------------

const DIAS = [
    ["horarioLunes", "Lunes"],
    ["horarioMartes", "Martes"],
    ["horarioMiercoles", "Miércoles"],
    ["horarioJueves", "Jueves"],
    ["horarioViernes", "Viernes"],
    ["horarioSabado", "Sábado"],
    ["horarioDomingo", "Domingo"]
];

const CONFIG_POR_DEFECTO = {
    nombreNegocio: "VitalTacc",
    direccion: "Roque Pérez 1660, Posadas, Misiones",
    telefono: "+54 9 3764 69-5417",
    horarioLunes: "09:00 - 20:00",
    horarioMartes: "09:00 - 20:00",
    horarioMiercoles: "09:00 - 20:00",
    horarioJueves: "09:00 - 20:00",
    horarioViernes: "09:00 - 20:00",
    horarioSabado: "09:00 - 20:00",
    horarioDomingo: "Cerrado",
    instagram: "https://www.instagram.com/megustavitaltacc/",
    whatsapp: "https://wa.me/5493764695417",
    ubicacionMaps: "https://maps.app.goo.gl/hDy4N3ZFMr4rXz6CA?g_st=iwb"
};

let configuracionNegocio = { ...CONFIG_POR_DEFECTO };

// Agrupa días seguidos con el mismo horario: "Lunes a sábado"
function resumirHorarios(config) {
    const grupos = [];

    DIAS.forEach(([campo, dia]) => {
        const horario = (config[campo] || "").trim() || "Cerrado";
        const ultimo = grupos[grupos.length - 1];

        if (ultimo && ultimo.horario === horario) {
            ultimo.hasta = dia;
        } else {
            grupos.push({ desde: dia, hasta: null, horario });
        }
    });

    return grupos.map(g => ({
        dias: g.hasta ? `${g.desde} a ${g.hasta.toLowerCase()}` : g.desde,
        horario: g.horario
    }));
}

function renderPie() {
    const destino = document.getElementById("pie");
    if (!destino) return;

    const c = configuracionNegocio;
    const horarios = resumirHorarios(c)
        .map(h => `<li><span>${escaparHTML(h.dias)}</span><span>${escaparHTML(h.horario)}</span></li>`)
        .join("");

    destino.className = "pie";
    destino.innerHTML = `
        <div class="pie-interior">
            <div class="pie-marca">
                <img src="img/logo-vitaltacc.png" alt="${escaparHTML(c.nombreNegocio)}" width="170" height="68" loading="lazy">
                <p>Alimentos libres de gluten en Posadas, Misiones.</p>
            </div>

            <div class="pie-bloque">
                <h2>Visitanos</h2>
                <p class="pie-dato">${icono("ubicacion")}<span>${escaparHTML(c.direccion)}</span></p>
                ${c.telefono ? `<p class="pie-dato">${icono("telefono")}<span>${escaparHTML(c.telefono)}</span></p>` : ""}
                <a class="pie-enlace" href="${escaparHTML(c.ubicacionMaps)}" target="_blank" rel="noopener noreferrer">Cómo llegar</a>
            </div>

            <div class="pie-bloque">
                <h2>Horarios</h2>
                <ul class="pie-horarios">${horarios}</ul>
            </div>

            <div class="pie-bloque">
                <h2>Seguinos</h2>
                <div class="pie-redes">
                    <a href="${escaparHTML(c.instagram)}" target="_blank" rel="noopener noreferrer">${icono("instagram")}<span>Instagram</span></a>
                    <a href="${escaparHTML(c.whatsapp)}" target="_blank" rel="noopener noreferrer">${icono("whatsapp")}<span>WhatsApp</span></a>
                </div>
            </div>
        </div>
        <p class="pie-legal">© ${new Date().getFullYear()} ${escaparHTML(c.nombreNegocio)}. Todos los derechos reservados.</p>
    `;
}

// Completa los bloques de la página que muestran datos del negocio
function aplicarConfigEnPagina() {
    const c = configuracionNegocio;

    document.querySelectorAll('[data-config="direccion"]').forEach(el => {
        el.textContent = c.direccion;
    });

    document.querySelectorAll('[data-config="mapa"]').forEach(el => {
        el.href = c.ubicacionMaps;
    });

    document.querySelectorAll('[data-config="instagram"]').forEach(el => {
        el.href = c.instagram;
    });

    document.querySelectorAll('[data-config="whatsapp"]').forEach(el => {
        el.href = c.whatsapp;
    });

    // "https://www.instagram.com/megustavitaltacc/" → "@megustavitaltacc"
    const usuarioInstagram = (c.instagram || "").split("?")[0].replace(/\/+$/, "").split("/").pop();
    document.querySelectorAll('[data-config="instagram-usuario"]').forEach(el => {
        el.textContent = usuarioInstagram ? `@${usuarioInstagram}` : "Instagram";
    });

    document.querySelectorAll('[data-config="horarios"]').forEach(el => {
        el.innerHTML = resumirHorarios(c)
            .map(h => `<span>${escaparHTML(h.dias)} <b>${escaparHTML(h.horario)}</b></span>`)
            .join("");
    });
}

async function cargarConfiguracion() {
    try {
        const respuesta = await fetch(`${API}/configuracion`);
        if (!respuesta.ok) return;

        const datos = await respuesta.json();

        Object.keys(CONFIG_POR_DEFECTO).forEach(clave => {
            const valor = typeof datos[clave] === "string" ? datos[clave].trim() : datos[clave];
            // Se ignoran los enlaces vacíos de ejemplo ("https://wa.me/")
            const esEjemplo = /^https?:\/\/(www\.)?(instagram\.com|wa\.me)\/?$/i.test(valor || "");
            if (valor && !esEjemplo) configuracionNegocio[clave] = valor;
        });

        renderPie();
        aplicarConfigEnPagina();
    } catch {
        // Sin conexión: quedan los datos por defecto
    }
}

// ---------------------------------------------------------
// ANIMACIÓN AL HACER SCROLL
// Los elementos con la clase "revelar" aparecen cuando entran en pantalla.
// ---------------------------------------------------------

let observadorRevelar = null;

function revelarAlScroll(raiz = document) {
    const elementos = raiz.querySelectorAll(".revelar:not(.revelado)");

    if (!("IntersectionObserver" in window)) {
        elementos.forEach(el => el.classList.add("revelado"));
        return;
    }

    if (!observadorRevelar) {
        observadorRevelar = new IntersectionObserver(entradas => {
            entradas.forEach(entrada => {
                if (!entrada.isIntersecting) return;
                entrada.target.classList.add("revelado");
                observadorRevelar.unobserve(entrada.target);
            });
        }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    }

    // Escalonado entre hermanos que aparecen juntos
    const porPadre = new Map();
    elementos.forEach(el => {
        const lista = porPadre.get(el.parentElement) || [];
        lista.push(el);
        porPadre.set(el.parentElement, lista);
    });

    porPadre.forEach(lista => lista.forEach((el, i) => {
        el.style.setProperty("--retraso", `${Math.min(i, 6) * 70}ms`);
        observadorRevelar.observe(el);
    }));
}

// Cada vez que el JS agrega tarjetas nuevas, se revelan también
new MutationObserver(() => revelarAlScroll()).observe(document.documentElement, {
    childList: true,
    subtree: true
});

// ---------------------------------------------------------
// INICIO
// ---------------------------------------------------------

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

document.addEventListener("DOMContentLoaded", () => {
    renderEncabezado();
    agregarOjitosContrasena();
    renderPie();
    aplicarConfigEnPagina();
    crearPanelCarrito();
    cargarConfiguracion();
    revelarAlScroll();
});
