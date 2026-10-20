// =========================================================
// PRODUCTOS: alta, edición, baja, stock y categorías
// =========================================================

function crearProducto() {
    const nombre = document.getElementById("nombreProducto").value.trim();

    const precio = parseFloat(
        document.getElementById("precioProducto").value
    );

    const descripcion = document.getElementById("descripcionProducto").value.trim();

    const categoriaId = document.getElementById("categoriaProducto").value;

    if (
        !nombre ||
        isNaN(precio) ||
        precio <= 0 ||
        !descripcion ||
        !categoriaId
    ) {
        mostrarAviso("Completá el nombre, un precio válido, la descripción y la categoría.", "error");
        return;
    }

    const formData = new FormData();

    formData.append("nombre", nombre);
    formData.append("precio", precio);
    formData.append("descripcion", descripcion);
    formData.append("categoriaId", categoriaId);

    galeriaAlta.completarFormulario(formData, false);

    const boton = document.getElementById("btnCrearProducto");
    boton.disabled = true;

    pedir("/productos", {
        method: "POST",
        body: formData
    })
        .finally(() => { boton.disabled = false; })
        .then(() => {
            mostrarAviso("Producto creado.", "ok");

            document.getElementById("nombreProducto").value = "";
            document.getElementById("precioProducto").value = "";
            document.getElementById("descripcionProducto").value = "";
            document.getElementById("tipoCategoriaProducto").value = "";
            document.getElementById("categoriaProducto").innerHTML =
                '<option value="">Seleccionar categoría</option>';
            galeriaAlta.limpiar();

            cargarProductos();
        })
        .catch(error => {
            mostrarAviso("No se pudo crear el producto: " + error.message, "error");
        });
}

// ---------------------------------------------------------
// Productos y lotes se piden una sola vez y alimentan todo:
// los selects de lote y promoción, la tabla de stock y el
// buscador de la venta en el local.
// ---------------------------------------------------------

let productosStock = [];
let productosVenta = [];
let carrito = [];
let lotesTodos = [];

async function cargarProductos() {

    try {
        const [productos, lotes] = await Promise.all([
            pedir("/productos"),
            pedir("/lotes").catch(() => [])
        ]);

        lotesTodos = (lotes || []).map(lote => ({
            productoId: lote.producto?.id ?? lote.productoId,
            numeroLote: lote.numeroLote,
            cantidad: lote.cantidad,
            fechaVencimiento: lote.fechaVencimiento,
            diasRestantes: diasHasta(lote.fechaVencimiento)
        }));

        productosStock = productos;
        productosVenta = productos;

        llenarSelectsProductos(productos);
        filtrarStock(false);

    } catch (error) {
        mostrarAviso("No se pudieron cargar los productos: " + error.message, "error");
    }
}

function llenarSelectsProductos(productos) {

    const selectLote = document.getElementById("productoLote");
    const selectPromo = document.getElementById("productoPromo");
    const loteElegido = selectLote.value;
    const promoElegida = selectPromo?.value;

    const sinElegir = new Option("Elegí un producto", "");
    sinElegir.dataset.placeholder = "";

    selectLote.replaceChildren(sinElegir, ...productos.map(prod => {
        const opcion = new Option(prod.nombre, prod.id);
        opcion.dataset.precio = prod.precio ?? 0;
        return opcion;
    }));

    if (selectPromo) {
        selectPromo.replaceChildren(
            new Option("Promoción global (toda la tienda)", ""),
            ...productos.map(prod => new Option(prod.nombre, prod.id))
        );
        if (promoElegida) selectPromo.value = promoElegida;
    }

    // Si ya había un producto elegido, se respeta
    if (loteElegido && productos.some(p => String(p.id) === loteElegido)) {
        selectLote.value = loteElegido;
    }

    mostrarPrecioLote();
}

// El precio del producto elegido en el formulario de lotes
function mostrarPrecioLote() {
    const opcion = document.getElementById("productoLote").selectedOptions[0];
    document.getElementById("precioLote").value = opcion?.value ? pesos(opcion.dataset.precio) : "";
}

// Selects de tipo y categoría (se usan al crear y al editar)

function opcionesSelect(select, textoVacio, items, seleccionado) {

    select.replaceChildren(new Option(textoVacio, ""));

    items.forEach(item => {
        const opcion = new Option(item.nombre, item.id);
        opcion.selected = String(item.id) === String(seleccionado ?? "");
        select.add(opcion);
    });
}

function llenarTipos(select, seleccionado) {

    return pedir("/tipos-categoria")
        .then(tipos => opcionesSelect(select, "Seleccionar tipo", tipos, seleccionado));
}

function llenarCategorias(select, tipoId, seleccionado) {

    opcionesSelect(select, "Seleccionar categoría", [], null);

    if (!tipoId) {
        return Promise.resolve();
    }

    return pedir(`/categorias/tipo/${tipoId}`)
        .then(categorias =>
            opcionesSelect(select, "Seleccionar categoría", categorias, seleccionado));
}

// Formulario de alta: tipos y categorías
function cargarTiposCategoria() {

    return llenarTipos(document.getElementById("tipoCategoriaProducto"));
}

function cargarCategoriasPorTipo(tipoId) {

    return llenarCategorias(document.getElementById("categoriaProducto"), tipoId);
}

// ---------------------------------------------------------
// Tabla de stock (Inventario)
// ---------------------------------------------------------

let paginaStockActual = 1;
const productosPorPagina = 15;

// Clases según el nivel: vencido/urgente en rojo, atención en amarillo
const CLASES_VENCIMIENTO = {
    vencido: "estado-critico",
    urgente: "estado-critico",
    atencion: "estado-alerta",
    ok: "estado-ok"
};

function renderStock(productos) {

    const tabla = document.getElementById("tablaStock");
    const paginacion = document.getElementById("paginacionStock");

    if (!tabla) return;

    tabla.innerHTML = "";

    const totalPaginas = Math.ceil(
        productos.length / productosPorPagina
    );

    if (totalPaginas === 0) {
        paginaStockActual = 1;
    } else if (paginaStockActual > totalPaginas) {
        paginaStockActual = totalPaginas;
    }

    const inicio = (paginaStockActual - 1) * productosPorPagina;
    const productosPagina = productos.slice(
        inicio,
        inicio + productosPorPagina
    );

    if (productosPagina.length === 0) {
        tabla.innerHTML = `
            <tr>
                <td colspan="5">No se encontraron productos.</td>
            </tr>
        `;
    }

    productosPagina.forEach(prod => {

        const stock = Number(prod.stock) || 0;

        const lotesConStock = lotesTodos
            .filter(l =>
                Number(l.productoId) === Number(prod.id) &&
                Number(l.cantidad) > 0
            )
            .sort((a, b) => Number(a.diasRestantes) - Number(b.diasRestantes));

        // Lotes vencidos que siguen en el local, y el disponible que vence primero
        const vencidos = lotesConStock.filter(l => Number(l.diasRestantes) < 0);
        const loteProximo = lotesConStock.find(l => Number(l.diasRestantes) >= 0);

        let estado;
        let claseEstado;
        let detalleLote = "";

        if (vencidos.length) {

            estado = "Lote vencido · retirar";
            claseEstado = "estado-critico";
            detalleLote = `<small class="estado-lote">${vencidos.map(l => "Lote #" + escaparHTML(l.numeroLote)).join(", ")}</small>`;

        } else if (stock <= 0) {

            estado = "Sin stock";
            claseEstado = "estado-critico";

        } else if (!loteProximo) {

            estado = "Sin vencimientos próximos";
            claseEstado = "estado-ok";

        } else {

            const dias = Number(loteProximo.diasRestantes);

            claseEstado = CLASES_VENCIMIENTO[nivelVencimiento(dias)];
            estado = textoDias(dias);
            detalleLote = `<small class="estado-lote">Lote #${escaparHTML(loteProximo.numeroLote)}</small>`;
        }

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${escaparHTML(prod.nombre)}</td>

            <td>${pesos(prod.precio)}</td>

            <td>${stock}</td>

            <td>
                <span class="${claseEstado}">
                    ${estado}
                </span>
                ${detalleLote}
            </td>

            <td>
                <div class="acciones-producto">

                    <button
                        class="btn-tabla btn-lotes"
                        onclick="abrirModalLotes(${prod.id})">
                        Ver lotes
                    </button>

                    ${usuario.rol === "ADMIN" ? `
                        <button
                            class="btn-tabla btn-editar"
                            onclick="abrirModalEditarProducto(${prod.id})">
                            Editar
                        </button>

                        <button
                            class="btn-tabla btn-eliminar"
                            onclick="eliminarProductoAdmin(${prod.id})">
                            Eliminar
                        </button>
                    ` : ""}

                </div>
            </td>
        `;

        tabla.appendChild(tr);
    });

    if (!paginacion) return;

    if (totalPaginas <= 1) {
        paginacion.innerHTML = "";
        return;
    }

    paginacion.innerHTML = `
        <button
            id="btnAnteriorStock"
            ${paginaStockActual <= 1 ? "disabled" : ""}>
            Anterior
        </button>

        <span>
            Página ${paginaStockActual} de ${totalPaginas}
        </span>

        <button
            id="btnSiguienteStock"
            ${paginaStockActual >= totalPaginas ? "disabled" : ""}>
            Siguiente
        </button>
    `;

    document.getElementById("btnAnteriorStock").onclick = () => {
        if (paginaStockActual > 1) {
            paginaStockActual--;
            renderStock(productos);
        }
    };

    document.getElementById("btnSiguienteStock").onclick = () => {
        if (paginaStockActual < totalPaginas) {
            paginaStockActual++;
            renderStock(productos);
        }
    };
}

// Al escribir en el buscador vuelve a la página 1; al recargar datos se queda donde estaba
function filtrarStock(volverAlInicio = true) {

    if (volverAlInicio) paginaStockActual = 1;

    const texto = (document.getElementById("buscarStock")?.value || "").toLowerCase().trim();

    renderStock(texto
        ? productosStock.filter(p => p.nombre.toLowerCase().includes(texto))
        : productosStock);
}

async function eliminarProductoAdmin(id) {

    if (usuario.rol !== "ADMIN") {
        mostrarAviso("No tenés permisos para dar de baja productos.", "error");
        return;
    }

    const nombre = productosStock.find(p => p.id === id)?.nombre;

    const seguro = await confirmar({
        titulo: "¿Dar de baja este producto?",
        mensaje: (nombre ? `«${nombre}» ` : "El producto ") +
            "deja de verse en la tienda y en el panel. Sus ventas y comprobantes quedan guardados.",
        aceptar: "Dar de baja"
    });

    if (!seguro) return;

    try {
        await pedir(`/productos/${id}`, { method: "DELETE" });
        mostrarAviso("Producto dado de baja.", "ok");
        cargarProductos();
    } catch (error) {
        mostrarAviso("No se pudo dar de baja: " + error.message, "error");
    }
}

let productoEditando = null;

// Galerías de imágenes del alta y de la ventana de edición
let galeriaAlta = null;
let galeriaEditar = null;

document.addEventListener("DOMContentLoaded", () => {
    galeriaAlta = crearGaleria("galeriaProducto", "imagenesProducto");
    galeriaEditar = crearGaleria("galeriaEditar", "editarImagenes");

    // Con muchos productos, en lotes y promociones se busca escribiendo
    agregarBuscadorASelect(document.getElementById("productoLote"), {
        placeholder: "Buscar producto…", etiqueta: "Producto del lote"
    });
    agregarBuscadorASelect(document.getElementById("productoPromo"), {
        placeholder: "Buscar producto…", etiqueta: "Aplica a"
    });
});

// ---------------------------------------------------------
// Editar producto
// ---------------------------------------------------------

async function abrirModalEditarProducto(id) {

    if (usuario.rol !== "ADMIN") {
        mostrarAviso("No tenés permisos para editar productos.", "error");
        return;
    }

    let prod;

    try {
        prod = await pedir(`/productos/${id}`);
    } catch (error) {
        mostrarAviso("No se pudo abrir el producto: " + error.message, "error");
        return;
    }

    productoEditando = prod;

    document.getElementById("editarNombre").value = prod.nombre || "";
    document.getElementById("editarPrecio").value = prod.precio || "";
    document.getElementById("editarDescripcion").value = prod.descripcion || "";
    document.getElementById("tituloEditarProducto").textContent = prod.nombre;

    const tipoId = prod.tipoCategoria?.id || prod.categoria?.tipoCategoria?.id;
    const selectTipo = document.getElementById("editarTipoCategoria");
    const selectCategoria = document.getElementById("editarCategoria");

    llenarTipos(selectTipo, tipoId)
        .then(() => llenarCategorias(selectCategoria, tipoId, prod.categoria?.id))
        .catch(() => mostrarAviso("No se pudieron cargar las categorías.", "error"));

    selectTipo.onchange = () => llenarCategorias(selectCategoria, selectTipo.value);

    galeriaEditar.cargar(prod.imagenes || []);

    document.getElementById("modalEditarProducto").style.display = "flex";
}

function cerrarModalEditarProducto() {

    document.getElementById("modalEditarProducto").style.display =
        "none";
    galeriaEditar?.limpiar();
}

function guardarEdicionProducto() {

    if (usuario.rol !== "ADMIN") {
        mostrarAviso("No tenés permisos para editar productos.", "error");
        return;
    }

    const nombre =
        document.getElementById("editarNombre").value;

    const precio =
        document.getElementById("editarPrecio").value;

    const descripcion =
        document.getElementById("editarDescripcion").value;

    const categoriaId =
        document.getElementById("editarCategoria").value;

    if (!nombre.trim() || !(parseFloat(precio) > 0) || !categoriaId) {

        mostrarAviso("Completá el nombre, un precio válido y la categoría.", "error");
        return;
    }

    const formData = new FormData();

    formData.append("nombre", nombre);
    formData.append("precio", precio);
    formData.append("descripcion", descripcion);
    formData.append("categoriaId", categoriaId);

    // Archivos nuevos y el orden final de la galería
    galeriaEditar.completarFormulario(formData, true);

    const boton = document.getElementById("btnGuardarEdicionProducto");
    boton.disabled = true;

    pedir(`/productos/${productoEditando.id}/editar`, {
        method: "PUT",
        body: formData
    })
        .finally(() => { boton.disabled = false; })
        .then(() => {

            cerrarModalEditarProducto();

            cargarProductos();
            mostrarAviso("Producto actualizado.", "ok");
        })
        .catch(error => {
            mostrarAviso("No se pudo guardar: " + error.message, "error");
        });
}

// ---------------------------------------------------------
// Ventana de categorías
// ---------------------------------------------------------

async function crearTipoCategoria() {

    const nombre = await pedirTexto({
        titulo: "Nuevo tipo de categoría",
        mensaje: "Agrupa categorías parecidas, por ejemplo «Panificados» o «Bebidas».",
        etiqueta: "Nombre",
        placeholder: "Ej: Panificados",
        aceptar: "Crear tipo"
    });

    if (!nombre || nombre.trim() === "") {
        return;
    }

    pedir("/tipos-categoria", {
        method: "POST",
        json: { nombre: nombre.trim() }
    })
        .then(() => {
            cargarTiposCategoriaModal();
            cargarTiposCategoria();
            mostrarAviso("Tipo de categoría creado.", "ok");
        })
        .catch(error => {
            mostrarAviso("No se pudo crear el tipo: " + error.message, "error");
        });
}

function cargarTiposCategoriaModal() {

    const select = document.getElementById("tipoCategoriaNueva");

    if (!select) return;

    llenarTipos(select)
        .catch(error => mostrarAviso("No se pudieron cargar los tipos: " + error.message, "error"));
}

function crearCategoria() {

    const nombre =
        document.getElementById("nombreNuevaCategoria")
            .value
            .trim();

    const tipoId =
        document.getElementById("tipoCategoriaNueva")
            .value;

    if (!nombre || !tipoId) {

        mostrarAviso("Completá el nombre y el tipo de la categoría.", "error");
        return;
    }

    pedir("/categorias", {
        method: "POST",
        json: { nombre, tipoCategoria: { id: Number(tipoId) } }
    })
        .then(() => {

            document.getElementById("nombreNuevaCategoria").value = "";
            document.getElementById("tipoCategoriaNueva").value = "";

            cargarCategoriasModal();

            cargarTiposCategoria();

            mostrarAviso("Categoría creada.", "ok");
        })

        .catch(error => {
            mostrarAviso("No se pudo crear la categoría: " + error.message, "error");
        });
}

function cargarCategoriasModal() {

    const lista = document.getElementById("listaCategorias");
    if (!lista) return;

    pedir("/categorias")
        .then(categorias => {
            lista.innerHTML = categorias.map(cat => `
                <div class="categoria-item">
                    <span>
                        ${escaparHTML(cat.nombre)}
                        (${escaparHTML(cat.tipoCategoria?.nombre || "Sin tipo")})
                    </span>
                    <button
                        class="btn-tabla btn-eliminar"
                        onclick="eliminarCategoria(${cat.id})">
                        Eliminar
                    </button>
                </div>
            `).join("");
        })
        .catch(error => mostrarAviso("No se pudieron cargar las categorías: " + error.message, "error"));
}

async function eliminarCategoria(id) {

    const nombre = textoDeFila("span");

    const seguro = await confirmar({
        titulo: "¿Eliminar esta categoría?",
        mensaje: nombre
            ? `«${nombre}» deja de aparecer para elegir. Solo se puede si no tiene productos.`
            : "Deja de aparecer para elegir. Solo se puede si no tiene productos.",
        aceptar: "Eliminar categoría"
    });

    if (!seguro) return;

    try {
        await pedir(`/categorias/${id}`, { method: "DELETE" });
        mostrarAviso("Categoría eliminada.", "ok");
        cargarCategoriasModal();
    } catch (error) {
        mostrarAviso(error.message, "error");
    }
}

function abrirModalCategorias() {

    document.getElementById("modalCategorias").style.display = "flex";

    cargarTiposCategoriaModal();
    cargarCategoriasModal();
}

function cerrarModalCategorias() {

    document.getElementById("modalCategorias").style.display = "none";
}
