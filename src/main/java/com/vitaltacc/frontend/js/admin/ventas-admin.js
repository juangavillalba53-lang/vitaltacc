function cargarProductosVenta() {

    fetch("http://localhost:8080/productos")
        .then(res => res.json())
        .then(data => {

            productosVenta = data;

        });

}

function buscarProductosVenta() {

    const texto = document
        .getElementById("buscarProductoVenta")
        .value
        .toLowerCase();

    const contenedor =
        document.getElementById("resultadosBusquedaVenta");

    contenedor.innerHTML = "";

    if (texto.length < 2) {
        return;
    }

    const resultados = productosVenta.filter(p =>
        p.nombre.toLowerCase().includes(texto)
    );

    resultados.forEach(prod => {

        contenedor.innerHTML += `
            <div class="resultado-producto"
                 onclick="agregarProductoVenta(${prod.id})">

                ${prod.nombre}
                - $${Number(prod.precio).toFixed(2)}

            </div>
        `;

    });

}

function agregarProductoVenta(id) {

    const producto = productosVenta.find(p => p.id === id);

    if (!producto) return;

    const existente = carrito.find(p => p.id === id);

    if (existente) {
        existente.cantidad++;
    } else {

        carrito.push({
            id: producto.id,
            nombre: producto.nombre,
            precio: producto.precio,
            stock: producto.stock,
            cantidad: 1
        });

    }

    renderCarrito();

    document.getElementById("buscarProductoVenta").value = "";

    document.getElementById("resultadosBusquedaVenta").innerHTML = "";

}

function renderCarrito() {

    const tbody = document.getElementById("carritoVenta");

    tbody.innerHTML = "";

    let total = 0;

    carrito.forEach(item => {

        const subtotal = item.precio * item.cantidad;

        total += subtotal;

        tbody.innerHTML += `
            <tr>

                <td>${item.nombre}</td>

                <td>$${Number(item.precio).toFixed(2)}</td>

                <td>

                    <button onclick="cambiarCantidad(${item.id}, -1)">➖</button>

                    <div style="display:flex;flex-direction:column;align-items:center;">

                        <span>
                            ${item.cantidad}
                        </span>

                        <small>
                            Stock: ${item.stock}
                        </small>

                    </div>

                    <button
                        onclick="cambiarCantidad(${item.id}, 1)"
                        ${item.cantidad >= item.stock ? "disabled" : ""}
                    >
                        ➕
                    </button>

                </td>

                <td>$${Number(subtotal).toFixed(2)}</td>

                <td>
                    <button onclick="eliminarProductoCarrito(${item.id})">
                        ❌
                    </button>
                </td>

            </tr>
        `;

    });

    document.getElementById("totalVenta").innerText =
        "Total: $" + Number(total).toFixed(2);

}

function eliminarProductoCarrito(id) {

    carrito = carrito.filter(p => p.id !== id);

    renderCarrito();

}

function cambiarCantidad(id, cambio) {

    const producto = carrito.find(p => p.id === id);

    if (!producto) return;

    producto.cantidad += cambio;

    if (producto.cantidad <= 0) {

        eliminarProductoCarrito(id);

        return;
    }

    renderCarrito();

}

function cambiarTipoCliente() {

    const tipo = document.getElementById("tipoClienteVenta").value;

    const contenedor = document.getElementById("contenedorDniVenta");

    const dni = document.getElementById("dniClienteVenta");

    if (tipo === "REGISTRADO") {

        contenedor.classList.remove("oculto");

    } else {

        contenedor.classList.add("oculto");

        dni.value = "";

    }

}

let clienteVenta = null;

function buscarClientePorDni() {
    const formularioNuevo = document.getElementById("nuevoClienteVenta");

    const dni = document.getElementById("dniClienteVenta").value.trim();

    const estado = document.getElementById("estadoClienteVenta");

    clienteVenta = null;

    estado.innerText = "";

    formularioNuevo.classList.add("oculto");

    document.getElementById("nombreClienteVenta").value = "";
    document.getElementById("apellidoClienteVenta").value = "";
    document.getElementById("telefonoClienteVenta").value = "";

    if (!dni) return;

    fetch(`http://localhost:8080/usuarios/dni/${dni}`)
        .then(res => {

            if (!res.ok) {
                throw new Error();
            }

            return res.json();

        })

        .then(usuario => {

            clienteVenta = usuario;

            formularioNuevo.classList.add("oculto");

            estado.innerText = "✅ Cliente encontrado: " + usuario.nombre;

            estado.style.color = "green";

        })

        .catch(() => {

            estado.innerText = "⚠ Cliente no encontrado. Complete los datos para registrarlo.";

            estado.style.color = "#d97706";

            formularioNuevo.classList.remove("oculto");

        });

}