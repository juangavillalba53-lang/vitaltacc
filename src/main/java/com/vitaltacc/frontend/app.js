let carrito = JSON.parse(localStorage.getItem("carrito")) || [];

// 🔥 Cargar productos
fetch("http://localhost:8080/productos")
    .then(res => res.json())
    .then(data => {

        const contenedor = document.getElementById("lista-productos");

        data.forEach(prod => {

            const card = document.createElement("div");
            card.classList.add("card");

            card.innerHTML = `
                <h3>${prod.nombre}</h3>
                <p>$${prod.precioFinal}</p>

                <div>
                    <button onclick="cambiarCantidad(${prod.id}, -1)">-</button>
                    <span id="cant-${prod.id}">1</span>
                    <button onclick="cambiarCantidad(${prod.id}, 1)">+</button>
                </div>

                <button onclick="agregarDesdeCard(${prod.id}, '${prod.nombre}', ${prod.precioFinal})">
                    Agregar al carrito
                </button>
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

    carrito.forEach(item => {

        const subtotal = item.precio * item.cantidad;

        const li = document.createElement("li");

        li.innerHTML = `
            <div class="item-carrito">

                <div class="info">
                    <strong>${item.nombre}</strong>
                    <p>$${item.precio} c/u</p>
                </div>

                <div class="controles">
                    <button onclick="restarCantidad(${item.id})">-</button>
                    <span>${item.cantidad}</span>
                    <button onclick="sumarCantidad(${item.id})">+</button>
                </div>

                <div class="subtotal">
                    $${subtotal}
                </div>

                <button class="eliminar" onclick="eliminarProducto(${item.id})">🗑️</button>

            </div>
        `;

        lista.appendChild(li);

        total += subtotal;
        cantidadTotal += item.cantidad;
    });

    totalSpan.innerText = total;

    if (contador) {
        contador.innerText = cantidadTotal;
    }

    localStorage.setItem("carrito", JSON.stringify(carrito));
}

// 🔥 Finalizar compra (ARREGLADO)
function finalizarCompra() {

    if (carrito.length === 0) {
        alert("El carrito está vacío");
        return;
    }

    window.location.href = "checkout.html";
}

// 🔥 Sumar cantidad
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

function cambiarCantidad(id, cambio) {

    if (!cantidades[id]) {
        cantidades[id] = 1;
    }

    cantidades[id] += cambio;

    if (cantidades[id] < 1) {
        cantidades[id] = 1;
    }

    document.getElementById(`cant-${id}`).innerText = cantidades[id];
}

// 🔥 Agregar desde card
function agregarDesdeCard(id, nombre, precio) {

    let cantidad = cantidades[id] || 1;

    let existente = carrito.find(p => p.id === id);

    if (existente) {
        existente.cantidad += cantidad;
    } else {
        carrito.push({ id, nombre, precio, cantidad: cantidad });
    }

    cantidades[id] = 1;
    document.getElementById(`cant-${id}`).innerText = 1;

    actualizarCarrito();
}

// 🔥 Eliminar producto
function eliminarProducto(id) {
    carrito = carrito.filter(p => p.id !== id);
    actualizarCarrito();
}

// 🔥 Inicializar carrito al cargar
actualizarCarrito();