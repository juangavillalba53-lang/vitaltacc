const usuarioStorage = JSON.parse(localStorage.getItem("usuario"));

const carritoKey = usuarioStorage
    ? `carrito_${usuarioStorage.id}`
    : "carrito_invitado";

let carrito = JSON.parse(localStorage.getItem(carritoKey)) || [];

// 🔥 Cargar productos
fetch("http://localhost:8080/productos")
    .then(res => res.json())
    .then(data => {

        const contenedor = document.getElementById("lista-productos");

        if (!contenedor) return;

        data.slice(0, 3).forEach(prod => {

            // 🔥 ocultar si no hay stock
            if (!prod.stock || prod.stock <= 0) return;

            const card = document.createElement("div");
            card.classList.add("product-card");

            // 🔥 PRECIOS CORRECTOS
            let precioOriginal = Number(prod.precio || 0);
            let precioFinal = prod.precioFinal != null
                ? Number(prod.precioFinal)
                : precioOriginal;

            let imagenHTML = "";

            if (prod.imagenes && prod.imagenes.length > 0) {

                imagenHTML = `
                    <img 
                        src="http://localhost:8080${prod.imagenes[0].url}" 
                        alt="${prod.nombre}"
                        class="img-producto"
                    >
                `;
            }

            card.innerHTML = `

                <div class="product-img">

                    ${imagenHTML}

                    <span class="product-badge">
                        Sin TACC
                    </span>

                </div>

                <div class="product-body">

                    <h3 class="product-name">
                        ${prod.nombre}
                    </h3>

                    <p class="product-stock">
                        Stock disponible: ${prod.stock}
                    </p>

                    <div class="product-footer">

                        <div class="product-price">

                            ${precioFinal < precioOriginal
                    ? `
                                    <div class="precio-original">
                                        $${precioOriginal.toFixed(2)}
                                    </div>

                                    <div class="precio-final">
                                        $${precioFinal.toFixed(2)}
                                    </div>
                                `
                    : `
                                    <div class="precio-final">
                                        $${precioOriginal.toFixed(2)}
                                    </div>
                                `
                }

                        </div>

                        <div class="product-qty">

                            <button
                                class="qty-btn"
                                onclick="cambiarCantidad(${prod.id}, -1)"
                            >
                                −
                            </button>

                            <span
                                class="qty-num"
                                id="cant-${prod.id}"
                            >
                                1
                            </span>

                            <button
                                class="qty-btn"
                                onclick="cambiarCantidad(${prod.id}, 1, ${prod.stock})"
                            >
                                +
                            </button>

                        </div>

                    </div>

                    <button
                        class="btn-add"
                        onclick="agregarDesdeCard(
                            ${prod.id},
                            '${prod.nombre}',
                            ${precioFinal},
                            ${prod.stock}
                        )"
                    >
                        Agregar al carrito
                    </button>

                </div>
            `;

            contenedor.appendChild(card);
        });

    });

// 🔥 Actualizar carrito
function actualizarCarrito() {

    const lista = document.getElementById("lista-carrito");
    const totalSpan = document.getElementById("total");
    const contador = document.getElementById("contador-carrito");

    lista.innerHTML = "";
    let total = 0;
    let cantidadTotal = 0;

    // 🔥 limpiar datos inválidos
    carrito = carrito.filter(item => item && item.precio != null && item.cantidad > 0);

    carrito.forEach(item => {

        let precio = Number(item.precio) || 0;
        let cantidad = Number(item.cantidad) || 0;

        let subtotal = precio * cantidad;

        const li = document.createElement("li");

        li.innerHTML = `
            <div class="item-carrito">

                <div class="info">
                    <strong>${item.nombre || "Producto"}</strong>
                    <p>$${precio.toFixed(2)} c/u</p>
                </div>

                <div class="controles">
                    <button onclick="restarCantidad(${item.id})">-</button>
                    <span>${cantidad}</span>
                    <button onclick="sumarCantidad(${item.id})">+</button>
                </div>

                <div class="subtotal">
                    $${subtotal.toFixed(2)}
                </div>

                <button class="eliminar" onclick="eliminarProducto(${item.id})">🗑️</button>

            </div>
        `;

        lista.appendChild(li);

        total += subtotal;
        cantidadTotal += cantidad;
    });

    totalSpan.innerText = total.toFixed(2);

    if (contador) {
        contador.innerText = cantidadTotal;
    }

    localStorage.setItem(carritoKey, JSON.stringify(carrito));
}

// 🔥 Finalizar compra
function finalizarCompra() {

    const usuario = JSON.parse(localStorage.getItem("usuario"));

    // ❌ No logueado
    if (!usuario) {
        alert("Tenés que iniciar sesión para comprar");
        window.location.href = "login.html";
        return;
    }

    // ❌ carrito vacío
    if (carrito.length === 0) {
        alert("El carrito está vacío");
        return;
    }

    // ✅ OK
    window.location.href = "checkout.html";
}

// 🔥 Sumar cantidad (con control)
function sumarCantidad(id) {

    let item = carrito.find(p => p.id === id);

    if (item) {
        item.cantidad += 1;
    }

    actualizarCarrito();
}

// 🔥 Restar cantidad
function restarCantidad(id) {

    let item = carrito.find(p => p.id === id);

    if (item) {
        item.cantidad -= 1;

        if (item.cantidad <= 0) {
            carrito = carrito.filter(p => p.id !== id);
        }
    }

    actualizarCarrito();
}

// 🔥 Cantidades en cards
let cantidades = {};

function cambiarCantidad(id, cambio, stock) {

    if (!cantidades[id]) {
        cantidades[id] = 1;
    }

    // 🔥 impedir pasar stock máximo
    if (cambio > 0 && cantidades[id] >= stock) {
        return;
    }

    cantidades[id] += cambio;

    // 🔥 mínimo 1
    if (cantidades[id] < 1) {
        cantidades[id] = 1;
    }

    document.getElementById(`cant-${id}`).innerText = cantidades[id];
}

// 🔥 Agregar desde card (con control de stock y seguridad)
function agregarDesdeCard(id, nombre, precio, stock) {

    let cantidad = cantidades[id] || 1;

    let existente = carrito.find(p => p.id === id);
    let totalEnCarrito = existente ? existente.cantidad : 0;

    if (cantidad + totalEnCarrito > stock) {
        alert("No hay suficiente stock disponible");
        return;
    }

    if (existente) {
        existente.cantidad += cantidad;
    } else {
        carrito.push({
            id,
            nombre,
            precio: precio ?? 0,
            cantidad
        });
    }

    cantidades[id] = 1;
    document.getElementById(`cant-${id}`).innerText = 1;

    actualizarCarrito();
    mostrarToast(`${nombre} agregado al carrito`);
}

// 🔥 Eliminar producto
function eliminarProducto(id) {
    carrito = carrito.filter(p => p.id !== id);
    actualizarCarrito();
}

// 🔥 Inicializar
actualizarCarrito();

function abrirCarrito() {

    document.body.style.overflow = "hidden";

    document.getElementById("modalCarrito").style.display = "flex";
}

function cerrarCarrito() {

    document.body.style.overflow = "auto";

    document.getElementById("modalCarrito").style.display = "none";
}

function mostrarToast(texto) {

    const toast = document.getElementById("toast");

    toast.innerText = texto;

    toast.classList.add("mostrar");

    setTimeout(() => {

        toast.classList.remove("mostrar");

    }, 2000);
}

// 🔥 BIENVENIDA INVITADO

function cerrarBienvenida() {

    document.getElementById(
        "bienvenidaInvitado"
    ).style.display = "none";
}

window.addEventListener("load", () => {

    const usuario =
        JSON.parse(localStorage.getItem("usuario"));

    const bienvenida =
        document.getElementById("bienvenidaInvitado");

    if (!bienvenida) return;

    if (usuario) {

        bienvenida.style.display = "none";

    } else {

        bienvenida.style.display = "block";
    }
});

// 🔥 MODAL REGISTRO

function abrirRegistro() {

    document.getElementById("modalRegistro").style.display = "flex";
}

function cerrarRegistro() {

    document.getElementById("modalRegistro").style.display = "none";
}

function registrarse() {

    const nombre = document.getElementById("registroNombre").value;
    const dni = document.getElementById("registroDni").value;
    const telefono = document.getElementById("registroTelefono").value;
    const email = document.getElementById("registroEmail").value;

    const contrasena = document.getElementById("registroContrasena").value;
    const repetir = document.getElementById("registroContrasena2").value;

    if (!nombre || !dni || !telefono || !email || !contrasena) {

        alert("Completar todos los campos");
        return;
    }

    if (contrasena !== repetir) {

        alert("Las contraseñas no coinciden");
        return;
    }

    fetch("http://localhost:8080/usuarios", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({

            nombre,
            dni,
            telefono,
            email,
            contrasena,
            rol: "CLIENTE"
        })
    })
        .then(res => {

            if (!res.ok) {
                throw new Error();
            }

            return res.json();
        })
        .then(usuario => {

            localStorage.setItem("usuario", JSON.stringify(usuario));

            mostrarToast("Cuenta creada correctamente");

            location.reload();
        })
        .catch(() => {

            alert("Error al registrarse");
        });
}

function controlarGuestCard() {

    const card =
        document.getElementById("guestCard");

    if (!card) return;

    const usuario =
        JSON.parse(localStorage.getItem("usuario"));

    if (usuario) {

        card.style.display = "none";

    } else {

        card.style.display = "block";
    }
}

controlarGuestCard();

function cerrarBienvenida() {

    document.getElementById(
        "bienvenidaInvitado"
    ).style.display = "none";
}

window.addEventListener("load", () => {

    const usuario =
        JSON.parse(localStorage.getItem("usuario"));

    const bienvenida =
        document.getElementById("bienvenidaInvitado");

    const guestCard =
        document.getElementById("guestCard");

    if (usuario) {

        if (bienvenida)
            bienvenida.style.display = "none";

        if (guestCard)
            guestCard.style.display = "none";
    }
});

