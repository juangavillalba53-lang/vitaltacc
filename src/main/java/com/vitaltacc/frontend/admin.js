const usuario = JSON.parse(localStorage.getItem("usuario"));
let filtroActual = "TODOS";
let textoBusqueda = "";

console.log("VERSION NUEVA JS");

document.addEventListener("DOMContentLoaded", () => {

    // 🔒 VALIDAR LOGIN
    if (!usuario) {
        window.location.href = "login.html";
        return;
    }

    if (usuario.rol !== "ADMIN" && usuario.rol !== "EMPLEADO") {
        alert("No tenés permisos para entrar acá");
        window.location.href = "index.html";
        return;
    }

    console.log("Usuario logueado:", usuario);

    aplicarPermisos();
    cargarGeneral();
    cargarProductos();
    cargarLotesPorVencer();
    cargarUsuarios();
    cargarStock();
    mostrarUsuario();
    cargarPromociones();

    const select = document.getElementById("productoLote");

    if (select) {
        select.addEventListener("change", function () {
            const selected = this.options[this.selectedIndex];
            const precio = selected.getAttribute("data-precio");
            document.getElementById("precioLote").value = "$" + precio;
        });
    }
    mostrarPanel("producto");
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
        body: JSON.stringify({ nombre, precio })
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
            const selectPromo = document.getElementById("productoPromo");

            select.innerHTML = "";

            if (selectPromo) {
                selectPromo.innerHTML = `
                    <option value="">
                        Promoción global (toda la tienda)
                    </option>
                `;
            }

            if (selectEditar) {
                selectEditar.innerHTML = "";
            }

            data.forEach(prod => {

                // SELECT LOTES
                const option = document.createElement("option");
                option.value = prod.id;
                option.text = prod.nombre;
                option.setAttribute("data-precio", prod.precio ?? 0);
                select.appendChild(option);

                // SELECT EDITAR
                if (selectEditar) {
                    const optionEditar = document.createElement("option");
                    optionEditar.value = prod.id;
                    optionEditar.text = prod.nombre;
                    selectEditar.appendChild(optionEditar);
                }
                // SELECT PROMOS
                if (selectPromo) {

                    const optionPromo = document.createElement("option");

                    optionPromo.value = prod.id;
                    optionPromo.text = prod.nombre;

                    selectPromo.appendChild(optionPromo);
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
            cargarStock();
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

        const reportes = document.getElementById("seccion-reportes");
        const usuarios = document.getElementById("seccion-usuarios");
        const promociones = document.getElementById("seccion-promociones");
        const filtro = document.getElementById("seccion-filtro");

        if (filtro) filtro.style.display = "none";
        if (reportes) reportes.style.display = "none";
        if (usuarios) usuarios.style.display = "none";
        if (promociones) promociones.style.display = "none";
    }
}

function mostrarPanel(panel) {

    // ocultar todos
    document.getElementById("panel-producto").style.display = "none";
    document.getElementById("panel-precio").style.display = "none";
    document.getElementById("panel-lote").style.display = "none";

    // mostrar seleccionado
    document.getElementById("panel-" + panel).style.display = "block";
}

function cargarUsuarios() {

    fetch("http://localhost:8080/usuarios")
        .then(res => res.json())
        .then(data => {

            const tabla = document.getElementById("tablaUsuarios");

            if (!tabla) return;

            tabla.innerHTML = "";

            data.forEach(user => {

                if (user.rol === "CLIENTE") return;

                const tr = document.createElement("tr");

                tr.innerHTML = `
                    <td>${user.id}</td>
                    <td>${user.nombre}</td>
                    <td>${user.email}</td>

                    <td>
                        <select onchange="cambiarRol(${user.id}, this.value)">
                            <option value="EMPLEADO" ${user.rol === "EMPLEADO" ? "selected" : ""}>EMPLEADO</option>
                            <option value="ADMIN" ${user.rol === "ADMIN" ? "selected" : ""}>ADMIN</option>
                        </select>
                    </td>

                    <td>
                        <button onclick="eliminarUsuario(${user.id})">
                            Eliminar
                        </button>
                    </td>
                `;

                tabla.appendChild(tr);
            });
        });
}

function crearUsuario() {

    const nombre = document.getElementById("nombreUsuario").value;
    const email = document.getElementById("emailUsuario").value;
    const contrasena = document.getElementById("contrasenaUsuario").value;
    const rol = document.getElementById("rolUsuario").value;

    if (!nombre || !email || !contrasena) {
        alert("Completar todos los campos");
        return;
    }

    fetch("http://localhost:8080/usuarios", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            nombre,
            email,
            contrasena,
            rol
        })
    })
        .then(res => {
            if (!res.ok) throw new Error();
            return res.json();
        })
        .then(() => {

            alert("Usuario creado");

            document.getElementById("nombreUsuario").value = "";
            document.getElementById("emailUsuario").value = "";
            document.getElementById("contrasenaUsuario").value = "";

            cargarUsuarios();
        })
        .catch(() => {
            alert("Error creando usuario");
        });
}

function cambiarRol(id, rol) {

    fetch(`http://localhost:8080/usuarios/${id}/rol`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ rol })
    })
        .then(() => {
            alert("Rol actualizado");
        })
        .catch(() => {
            alert("Error actualizando rol");
        });
}

function eliminarUsuario(id) {

    if (!confirm("¿Eliminar usuario?")) return;

    fetch(`http://localhost:8080/usuarios/${id}`, {
        method: "DELETE"
    })
        .then(() => {
            alert("Usuario eliminado");
            cargarUsuarios();
        })
        .catch(() => {
            alert("Error eliminando usuario");
        });
}

function mostrarUsuario() {

    const usuario = JSON.parse(localStorage.getItem("usuario"));
    const contenedor = document.getElementById("user-info");

    if (!contenedor) return;

    contenedor.innerHTML = `
        Hola, ${usuario.nombre}

        <button onclick="irTienda()">
            Tienda
        </button>

        <button onclick="logout()">
            Cerrar sesión
        </button>
    `;
}

function logout() {

    localStorage.removeItem("usuario");

    window.location.href = "login.html";
}

function irTienda() {
    window.location.href = "index.html";
}

// 🔥 STOCK

let productosStock = [];

function cargarStock() {

    fetch("http://localhost:8080/productos")
        .then(res => res.json())
        .then(data => {

            productosStock = data;

            renderStock(data);
        });
}

function renderStock(productos) {

    const tabla = document.getElementById("tablaStock");

    if (!tabla) return;

    tabla.innerHTML = "";

    productos.forEach(prod => {

        let clase = "stock-ok";

        if (prod.stock <= 5) {
            clase = "stock-bajo";
        }

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${prod.nombre}</td>

            <td class="${clase}">
                ${prod.stock}
            </td>

            <td>
                <button onclick="abrirModalLotes(${prod.id})">
                    Ver lotes
                </button>
            </td>
        `;

        tabla.appendChild(tr);
    });
}

function filtrarStock() {

    const texto = document
        .getElementById("buscarStock")
        .value
        .toLowerCase();

    const filtrados = productosStock.filter(p =>
        p.nombre.toLowerCase().includes(texto)
    );

    renderStock(filtrados);
}

function abrirModalLotes(productoId) {

    const modal = document.getElementById("modalLotes");

    const lista = document.getElementById("listaModalLotes");

    modal.style.display = "flex";

    lista.innerHTML = "Cargando...";

    fetch(`http://localhost:8080/lotes/producto/${productoId}`)
        .then(res => res.json())
        .then(data => {
            console.log(data);
            // 🔥 ocultar vencidos y stock 0
            const lotesValidos = data.filter(l =>
                l.cantidad > 0 &&
                l.diasRestantes >= 0
            );

            if (lotesValidos.length === 0) {

                lista.innerHTML = `
                    <p>No hay lotes disponibles</p>
                `;

                return;
            }

            let html = "";

            lotesValidos.forEach(lote => {

                let clase = "lote-ok";

                if (lote.alerta === "URGENTE") {
                    clase = "lote-urgente";
                }
                else if (lote.alerta === "ATENCION") {
                    clase = "lote-atencion";
                }

                html += `
                    <div class="${clase} modal-lote-item">

                        <strong>Lote:</strong>
                        ${lote.numeroLote}

                        <br><br>

                       <strong>Cantidad:</strong>
                        ${lote.cantidad}

                        <br><br>

                        <strong>Vence:</strong>
                        ${lote.fechaVencimiento}

                        <br>

                        <strong>Días restantes:</strong>
                        ${lote.diasRestantes}

                        ${usuario.rol === "ADMIN" ? `
                            <br><br>

                            <button class="btn-eliminar-lote"
                                onclick="eliminarLote(${lote.id}, ${productoId})">

                                Eliminar lote
                            </button>
                        ` : ""}

                    </div>
                `;
            });

            lista.innerHTML = html;
        });
}

function cerrarModalLotes() {

    document.getElementById("modalLotes").style.display = "none";
}

function eliminarLote(loteId, productoId) {

    if (!confirm("¿Eliminar lote?")) {
        return;
    }

    fetch(`http://localhost:8080/lotes/${loteId}`, {
        method: "DELETE"
    })
        .then(() => {

            alert("Lote eliminado");

            abrirModalLotes(productoId);

            cargarStock();
            cargarLotesPorVencer();
        })
        .catch(() => {
            alert("Error eliminando lote");
        });
}

// 🔥 PROMOCIONES

function crearPromocion() {

    const productoId = document.getElementById("productoPromo").value;

    const descripcion = document
        .getElementById("descripcionPromo")
        .value;

    const descuento = parseFloat(
        document.getElementById("descuentoPromo").value
    );

    const inicio = document.getElementById("inicioPromo").value;

    const fin = document.getElementById("finPromo").value;

    if (!descripcion || isNaN(descuento) || !inicio || !fin) {
        alert("Completar todos los campos");
        return;
    }

    if (descuento <= 0 || descuento > 100) {
        alert("Descuento inválido");
        return;
    }

    const body = {
        descripcion,
        descuento,
        fechaInicio: inicio,
        fechaFin: fin
    };

    // 🔥 si eligió producto
    if (productoId) {
        body.producto = {
            id: productoId
        };
    }

    fetch("http://localhost:8080/promociones", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    })
        .then(res => {
            if (!res.ok) throw new Error();
            return res.json();
        })
        .then(() => {

            alert("Promoción creada");

            document.getElementById("descripcionPromo").value = "";
            document.getElementById("descuentoPromo").value = "";
            document.getElementById("inicioPromo").value = "";
            document.getElementById("finPromo").value = "";

            cargarPromociones();
        })
        .catch(() => {
            alert("Error creando promoción");
        });
}

function cargarPromociones() {

    fetch("http://localhost:8080/promociones")
        .then(res => res.json())
        .then(data => {

            const tabla = document.getElementById("tablaPromociones");

            if (!tabla) return;

            tabla.innerHTML = "";

            data.forEach(promo => {

                const tr = document.createElement("tr");

                tr.innerHTML = `
                    <td>
                        ${promo.producto
                        ? promo.producto.nombre
                        : "GLOBAL"}
                    </td>

                    <td>
                        ${promo.descripcion}
                    </td>

                    <td>
                        ${promo.descuento}%
                    </td>

                    <td>
                        ${promo.fechaInicio}
                        →
                        ${promo.fechaFin}
                    </td>

                    <td>
                        <button onclick="eliminarPromocion(${promo.id})">
                            Eliminar
                        </button>
                    </td>
                `;

                tabla.appendChild(tr);
            });
        });
}

function eliminarPromocion(id) {

    if (!confirm("¿Eliminar promoción?")) return;

    fetch(`http://localhost:8080/promociones/${id}`, {
        method: "DELETE"
    })
        .then(() => {

            alert("Promoción eliminada");

            cargarPromociones();
        })
        .catch(() => {
            alert("Error eliminando promoción");
        });
}

