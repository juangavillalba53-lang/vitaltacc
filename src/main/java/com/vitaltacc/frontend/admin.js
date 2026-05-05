const usuario = JSON.parse(localStorage.getItem("usuario"));
let filtroActual = "TODOS";
let textoBusqueda = "";

console.log("VERSION NUEVA JS");

document.addEventListener("DOMContentLoaded", () => {

    // 🔥 validar login
    if (!usuario) {
        window.location.href = "login.html";
        return;
    }

    console.log("Usuario logueado:", usuario);

    aplicarPermisos(); // 🔥 importante

    cargarGeneral();
    cargarProductos();
    cargarLotesPorVencer();

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

    const hoy = new Date().toISOString().split("T")[0];

    if (!productoId) {
        alert("Seleccionar producto");
        return;
    }

    if (isNaN(cantidad) || cantidad <= 0) {
        alert("La cantidad debe ser mayor a 0");
        return;
    }

    if (!fecha) {
        alert("Seleccionar fecha de vencimiento");
        return;
    }

    if (fecha <= hoy) {
        alert("La fecha de vencimiento debe ser futura");
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
            if (!res.ok) throw new Error("Error backend");
            return res.json();
        })
        .then(data => {

            console.log("Lote creado:", data);

            const mensaje = "Lote creado - N°: " + data.numeroLote;

            const p = document.getElementById("loteCreado");
            if (p) {
                p.innerText = mensaje;
                p.className = "mensaje-exito"; // 🔥 ahora usa CSS
            }

            document.getElementById("cantidadLote").value = "";
            document.getElementById("vencimientoLote").value = "";

            cargarLotesPorVencer();
        })
        .catch(error => {
            console.error(error);
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

function cargarLotesPorVencer() {

    fetch("http://localhost:8080/lotes/por-vencer")
        .then(res => res.json())
        .then(data => {

            const lista = document.getElementById("lotesVencer");

            if (data.length === 0) {
                lista.innerHTML = "<li>No hay lotes próximos a vencer</li>";
                return;
            }

            // 🔥 ordenar por urgencia
            data.sort((a, b) => a.diasRestantes - b.diasRestantes);

            // 🔥 aplicar filtro primero
            let filtrados;

            if (filtroActual === "URGENTE") {
                filtrados = data.filter(l => l.alerta === "URGENTE");
            } else if (filtroActual === "ATENCION") {
                filtrados = data.filter(l => l.alerta === "ATENCION");
            } else {
                filtrados = data;
            }

            // 🔍 aplicar búsqueda DESPUÉS
            if (textoBusqueda) {
                filtrados = filtrados.filter(l =>
                    (l.producto || "").toLowerCase().includes(textoBusqueda) ||
                    (l.numeroLote || "").toLowerCase().includes(textoBusqueda)
                );
            }

            // 🔥 estado
            let mostrandoTodos = false;

            function renderLista() {

                lista.innerHTML = "";

                const datos = mostrandoTodos ? filtrados : filtrados.slice(0, 5);

                datos.forEach(lote => {

                    const li = document.createElement("li");

                    li.innerText = `${lote.producto} - Lote ${lote.numeroLote} - Vence en ${lote.diasRestantes} días`;

                    if (lote.alerta === "URGENTE") {
                        li.className = "lote-urgente";
                    } else if (lote.alerta === "ATENCION") {
                        li.className = "lote-atencion";
                    } else {
                        li.className = "lote-ok";
                    }

                    lista.appendChild(li);
                });

                // 🔥 botón ver más / menos
                if (filtrados.length > 5) {

                    const btn = document.createElement("button");
                    btn.className = "btn-ver";

                    if (!mostrandoTodos) {
                        btn.innerText = "Ver todos los lotes";
                        btn.onclick = () => {
                            mostrandoTodos = true;
                            renderLista();
                        };
                    } else {
                        btn.innerText = "Ver menos";
                        btn.onclick = () => {
                            mostrandoTodos = false;
                            renderLista();
                        };
                    }

                    lista.appendChild(btn);
                }
            }

            renderLista();

        })
        .catch(error => {
            console.error("ERROR REAL:", error);
        });
}

function setFiltro(filtro) {
    filtroActual = filtro;
    cargarLotesPorVencer();
}

function toggleBusqueda() {
    const input = document.getElementById("busquedaLote");

    if (input.style.display === "none") {
        input.style.display = "block";
        input.focus();
    } else {
        input.style.display = "none";
        input.value = "";
        textoBusqueda = "";
        cargarLotesPorVencer();
    }
}

function buscarLotes() {
    textoBusqueda = document.getElementById("busquedaLote").value.toLowerCase();
    cargarLotesPorVencer();
}

function aplicarPermisos() {

    if (usuario.rol === "EMPLEADO") {

        console.log("Modo empleado");

        // ❌ ocultar secciones de admin (cuando las agreguemos con ID)
        const reportes = document.getElementById("seccion-reportes");
        const usuarios = document.getElementById("seccion-usuarios");
        const promociones = document.getElementById("seccion-promociones");
        const filtro = document.getElementById("seccion-filtro");

        if (filtro) filtro.style.display = "none";
        if (reportes) reportes.style.display = "none";
        if (usuarios) usuarios.style.display = "none";
        if (promociones) promociones.style.display = "none";
    }

    if (usuario.rol === "ADMIN") {
        console.log("Modo admin");
    }
}