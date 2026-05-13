let carrito = JSON.parse(localStorage.getItem("carrito")) || [];

let clienteSeleccionado = null;

const usuario = JSON.parse(localStorage.getItem("usuario"));

function mostrarResumen() {

    const contenedor = document.getElementById("resumen");
    const totalSpan = document.getElementById("total");


    let total = 0;

    carrito.forEach(item => {

        const subtotal = item.precio * item.cantidad;

        const div = document.createElement("div");

        div.innerHTML = `
            <div class="item-carrito">
                <div class="info">
                    <strong>${item.nombre}</strong>
                    <p>$${item.precio} c/u</p>
                </div>

                <div class="controles">
                    x${item.cantidad}
                </div>

                <div class="subtotal">
                    $${subtotal.toFixed(2)}
                </div>
            </div>
        `;

        contenedor.appendChild(div);

        total += subtotal;
    });

    totalSpan.innerText = total.toFixed(2);

    // 🔥 ocultar sección cliente si es CLIENTE
    if (usuario && usuario.rol === "CLIENTE") {

        const seccionCliente =
            document.getElementById("seccion-cliente");

        if (seccionCliente) {
            seccionCliente.style.display = "none";
        }
    }
}

function buscarCliente() {

    const dni = document.getElementById("dniCliente").value;

    if (!dni) {
        alert("Ingresar DNI");
        return;
    }

    fetch(`http://localhost:8080/usuarios/dni/${dni}`)
        .then(res => {

            if (!res.ok) {
                throw new Error();
            }

            return res.json();
        })
        .then(usuario => {

            clienteSeleccionado = usuario;

            document.getElementById("clienteEncontrado").innerText =
                `Cliente: ${usuario.nombre}`;

            document.getElementById("crearClienteBox").style.display = "none";
        })
        .catch(() => {

            clienteSeleccionado = null;

            document.getElementById("clienteEncontrado").innerText =
                "Cliente no encontrado";

            document.getElementById("crearClienteBox").style.display = "block";
        });
}

function crearClienteRapido() {

    const dni = document.getElementById("dniCliente").value;
    const nombre = document.getElementById("nuevoNombre").value;
    const telefono = document.getElementById("nuevoTelefono").value;

    if (!dni || !nombre) {
        alert("Completar datos");
        return;
    }

    fetch("http://localhost:8080/usuarios", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            nombre: nombre,
            dni: dni,
            telefono: telefono,
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

            clienteSeleccionado = usuario;

            document.getElementById("clienteEncontrado").innerText =
                `Cliente creado: ${usuario.nombre}`;

            document.getElementById("crearClienteBox").style.display = "none";

            alert("Cliente creado correctamente");
        })
        .catch(() => {
            alert("Error creando cliente");
        });
}

function confirmarCompra() {

    const usuario = JSON.parse(localStorage.getItem("usuario"));

    if (!usuario) {
        alert("Debes iniciar sesión para comprar");
        window.location.href = "login.html";
        return;
    }

    if (carrito.length === 0) {
        alert("Carrito vacío");
        return;
    }

    const metodo = document.getElementById("metodoPago").value;

    if (!metodo) {
        alert("Seleccioná un método de pago");
        return;
    }

    const detalles = carrito.map(item => ({
        cantidad: item.cantidad,
        precioUnitario: item.precio,
        producto: { id: item.id }
    }));

    let clienteFinal = usuario;

    // 🔥 ADMIN / EMPLEADO
    if (usuario.rol === "ADMIN" || usuario.rol === "EMPLEADO") {

        if (!clienteSeleccionado) {
            alert("Debés buscar un cliente");
            return;
        }

        clienteFinal = clienteSeleccionado;
    }

    const venta = {
        cliente: { id: clienteFinal.id },
        metodoPago: metodo,

        tipoVenta:
            usuario.rol === "CLIENTE"
                ? "ONLINE"
                : "LOCAL",

        detalles: detalles
    };

    if (!confirm("¿Confirmar compra?")) return;

    fetch("http://localhost:8080/ventas", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(venta)
    })
        .then(res => {
            if (!res.ok) throw new Error();
            return res.json();
        })
        .then(() => {

            localStorage.removeItem("carrito");

            document.body.innerHTML = `
                <div style="text-align:center; margin-top:50px;">
                    <h1>✅ Compra realizada con éxito</h1>
                    <p>Gracias por tu compra</p>
                    <button onclick="window.location.href='index.html'">
                        Volver a la tienda
                    </button>
                </div>
            `;
        })
        .catch(() => {
            alert("Error al confirmar compra");
        });
}

mostrarResumen();