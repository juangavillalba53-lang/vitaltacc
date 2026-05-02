let carrito = [];

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
                <button onclick="agregarAlCarrito(${prod.id}, '${prod.nombre}', ${prod.precioFinal})">
                    Comprar
                </button>
            `;

            contenedor.appendChild(card);
        });

    });

// 🔥 Agregar al carrito
function agregarAlCarrito(id, nombre, precio) {
    carrito.push({ id, nombre, precio });
    actualizarCarrito();
}

// 🔥 Actualizar carrito
function actualizarCarrito() {

    const lista = document.getElementById("lista-carrito");
    const totalSpan = document.getElementById("total");

    lista.innerHTML = "";
    let total = 0;

    carrito.forEach(item => {

        const li = document.createElement("li");
        li.innerText = item.nombre + " - $" + item.precio;

        lista.appendChild(li);

        total += item.precio;
    });

    totalSpan.innerText = total;
}

// 🔥 Finalizar compra
function finalizarCompra() {

    if (carrito.length === 0) {
        alert("El carrito está vacío");
        return;
    }

    let detalles = [];

    carrito.forEach(item => {

        let existente = detalles.find(d => d.producto.id === item.id);

        if (existente) {
            existente.cantidad += 1;
        } else {
            detalles.push({
                cantidad: 1,
                precioUnitario: item.precio,
                producto: { id: item.id }
            });
        }
    });

    const venta = {
        cliente: { id: 1 },
        metodoPago: "EFECTIVO",
        tipoVenta: "ONLINE",
        detalles: detalles
    };

    fetch("http://localhost:8080/ventas", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(venta)
    })
        .then(res => {
            if (!res.ok) throw new Error("Error en la compra");
            return res.json();
        })
        .then(() => {
            alert("Compra realizada con éxito");
            carrito = [];
            actualizarCarrito();
        })
        .catch(() => {
            alert("Error al procesar la compra");
        });
}