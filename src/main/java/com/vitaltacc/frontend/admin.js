document.addEventListener("DOMContentLoaded", () => {
    cargarGeneral();
    cargarProductos();

    const select = document.getElementById("productoLote");

    if (select) {
        select.addEventListener("change", function () {
            const selected = this.options[this.selectedIndex];
            const precio = selected.getAttribute("data-precio");
            document.getElementById("precioLote").value = "$" + precio;
        });
    }
});

// 🔥 CARGA GENERAL
function cargarGeneral() {
    cargarGrafico();
    filtrar();
}

// 🔥 FILTRAR POR MES
function filtrar() {

    const mes = parseInt(document.getElementById("mes").value);
    const anio = parseInt(document.getElementById("anio").value);

    const filtroTexto = document.getElementById("filtroActual");
    if (filtroTexto) {
        filtroTexto.innerText = `Mostrando datos de ${mes}/${anio}`;
    }

    // 🔥 TOTAL
    fetch(`http://localhost:8080/ventas/total-por-mes?mes=${mes}&anio=${anio}`)
        .then(res => res.json())
        .then(data => {
            document.getElementById("total").innerText = "$" + data;
        })
        .catch(() => {
            document.getElementById("total").innerText = "Error";
        });

    // 🔥 PRODUCTOS MÁS VENDIDOS
    fetch(`http://localhost:8080/ventas/mas-vendidos/por-mes?mes=${mes}&anio=${anio}`)
        .then(res => res.json())
        .then(data => {

            const lista = document.getElementById("masVendidos");
            lista.innerHTML = "";

            if (data.length === 0) {
                lista.innerHTML = "<li>No hay ventas en este mes</li>";
                return;
            }

            data.forEach(item => {
                const li = document.createElement("li");
                li.innerText = `${item.producto} - ${item.cantidadVendida} vendidos`;
                lista.appendChild(li);
            });
        })
        .catch(() => {
            document.getElementById("masVendidos").innerHTML = "<li>Error</li>";
        });

    // 🔥 TOP CLIENTES
    fetch(`http://localhost:8080/ventas/top-clientes/por-mes?mes=${mes}&anio=${anio}`)
        .then(res => res.json())
        .then(data => {

            const lista = document.getElementById("topClientes");
            lista.innerHTML = "";

            if (data.length === 0) {
                lista.innerHTML = "<li>No hay clientes en este mes</li>";
                return;
            }

            data.forEach((item, index) => {
                const li = document.createElement("li");
                li.innerText = `${index + 1}. ${item.cliente} - $${item.totalGastado}`;
                lista.appendChild(li);
            });
        })
        .catch(() => {
            document.getElementById("topClientes").innerHTML = "<li>Error</li>";
        });

    cargarGrafico();
}

// 🔥 GRÁFICO
let grafico = null;

function cargarGrafico() {

    const anio = parseInt(document.getElementById("anio").value);

    fetch(`http://localhost:8080/ventas/total-por-anio?anio=${anio}`)
        .then(res => res.json())
        .then(data => {

            const meses = [];
            const totales = [];

            data.forEach(item => {
                meses.push(item.mes);
                totales.push(item.total);
            });

            const ctx = document.getElementById("graficoVentas").getContext("2d");

            if (grafico) {
                grafico.destroy();
            }

            grafico = new Chart(ctx, {
                type: "bar",
                data: {
                    labels: meses,
                    datasets: [{
                        label: "Ventas por mes",
                        data: totales
                    }]
                }
            });
        })
        .catch(() => {
            console.error("Error gráfico");
        });
}

// 🔥 CREAR PRODUCTO
function crearProducto() {

    const nombre = document.getElementById("nombreProducto").value;
    const precio = parseFloat(document.getElementById("precioProducto").value);

    if (!nombre || isNaN(precio)) {
        alert("Completar datos");
        return;
    }

    fetch("http://localhost:8080/productos", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            nombre: nombre,
            precio: precio
        })
    })
        .then(res => {
            if (!res.ok) throw new Error();
            return res.json();
        })
        .then(() => {
            alert("Producto creado");

            document.getElementById("nombreProducto").value = "";
            document.getElementById("precioProducto").value = "";

            cargarProductos();
        })
        .catch(() => {
            alert("Error al crear producto");
        });
}

// 🔥 CARGAR PRODUCTOS (LOTE + EDITAR)
function cargarProductos() {

    fetch("http://localhost:8080/productos")
        .then(res => res.json())
        .then(data => {

            const select = document.getElementById("productoLote");
            const selectEditar = document.getElementById("productoEditar");

            select.innerHTML = "";

            if (selectEditar) {
                selectEditar.innerHTML = "";
            }

            data.forEach(prod => {

                // SELECT LOTES
                const option = document.createElement("option");
                option.value = prod.id;
                option.text = prod.nombre;
                option.setAttribute("data-precio", prod.precioOriginal ?? 0);
                select.appendChild(option);

                // SELECT EDITAR
                if (selectEditar) {
                    const optionEditar = document.createElement("option");
                    optionEditar.value = prod.id;
                    optionEditar.text = prod.nombre;
                    selectEditar.appendChild(optionEditar);
                }
            });

            // SETEAR PRECIO INICIAL
            if (select.options.length > 0) {
                const first = select.options[0];
                const precio = first.getAttribute("data-precio");
                document.getElementById("precioLote").value = "$" + precio;
            }

        })
        .catch(() => {
            alert("Error cargando productos");
        });
}

// 🔥 CREAR LOTE
function crearLote() {

    const productoId = document.getElementById("productoLote").value;
    const cantidad = parseInt(document.getElementById("cantidadLote").value);
    const fecha = document.getElementById("vencimientoLote").value;

    if (!productoId || isNaN(cantidad) || !fecha) {
        alert("Completar datos");
        return;
    }

    fetch("http://localhost:8080/lotes", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            cantidad: cantidad,
            fechaVencimiento: fecha,
            producto: { id: productoId }
        })
    })
        .then(res => {
            if (!res.ok) throw new Error();
            return res.json();
        })
        .then(() => {
            alert("Lote creado");

            document.getElementById("cantidadLote").value = "";
            document.getElementById("vencimientoLote").value = "";
        })
        .catch(() => {
            alert("Error al crear lote");
        });
}

// 🔥 ACTUALIZAR PRECIO
function actualizarPrecio() {

    const id = document.getElementById("productoEditar").value;
    const nuevoPrecio = parseFloat(document.getElementById("nuevoPrecio").value);

    if (!id || isNaN(nuevoPrecio)) {
        alert("Completar datos");
        return;
    }

    fetch(`http://localhost:8080/productos/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            precioOriginal: nuevoPrecio
        })
    })
        .then(res => {
            if (!res.ok) throw new Error();
            return res.json();
        })
        .then(() => {
            alert("Precio actualizado");

            document.getElementById("nuevoPrecio").value = "";

            cargarProductos();
        })
        .catch(() => {
            alert("Error al actualizar precio");
        });
}