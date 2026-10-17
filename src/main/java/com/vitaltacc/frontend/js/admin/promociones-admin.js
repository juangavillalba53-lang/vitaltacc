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
        alert("El descuento tiene que ser entre 1 y 100 %.");
        return;
    }

    // Las fechas vienen como AAAA-MM-DD, así que se pueden comparar como texto
    if (fin < inicio) {
        alert("La fecha de fin no puede ser anterior a la de inicio.");
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

    pedir("/promociones", { method: "POST", json: body })
        .then(() => {

            mostrarAviso("Promoción creada.", "ok");

            document.getElementById("descripcionPromo").value = "";
            document.getElementById("descuentoPromo").value = "";
            document.getElementById("inicioPromo").value = "";
            document.getElementById("finPromo").value = "";

            cargarPromociones();
        })
        .catch(error => {
            mostrarAviso("No se pudo crear la promoción: " + error.message, "error");
        });
}


// 10 promociones por página
const PROMOCIONES_POR_PAGINA = 10;
let promocionesVigentes = [];
let paginaPromociones = 1;

// Se ven las vigentes y las que todavía no empezaron (las terminadas no)
function cargarPromociones() {
    pedir("/promociones/vigentes")
        .then(data => {
            promocionesVigentes = Array.isArray(data) ? data : [];
            renderPromociones();
        })
        .catch(error => {
            console.error("Error cargando promociones:", error);
        });
}

function renderPromociones() {
    const tabla = document.getElementById("tablaPromociones");

    if (!tabla) return;

    tabla.innerHTML = "";

    const { items, pagina, totalPaginas } =
        paginar(promocionesVigentes, paginaPromociones, PROMOCIONES_POR_PAGINA);

    paginaPromociones = pagina;

    items.forEach(promo => {
        const tr = document.createElement("tr");

        const empezo = diasHasta(promo.fechaInicio) <= 0;
        const estado = empezo
            ? `<span class="etiqueta-promo vigente">Vigente</span>`
            : `<span class="etiqueta-promo proxima">Empieza el ${fechaCorta(promo.fechaInicio)}</span>`;

        tr.innerHTML = `
            <td>${promo.producto ? escaparHTML(promo.producto.nombre) : "Toda la tienda"}</td>
            <td>${escaparHTML(promo.descripcion)}</td>
            <td>${promo.descuento}%</td>
            <td>
                ${fechaCorta(promo.fechaInicio)} → ${fechaCorta(promo.fechaFin)}
                ${estado}
            </td>
            <td>
                <button class="btn-tabla btn-eliminar" onclick="eliminarPromocion(${promo.id})">
                    Eliminar
                </button>
            </td>
        `;

        tabla.appendChild(tr);
    });

    dibujarPaginacion(
        document.getElementById("paginacionPromociones"),
        pagina,
        totalPaginas,
        nueva => {
            paginaPromociones = nueva;
            renderPromociones();
        });
}


async function eliminarPromocion(id) {

    const nombre = textoDeFila("td:nth-child(2)");

    const seguro = await confirmar({
        titulo: "¿Eliminar esta promoción?",
        mensaje: (nombre ? `«${nombre}» ` : "La promoción ") +
            "deja de aplicarse en la tienda y en el local.",
        aceptar: "Eliminar promoción"
    });

    if (!seguro) return;

    try {
        await pedir(`/promociones/${id}`, { method: "DELETE" });
        mostrarAviso("Promoción eliminada.", "ok");
        cargarPromociones();
        cargarProductosVenta();
        cargarDashboard();
    } catch (error) {
        mostrarAviso("No se pudo eliminar: " + error.message, "error");
    }
}
