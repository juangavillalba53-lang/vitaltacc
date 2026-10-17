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
        .toLowerCase()
        .trim();

    const contenedor = document.getElementById("resultadosBusquedaVenta");

    contenedor.innerHTML = "";

    if (texto.length < 2) {
        return;
    }

    const resultados = productosVenta.filter(p =>
        p.nombre.toLowerCase().includes(texto)
    );

    resultados.forEach(prod => {
        const precio = Number(prod.precioFinal ?? prod.precio) || 0;

        contenedor.innerHTML += `
            <div class="resultado-producto"
                 onclick="agregarProductoVenta(${prod.id})">
                ${prod.nombre} - ${pesosVenta(precio)}
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
            precio: Number(producto.precioFinal ?? producto.precio),
            precioOriginal: Number(producto.precio),
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

    if (!tbody) return;

    tbody.innerHTML = "";

    let total = 0;

    carrito.forEach(item => {
        const precio = Number(item.precio) || 0;
        const precioOriginal = Number(item.precioOriginal ?? item.precio);
        const tieneDescuento = precio < precioOriginal;
        const subtotal = precio * item.cantidad;

        total += subtotal;

        const tr = document.createElement("tr");

        const precioHTML = tieneDescuento
            ? `
                <span class="precio-tachado">
                    ${pesosVenta(precioOriginal)}
                </span>
                <br>
                <strong class="precio-oferta">
                    ${pesosVenta(precio)}
                </strong>
                <br>
                <small class="etiqueta-off">
                    ${Math.round((1 - precio / precioOriginal) * 100)}% OFF
                </small>
            `
            : `${pesosVenta(precio)}`;

        const subtotalHTML = tieneDescuento
            ? `
                <span class="precio-tachado">
                    ${pesosVenta((precioOriginal * item.cantidad))}
                </span>
                <br>
                <strong class="precio-oferta">
                    ${pesosVenta(subtotal)}
                </strong>
            `
            : `${pesosVenta(subtotal)}`;

        tr.innerHTML = `
            <td>${item.nombre}</td>

            <td>
                <div class="control-cantidad">
                    <button
                        class="btn-cantidad"
                        aria-label="Restar uno"
                        onclick="cambiarCantidad(${item.id}, -1)"
                        ${item.cantidad <= 1 ? "disabled" : ""}>
                        −
                    </button>

                    <span>${item.cantidad}</span>

                    <button
                        class="btn-cantidad"
                        aria-label="Sumar uno"
                        onclick="cambiarCantidad(${item.id}, 1)"
                        ${item.cantidad >= item.stock ? "disabled" : ""}>
                        +
                    </button>
                </div>

                <small class="stock-disponible">Stock: ${item.stock}</small>
            </td>

            <td>${precioHTML}</td>

            <td>${subtotalHTML}</td>

            <td>
                <button
                    class="btn-tabla btn-eliminar"
                    onclick="eliminarProductoCarrito(${item.id})">
                    Quitar
                </button>
            </td>
        `;

        tbody.appendChild(tr);
    });

    document.getElementById("totalVenta").innerText =
        "Total: " + pesosVenta(total);
}



function eliminarProductoCarrito(id) {

    carrito = carrito.filter(p => p.id !== id);

    renderCarrito();

}


function cambiarCantidad(id, cambio) {

    const producto = carrito.find(p => p.id === id);

    if (!producto) return;

    const nuevaCantidad = producto.cantidad + cambio;

    if (nuevaCantidad <= 0) {
        eliminarProductoCarrito(id);
        return;
    }

    if (nuevaCantidad > Number(producto.stock)) {
        alert("No hay stock suficiente para esa cantidad.");
        return;
    }

    producto.cantidad = nuevaCantidad;

    renderCarrito();
}


// ---------------------------------------------------------
// EMAIL PARA EL COMPROBANTE
// ---------------------------------------------------------

// Sin texto de ayuda fijo: solo aparece un aviso cuando el email se completa solo
const AYUDA_EMAIL_VENTA = "";

function esEmailValido(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function esEmailInterno(email) {
    return !email || String(email).toLowerCase().endsWith("@local.com");
}

function ponerAyudaEmail(texto, tipo) {
    const ayuda = document.getElementById("ayudaEmailVenta");
    if (!ayuda) return;
    ayuda.textContent = texto;
    if (tipo) ayuda.dataset.tipo = tipo;
    else delete ayuda.dataset.tipo;
}

// Saca el email que se completó solo al encontrar un cliente
function limpiarEmailAutocompletado() {
    const campo = document.getElementById("emailClienteVenta");
    if (!campo) return;
    if (campo.dataset.autocompletado === "1") {
        campo.value = "";
    }
    delete campo.dataset.autocompletado;
    campo.removeAttribute("aria-invalid");
    ponerAyudaEmail(AYUDA_EMAIL_VENTA);
}

function reiniciarEmailVenta() {
    const campo = document.getElementById("emailClienteVenta");
    if (!campo) return;
    campo.value = "";
    delete campo.dataset.autocompletado;
    campo.removeAttribute("aria-invalid");
    ponerAyudaEmail(AYUDA_EMAIL_VENTA);
}

document.addEventListener("DOMContentLoaded", () => {
    const campo = document.getElementById("emailClienteVenta");
    if (!campo) return;

    campo.addEventListener("input", () => {
        delete campo.dataset.autocompletado;
        campo.removeAttribute("aria-invalid");
    });
});

function cambiarTipoCliente() {

    const tipo = document.getElementById("tipoClienteVenta").value;

    const contenedor = document.getElementById("contenedorDniVenta");

    const dni = document.getElementById("dniClienteVenta");

    if (tipo === "REGISTRADO") {

        contenedor.classList.remove("oculto");

    } else {

        contenedor.classList.add("oculto");

        dni.value = "";

        clienteVenta = null;

        limpiarEmailAutocompletado();

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

    limpiarEmailAutocompletado();

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

            estado.innerText = "Cliente encontrado: " + usuario.nombre;

            estado.dataset.tipo = "ok";

            // Si ya tiene un email real guardado, se completa solo
            const campoEmail = document.getElementById("emailClienteVenta");

            if (campoEmail && !esEmailInterno(usuario.email) && !campoEmail.value.trim()) {
                campoEmail.value = usuario.email;
                campoEmail.dataset.autocompletado = "1";
                ponerAyudaEmail("Es el email que tiene guardado. Si dio otro, cambialo.", "ok");
            }

        })

        .catch(() => {

            estado.innerText = "No encontramos ese DNI. Completá los datos para registrar al cliente.";

            estado.dataset.tipo = "alerta";

            formularioNuevo.classList.remove("oculto");

        });

}


async function confirmarVenta() {

    if (carrito.length === 0) {
        alert("Agregar al menos un producto.");
        return;
    }

    const metodoPago =
        document.getElementById("metodoPagoVenta").value;

    const tipoCliente =
        document.getElementById("tipoClienteVenta").value;

    const venta = {
        empleadoId: usuario.id,
        metodoPago: metodoPago,
        tipoVenta: "LOCAL",
        detalles: carrito.map(item => ({
            productoId: item.id,
            cantidad: item.cantidad
        }))
    };

    const campoEmail = document.getElementById("emailClienteVenta");
    const emailCliente = campoEmail ? campoEmail.value.trim().toLowerCase() : "";

    if (emailCliente) {

        if (!esEmailValido(emailCliente)) {
            campoEmail.setAttribute("aria-invalid", "true");
            campoEmail.focus();
            alert("El email del cliente no es válido. Revisalo o dejalo vacío.");
            return;
        }

        venta.emailCliente = emailCliente;
    }

    if (tipoCliente === "REGISTRADO") {

        const dni =
            document.getElementById("dniClienteVenta").value.trim();

        if (!dni) {
            alert("Ingresar DNI.");
            return;
        }

        venta.dniCliente = dni;

        if (clienteVenta) {
            venta.clienteId = clienteVenta.id;
        } else {

            venta.nombreCliente =
                document.getElementById("nombreClienteVenta").value.trim();

            venta.apellidoCliente =
                document.getElementById("apellidoClienteVenta").value.trim();

            venta.telefonoCliente =
                document.getElementById("telefonoClienteVenta").value.trim();

            if (!venta.nombreCliente || !venta.apellidoCliente) {
                alert("Completar nombre y apellido.");
                return;
            }
        }
    }

    try {

        // 1. Registrar la venta
        const respuesta = await fetch("http://localhost:8080/ventas", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(venta)
        });

        if (!respuesta.ok) {
            const mensaje = await respuesta.text();
            throw new Error(mensaje || "No se pudo registrar la venta.");
        }

        const ventaGuardada = await respuesta.json();

        if (!ventaGuardada.id) {
            throw new Error(
                "La venta se registró, pero el servidor no devolvió su número."
            );
        }

        // 2. Descargar el PDF usando el ID real
        let pdfDescargado = false;

        try {

            const respuestaPdf = await fetch(
                `http://localhost:8080/ventas/${ventaGuardada.id}/pdf`
            );

            if (!respuestaPdf.ok) {
                throw new Error("No se pudo generar el comprobante PDF.");
            }

            const archivo = await respuestaPdf.blob();

            if (!archivo.size) {
                throw new Error("El PDF recibido está vacío.");
            }

            const url = URL.createObjectURL(archivo);
            const enlace = document.createElement("a");

            enlace.href = url;
            enlace.download =
                `comprobante-venta-${ventaGuardada.id}.pdf`;

            document.body.appendChild(enlace);
            enlace.click();
            enlace.remove();

            URL.revokeObjectURL(url);

            pdfDescargado = true;

        } catch (errorPdf) {
            console.error("Error al descargar el comprobante:", errorPdf);
        }

        // 3. Limpiar el formulario y actualizar los datos
        carrito = [];
        renderCarrito();

        document.getElementById("buscarProductoVenta").value = "";
        document.getElementById("resultadosBusquedaVenta").innerHTML = "";
        document.getElementById("dniClienteVenta").value = "";
        document.getElementById("estadoClienteVenta").innerText = "";

        document.getElementById("nuevoClienteVenta")
            .classList.add("oculto");

        clienteVenta = null;

        reiniciarEmailVenta();

        cargarProductosVenta();
        cargarProductos();
        cargarStock();
        cargarDashboard();

        const avisoMail = emailCliente
            ? ` El comprobante también se envía a ${emailCliente}.`
            : "";

        if (pdfDescargado) {
            alert(
                `Venta N.º ${ventaGuardada.id} registrada correctamente. ` +
                "Se descargó el comprobante PDF." + avisoMail
            );
        } else {
            alert(
                `Venta N.º ${ventaGuardada.id} registrada correctamente, ` +
                "pero no se pudo descargar el PDF. Podrás volver a intentarlo." + avisoMail
            );
        }

    } catch (error) {

        console.error("Error al registrar la venta:", error);

        alert(
            "No se pudo confirmar la venta.\n" + error.message
        );
    }
}


let temporizadorHistorialVentas = null;

function buscarHistorialVentas() {
    clearTimeout(temporizadorHistorialVentas);

    // Volver a la primera página al buscar o cambiar filtros.
    paginaHistorialActual = 1;

    temporizadorHistorialVentas = setTimeout(
        cargarHistorialVentas,
        300
    );
}

let paginaHistorialActual = 1;
const comprasPorPagina = 15;

async function cargarHistorialVentas() {
    const tabla = document.getElementById("tablaHistorialVentas");
    const estado = document.getElementById("estadoHistorialVentas");

    if (!tabla || !estado) return;

    const busqueda = document.getElementById("buscarHistorialVentas").value.trim();
    const fechaDesde = document.getElementById("fechaDesdeHistorial").value;
    const fechaHasta = document.getElementById("fechaHastaHistorial").value;
    const tipo = document.getElementById("tipoHistorialVentas").value;

    tabla.innerHTML = "";

    if (fechaDesde && fechaHasta && fechaDesde > fechaHasta) {
        estado.textContent = "La fecha desde no puede ser posterior a la fecha hasta.";
        return;
    }

    estado.textContent = "Cargando ventas...";

    try {
        const respuesta = await fetch(
            `http://localhost:8080/ventas/historial?busqueda=${encodeURIComponent(busqueda)}`
        );

        if (!respuesta.ok) {
            throw new Error("No se pudo consultar el historial.");
        }

        const ventas = await respuesta.json();

        const ventasFiltradas = ventas.filter(venta => {
            const fecha = venta.fecha ? String(venta.fecha).substring(0, 10) : "";

            return (!fechaDesde || (fecha && fecha >= fechaDesde)) &&
                (!fechaHasta || (fecha && fecha <= fechaHasta)) &&
                (!tipo || venta.tipoVenta === tipo);
        });

        ventasFiltradas.sort((a, b) => Number(b.id) - Number(a.id));

        const total = ventasFiltradas.length;
        const totalPaginas = Math.max(1, Math.ceil(total / comprasPorPagina));

        paginaHistorialActual = Math.min(paginaHistorialActual, totalPaginas);

        if (total === 0) {
            estado.textContent = "No se encontraron ventas con esos filtros.";
            mostrarControlesPaginacion(0, totalPaginas);
            return;
        }

        const inicio = (paginaHistorialActual - 1) * comprasPorPagina;
        const ventasPagina = ventasFiltradas.slice(inicio, inicio + comprasPorPagina);

        ventasPagina.forEach(venta => {
            const fila = document.createElement("tr");

            [
                venta.id ?? "-",
                venta.fecha ?? "-",
                venta.cliente || "Consumidor final",
                ({ LOCAL: "Local", ONLINE: "Online" })[venta.tipoVenta] || venta.tipoVenta || "-",
                venta.tipoVenta === "ONLINE" ? "Web" : (venta.empleado || "No informado"),
                ({
                    EFECTIVO: "Efectivo",
                    TRANSFERENCIA: "Transferencia",
                    TARJETA_DEBITO: "Tarjeta de débito",
                    TARJETA_CREDITO: "Tarjeta de crédito",
                    MERCADO_PAGO: "Mercado Pago",
                    MODO: "MODO"
                })[venta.metodoPago] || venta.metodoPago || "-",
                formatearImporteHistorial(venta.total)
            ].forEach(texto => {
                const celda = document.createElement("td");
                celda.textContent = texto;
                fila.appendChild(celda);
            });

            const celdaPDF = document.createElement("td");
            const botonPDF = document.createElement("button");

            botonPDF.type = "button";
            botonPDF.className = "btn-tabla btn-lotes";
            botonPDF.textContent = "Descargar PDF";
            botonPDF.addEventListener("click", () => descargarPDFHistorial(venta.id));

            celdaPDF.appendChild(botonPDF);
            fila.appendChild(celdaPDF);
            tabla.appendChild(fila);
        });

        estado.textContent = `Mostrando ${inicio + 1}–${Math.min(inicio + comprasPorPagina, total)} de ${total} compras.`;

        mostrarControlesPaginacion(total, totalPaginas);

    } catch (error) {
        console.error("Error al cargar el historial:", error);
        estado.textContent = "Error al cargar el historial. Verificá que el backend esté iniciado.";
    }
}

function mostrarControlesPaginacion(total, totalPaginas) {
    const tabla = document.getElementById("tablaHistorialVentas");
    if (!tabla) return;

    let controles = document.getElementById("controlesPaginacionHistorial");

    if (!controles) {
        controles = document.createElement("div");
        controles.id = "controlesPaginacionHistorial";
        controles.className = "paginacion-stock";
        tabla.closest("table").insertAdjacentElement("afterend", controles);
    }

    controles.innerHTML = "";

    const anterior = document.createElement("button");
    anterior.textContent = "Anterior";
    anterior.disabled = total === 0 || paginaHistorialActual <= 1;
    anterior.onclick = () => {
        paginaHistorialActual--;
        cargarHistorialVentas();
    };

    const texto = document.createElement("span");
    texto.textContent = `Página ${paginaHistorialActual} de ${totalPaginas}`;

    const siguiente = document.createElement("button");
    siguiente.textContent = "Siguiente";
    siguiente.disabled = total === 0 || paginaHistorialActual >= totalPaginas;
    siguiente.onclick = () => {
        paginaHistorialActual++;
        cargarHistorialVentas();
    };

    controles.append(anterior, texto, siguiente);
}

function formatearImporteHistorial(total) {
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS"
    }).format(Number(total) || 0);
}

async function descargarPDFHistorial(id) {
    try {
        const respuesta = await fetch(
            `http://localhost:8080/ventas/${id}/pdf`
        );

        if (!respuesta.ok) {
            throw new Error("No se pudo generar el comprobante.");
        }

        const archivo = await respuesta.blob();
        const url = URL.createObjectURL(archivo);
        const enlace = document.createElement("a");

        enlace.href = url;
        enlace.download = `comprobante-venta-${id}.pdf`;

        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);

    } catch (error) {
        console.error("Error al descargar el PDF:", error);
        alert("No se pudo descargar el comprobante de la venta N.º " + id);
    }
}


// Precios con formato argentino ($ 3.200,00)
function pesosVenta(valor) {
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS"
    }).format(Number(valor) || 0);
}
