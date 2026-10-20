// =========================================================
// VENTA EN EL LOCAL E HISTORIAL DE VENTAS
// Los productos (productosVenta) los carga cargarProductos()
// =========================================================

const NOMBRES_ESTADO_PEDIDO = {
    RECIBIDO: "Recibido",
    PREPARANDO: "En preparación",
    LISTO_PARA_RETIRAR: "Listo para retirar",
    ENVIADO: "Enviado",
    ENTREGADO: "Entregado",
    CANCELADO: "Cancelado"
};

// El select de métodos de pago se arma con los mismos nombres que usa toda la app
document.addEventListener("DOMContentLoaded", () => {
    const select = document.getElementById("metodoPagoVenta");
    if (!select) return;
    select.replaceChildren(...Object.entries(NOMBRES_PAGO).map(([valor, texto]) => new Option(texto, valor)));
});

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

    const buscado = normalizarTexto(texto);

    contenedor.innerHTML = productosVenta
        .filter(p => normalizarTexto(p.nombre).includes(buscado))
        .map(prod => `
            <div class="resultado-producto"
                 onclick="agregarProductoVenta(${prod.id})">
                ${escaparHTML(prod.nombre)} - ${pesos(prod.precioFinal ?? prod.precio)}
            </div>
        `).join("");
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
                    ${pesos(precioOriginal)}
                </span>
                <br>
                <strong class="precio-oferta">
                    ${pesos(precio)}
                </strong>
                <br>
                <small class="etiqueta-off">
                    ${Math.round((1 - precio / precioOriginal) * 100)}% OFF
                </small>
            `
            : `${pesos(precio)}`;

        const subtotalHTML = tieneDescuento
            ? `
                <span class="precio-tachado">
                    ${pesos((precioOriginal * item.cantidad))}
                </span>
                <br>
                <strong class="precio-oferta">
                    ${pesos(subtotal)}
                </strong>
            `
            : `${pesos(subtotal)}`;

        tr.innerHTML = `
            <td>${escaparHTML(item.nombre)}</td>

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

    document.getElementById("totalVenta").textContent = "Total: " + pesos(total);
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
        mostrarAviso("No hay stock suficiente para esa cantidad.", "error");
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

    estado.textContent = "";

    formularioNuevo.classList.add("oculto");

    document.getElementById("nombreClienteVenta").value = "";
    document.getElementById("apellidoClienteVenta").value = "";
    document.getElementById("telefonoClienteVenta").value = "";

    limpiarEmailAutocompletado();

    if (!dni) return;

    pedir(`/usuarios/dni/${encodeURIComponent(dni)}`)
        .then(usuario => {

            clienteVenta = usuario;

            formularioNuevo.classList.add("oculto");

            estado.textContent = "Cliente encontrado: " + usuario.nombre;

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

            estado.textContent = "No encontramos ese DNI. Completá los datos para registrar al cliente.";

            estado.dataset.tipo = "alerta";

            formularioNuevo.classList.remove("oculto");

        });

}

async function confirmarVenta() {

    if (carrito.length === 0) {
        mostrarAviso("Agregá al menos un producto.", "error");
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
            mostrarAviso("El email del cliente no es válido. Revisalo o dejalo vacío.", "error");
            return;
        }

        venta.emailCliente = emailCliente;
    }

    if (tipoCliente === "REGISTRADO") {

        const dni =
            document.getElementById("dniClienteVenta").value.trim();

        if (!dni) {
            mostrarAviso("Ingresá el DNI del cliente.", "error");
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
                mostrarAviso("Completá el nombre y el apellido del cliente.", "error");
                return;
            }
        }
    }

    try {

        // 1. Registrar la venta
        const ventaGuardada = await pedir("/ventas", { method: "POST", json: venta });

        if (!ventaGuardada.id) {
            throw new Error(
                "La venta se registró, pero el servidor no devolvió su número."
            );
        }

        // 2. Descargar el comprobante
        const pdfDescargado = await descargarComprobante(ventaGuardada.id);

        // 3. Limpiar el formulario y actualizar los datos
        limpiarVenta();
        cargarProductos();
        cargarDashboard();

        const avisoMail = emailCliente
            ? ` El comprobante también se envía a ${emailCliente}.`
            : "";

        if (pdfDescargado) {
            mostrarAviso(`Venta N.º ${ventaGuardada.id} registrada. Se descargó el comprobante.${avisoMail}`, "ok");
        } else {
            mostrarAviso(
                `Venta N.º ${ventaGuardada.id} registrada, pero no se pudo descargar el comprobante. ` +
                `Lo podés bajar desde el historial.${avisoMail}`, "alerta");
        }

    } catch (error) {
        mostrarAviso("No se pudo confirmar la venta: " + error.message, "error");
    }
}

// Deja la venta en blanco: sin productos, sin cliente y sin email
function limpiarVenta() {

    carrito = [];
    renderCarrito();

    document.getElementById("buscarProductoVenta").value = "";
    document.getElementById("resultadosBusquedaVenta").innerHTML = "";
    document.getElementById("dniClienteVenta").value = "";
    document.getElementById("estadoClienteVenta").textContent = "";
    document.getElementById("nombreClienteVenta").value = "";
    document.getElementById("apellidoClienteVenta").value = "";
    document.getElementById("telefonoClienteVenta").value = "";
    document.getElementById("nuevoClienteVenta").classList.add("oculto");

    clienteVenta = null;
    reiniciarEmailVenta();
}

// Botón "Cancelar": si ya hay algo cargado, pregunta antes de borrar
async function cancelarVenta() {

    const hayAlgo = carrito.length > 0
        || document.getElementById("dniClienteVenta").value.trim()
        || document.getElementById("emailClienteVenta")?.value.trim();

    if (!hayAlgo) return;

    if (carrito.length > 0) {
        const seguro = await confirmar({
            titulo: "¿Cancelar esta venta?",
            mensaje: carrito.length === 1
                ? "Se borra el producto cargado y los datos del cliente."
                : `Se borran los ${carrito.length} productos cargados y los datos del cliente.`,
            aceptar: "Cancelar venta",
            cancelar: "Seguir con la venta"
        });
        if (!seguro) return;
    }

    limpiarVenta();
    document.getElementById("buscarProductoVenta").focus();
    mostrarAviso("Venta cancelada.", "ok");
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
        const ventas = await pedir(`/ventas/historial?busqueda=${encodeURIComponent(busqueda)}`);

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
                fechaCorta(venta.fecha) || "-",
                venta.cliente || "Consumidor final",
                ({ LOCAL: "Local", ONLINE: "Online" })[venta.tipoVenta] || venta.tipoVenta || "-",
                venta.tipoVenta === "ONLINE" ? "Web" : (venta.empleado || "No informado"),
                nombrePago(venta.metodoPago),
                pesos(venta.total)
            ].forEach(texto => {
                const celda = document.createElement("td");
                celda.textContent = texto;
                fila.appendChild(celda);
            });

            // Pedidos online que todavía no se entregaron o se cancelaron
            if (venta.estadoPedido && venta.estadoPedido !== "ENTREGADO") {
                const estado = document.createElement("small");
                estado.className = `historial-estado estado-${venta.estadoPedido.toLowerCase()}`;
                estado.textContent = NOMBRES_ESTADO_PEDIDO[venta.estadoPedido] || venta.estadoPedido;
                fila.children[3].appendChild(estado);
            }

                        // Si hubo devoluciones, debajo del total se ve lo que se devolvió
            if (Number(venta.devuelto) > 0) {
                const devuelto = document.createElement("small");
                devuelto.className = "historial-devuelto";
                devuelto.textContent = `Devuelto ${pesos(venta.devuelto)}`;
                fila.lastElementChild.appendChild(devuelto);
            }

            const celdaPDF = document.createElement("td");
            const botonPDF = document.createElement("button");

            botonPDF.type = "button";
            botonPDF.className = "btn-tabla btn-lotes";
            botonPDF.textContent = "Descargar PDF";
            botonPDF.addEventListener("click", async () => {
                botonPDF.disabled = true;
                if (!await descargarComprobante(venta.id)) {
                    mostrarAviso(`No se pudo descargar el comprobante de la venta N.º ${venta.id}.`, "error");
                }
                botonPDF.disabled = false;
            });

            const acciones = document.createElement("div");
            acciones.className = "acciones-producto";
            acciones.appendChild(botonPDF);

            // Dentro del plazo (2 días) y si no se devolvió todo, se puede registrar una devolución
            if (venta.devolvible && Number(venta.devuelto) < Number(venta.total)) {
                const botonDevolver = document.createElement("button");
                botonDevolver.type = "button";
                botonDevolver.className = "btn-tabla btn-editar";
                botonDevolver.textContent = "Devolver";
                botonDevolver.addEventListener("click", () => abrirDevolucion(venta.id));
                acciones.appendChild(botonDevolver);
            }

            celdaPDF.appendChild(acciones);
            fila.appendChild(celdaPDF);
            tabla.appendChild(fila);
        });

        estado.textContent = `Mostrando ${inicio + 1}–${Math.min(inicio + comprasPorPagina, total)} de ${total} compras.`;

        mostrarControlesPaginacion(total, totalPaginas);

    } catch (error) {
        estado.textContent = "No se pudo cargar el historial: " + error.message;
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

// Baja el PDF de una venta. Devuelve true si se pudo.
async function descargarComprobante(id) {
    try {
        const respuesta = await fetch(`${API}/ventas/${id}/pdf`);
        if (!respuesta.ok) return false;

        const archivo = await respuesta.blob();
        if (!archivo.size) return false;

        const url = URL.createObjectURL(archivo);
        const enlace = document.createElement("a");

        enlace.href = url;
        enlace.download = `comprobante-venta-${id}.pdf`;

        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return true;

    } catch {
        return false;
    }
}
