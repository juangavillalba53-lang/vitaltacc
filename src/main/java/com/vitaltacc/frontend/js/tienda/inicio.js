// =========================================================
// INICIO: productos destacados
// =========================================================

document.addEventListener("DOMContentLoaded", async () => {
    const contenedor = document.getElementById("destacados");
    if (!contenedor) return;

    contenedor.innerHTML = tarjetasEsqueleto(4);

    try {
        const productos = (await obtenerProductos())
            .filter(p => Number(p.stock) > 0)
            // Primero los que tienen promoción
            .sort((a, b) => {
                const descA = a.precioFinal != null && a.precioFinal < a.precio ? 1 : 0;
                const descB = b.precioFinal != null && b.precioFinal < b.precio ? 1 : 0;
                return descB - descA;
            })
            .slice(0, 4);

        contenedor.innerHTML = "";

        if (!productos.length) {
            contenedor.innerHTML = `
                <div class="estado-vacio">
                    <h3>Estamos reponiendo</h3>
                    <p>Pronto vas a ver los productos disponibles acá.</p>
                </div>`;
            return;
        }

        productos.forEach(p => contenedor.appendChild(crearTarjetaProducto(p)));

    } catch {
        contenedor.innerHTML = `
            <div class="estado-vacio">
                <h3>No pudimos cargar los productos</h3>
                <p>Revisá tu conexión y volvé a intentar en unos minutos.</p>
            </div>`;
    }
});
