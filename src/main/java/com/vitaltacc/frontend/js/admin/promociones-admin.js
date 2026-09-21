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