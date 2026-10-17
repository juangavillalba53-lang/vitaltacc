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


// 10 promociones por página
const PROMOCIONES_POR_PAGINA = 10;
let promocionesVigentes = [];
let paginaPromociones = 1;

function cargarPromociones() {
    fetch("http://localhost:8080/promociones/activas")
        .then(res => {
            if (!res.ok) {
                throw new Error("No se pudieron cargar las promociones");
            }
            return res.json();
        })
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

        tr.innerHTML = `
            <td>
                ${promo.producto
                ? promo.producto.nombre
                : "Toda la tienda"}
            </td>
            <td>${promo.descripcion}</td>
            <td>${promo.descuento}%</td>
            <td>${promo.fechaInicio} → ${promo.fechaFin}</td>
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
        mensaje: nombre
            ? `«${nombre}» deja de aplicarse en la tienda. No se puede deshacer.`
            : "Deja de aplicarse en la tienda. No se puede deshacer.",
        aceptar: "Eliminar promoción"
    });

    if (!seguro) return;

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