let carrito = JSON.parse(localStorage.getItem("carrito")) || [];

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
                    $${subtotal}
                </div>
            </div>
        `;

        contenedor.appendChild(div);

        total += subtotal;
    });

    totalSpan.innerText = total;
}

function confirmarCompra() {

    let detalles = carrito.map(item => ({
        cantidad: item.cantidad,
        precioUnitario: item.precio,
        producto: { id: item.id }
    }));

    const metodo = document.getElementById("metodoPago").value;
    if (!metodo) {
        alert("Seleccioná un método de pago");
        return;
    }
    const venta = {
        cliente: { id: 1 },
        metodoPago: metodo,
        tipoVenta: "ONLINE",
        detalles: detalles
    };
    if (!confirm("¿Confirmar compra?")) {
        return;
    }

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
            document.body.innerHTML = `
                <div style="text-align:center; margin-top:50px;">
                    <h1>✅ Compra realizada con éxito</h1>
                    <p>Gracias por tu compra</p>
                    <button onclick="window.location.href='index.html'">
                        Volver a la tienda
                    </button>
                </div>
            `;

            localStorage.removeItem("carrito");

            window.location.href = "index.html";
        })
        .catch(() => {
            alert("Error al confirmar compra");
        });
}

mostrarResumen();