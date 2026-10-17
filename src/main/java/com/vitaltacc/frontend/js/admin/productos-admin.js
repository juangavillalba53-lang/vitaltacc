
// 🔥 CREAR PRODUCTO

function crearProducto() {
    const nombre = document.getElementById("nombreProducto").value.trim();

    const precio = parseFloat(
        document.getElementById("precioProducto").value
    );

    const descripcion = document.getElementById("descripcionProducto").value.trim();

    const categoriaId = document.getElementById("categoriaProducto").value;

    const imagenes = document.getElementById("imagenesProducto").files;

    if (
        !nombre ||
        isNaN(precio) ||
        precio <= 0 ||
        !descripcion ||
        !categoriaId
    ) {
        alert("Completá el nombre, un precio válido, la descripción y la categoría.");
        return;
    }

    const formData = new FormData();

    formData.append("nombre", nombre);
    formData.append("precio", precio);
    formData.append("descripcion", descripcion);
    formData.append("categoriaId", categoriaId);

    for (let i = 0; i < imagenes.length; i++) {
        formData.append("imagenes", imagenes[i]);
    }

    pedir("/productos", {
        method: "POST",
        body: formData
    })
        .then(() => {
            alert("Producto creado correctamente.");

            document.getElementById("nombreProducto").value = "";
            document.getElementById("precioProducto").value = "";
            document.getElementById("descripcionProducto").value = "";
            document.getElementById("tipoCategoriaProducto").value = "";
            document.getElementById("categoriaProducto").innerHTML =
                '<option value="">Seleccionar categoría</option>';
            document.getElementById("imagenesProducto").value = "";
            document.getElementById("previewImagenesProducto")?.replaceChildren();

            cargarProductos();
            cargarStock();
        })
        .catch(error => {
            mostrarAviso("No se pudo crear el producto: " + error.message, "error");
        });
}


// 🔥 CARGAR PRODUCTOS (LOTE + EDITAR + TABLA)

function cargarProductos() {

    fetch("http://localhost:8080/productos")
        .then(res => res.json())
        .then(data => {

            const select =
                document.getElementById("productoLote");

            const selectPromo =
                document.getElementById("productoPromo");

            // 🔥 LIMPIAR

            select.innerHTML = "";

            if (selectPromo) {

                selectPromo.innerHTML = `
                    <option value="">
                        Promoción global (toda la tienda)
                    </option>
                `;
            }
            console.log(data);

            data.forEach(prod => {
                console.log(prod);

                // 🔥 SELECT LOTES

                const option = document.createElement("option");

                option.value = prod.id;

                option.text = prod.nombre;

                option.setAttribute(
                    "data-precio",
                    prod.precio ?? 0
                );

                select.appendChild(option);

                // 🔥 SELECT PROMOS

                if (selectPromo) {

                    const optionPromo =
                        document.createElement("option");

                    optionPromo.value = prod.id;

                    optionPromo.text = prod.nombre;

                    selectPromo.appendChild(optionPromo);
                }

                // La tabla de stock la arma renderStock(), que además
                // muestra el lote más próximo a vencer de cada producto.
            });

            // 🔥 SETEAR PRECIO INICIAL

            if (select.options.length > 0) {

                const first = select.options[0];

                const precio =
                    first.getAttribute("data-precio");

                document.getElementById("precioLote").value =
                    "$" + precio;
            }

        })

        .catch(() => {

            alert("Error cargando productos");
        });
}

// 🔥 SELECTS DE TIPO Y CATEGORÍA (se usan al crear y al editar)

function opcionesSelect(select, textoVacio, items, seleccionado) {

    select.replaceChildren(new Option(textoVacio, ""));

    items.forEach(item => {
        const opcion = new Option(item.nombre, item.id);
        opcion.selected = String(item.id) === String(seleccionado ?? "");
        select.add(opcion);
    });
}

function llenarTipos(select, seleccionado) {

    return fetch("http://localhost:8080/tipos-categoria")
        .then(res => res.json())
        .then(tipos => opcionesSelect(select, "Seleccionar tipo", tipos, seleccionado));
}

function llenarCategorias(select, tipoId, seleccionado) {

    opcionesSelect(select, "Seleccionar categoría", [], null);

    if (!tipoId) {
        return Promise.resolve();
    }

    return fetch(`http://localhost:8080/categorias/tipo/${tipoId}`)
        .then(res => res.json())
        .then(categorias =>
            opcionesSelect(select, "Seleccionar categoría", categorias, seleccionado));
}

// 🔥 CARGAR TIPOS DE CATEGORÍA (formulario de alta)
function cargarTiposCategoria() {

    return llenarTipos(document.getElementById("tipoCategoriaProducto"));
}

// 🔥 CARGAR CATEGORÍAS POR TIPO (formulario de alta)
function cargarCategoriasPorTipo(tipoId) {

    return llenarCategorias(document.getElementById("categoriaProducto"), tipoId);
}

// 🔥 STOCK

let productosStock = [];
let productosVenta = [];
let carrito = [];
window.lotesStock = [];

let paginaStockActual = 1;
const productosPorPagina = 15;

function cargarStock() {

    // Productos y todos sus lotes, para mostrar el que vence primero
    Promise.all([
        fetch("http://localhost:8080/productos").then(res => res.json()),
        fetch("http://localhost:8080/lotes")
            .then(res => res.ok ? res.json() : [])
            .catch(() => [])
    ])
        .then(([productos, lotes]) => {

            window.lotesTodos = lotes.map(lote => ({
                productoId: lote.producto?.id ?? lote.productoId,
                numeroLote: lote.numeroLote,
                cantidad: lote.cantidad,
                fechaVencimiento: lote.fechaVencimiento,
                diasRestantes: diasHasta(lote.fechaVencimiento)
            }));

            productosStock = productos;

            renderStock(productos);
        });
}

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

    const formatoPrecio = new Intl.NumberFormat("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    if (productosPagina.length === 0) {
        tabla.innerHTML = `
            <tr>
                <td colspan="5">No se encontraron productos.</td>
            </tr>
        `;
    }

    productosPagina.forEach(prod => {

        const stock = Number(prod.stock) || 0;

        const lotesConStock = (window.lotesTodos || window.lotesStock || [])
            .filter(l =>
                Number(l.productoId) === Number(prod.id) &&
                Number(l.cantidad) > 0
            )
            .sort((a, b) => Number(a.diasRestantes) - Number(b.diasRestantes));

        // Lotes vencidos que siguen en el local, y el disponible que vence primero
        const vencidos = lotesConStock.filter(l => Number(l.diasRestantes) < 0);
        const loteProximo = lotesConStock.find(l => Number(l.diasRestantes) >= 0);

        // Clases según el nivel: vencido/urgente en rojo, atención en amarillo
        const CLASES = {
            vencido: "estado-critico",
            urgente: "estado-critico",
            atencion: "estado-alerta",
            ok: "estado-ok"
        };

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

            claseEstado = CLASES[nivelVencimiento(dias)];
            estado = textoDias(dias);
            detalleLote = `<small class="estado-lote">Lote #${escaparHTML(loteProximo.numeroLote)}</small>`;
        }

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${escaparHTML(prod.nombre)}</td>

            <td>$${formatoPrecio.format(Number(prod.precio) || 0)}</td>

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

function filtrarStock() {

    paginaStockActual = 1;

    const texto = document
        .getElementById("buscarStock")
        .value
        .toLowerCase();

    const filtrados = productosStock.filter(p =>
        p.nombre.toLowerCase().includes(texto)
    );

    renderStock(filtrados);
}

// 🔥 ELIMINAR PRODUCTO
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
        cargarStock();
        cargarProductosVenta();
    } catch (error) {
        mostrarAviso("No se pudo dar de baja: " + error.message, "error");
    }
}

let productoEditando = null;

// 🔥 ABRIR MODAL EDITAR

function abrirModalEditarProducto(id) {

    // Arranca sin imágenes nuevas elegidas
    document.getElementById("editarImagenes").value = "";
    document.getElementById("previewEditarImagenes")?.replaceChildren();

    if (usuario.rol !== "ADMIN") {

        alert("No tiene permisos.");

        return;
    }

    fetch(`http://localhost:8080/productos/${id}`)
        .then(res => {

            return res.json();
        })

        .then(prod => {

            productoEditando = prod;

            document.getElementById("editarNombre").value =
                prod.nombre || "";

            document.getElementById("editarPrecio").value =
                prod.precio || "";

            document.getElementById("tituloEditarProducto").innerText =
                prod.nombre;

            document.getElementById("editarDescripcion").value =
                prod.descripcion || "";

            const tipoId = prod.tipoCategoria?.id || prod.categoria?.tipoCategoria?.id;
            const selectTipo = document.getElementById("editarTipoCategoria");
            const selectCategoria = document.getElementById("editarCategoria");

            llenarTipos(selectTipo, tipoId)
                .then(() => llenarCategorias(selectCategoria, tipoId, prod.categoria?.id))
                .catch(() => alert("No se pudieron cargar las categorías."));

            selectTipo.onchange = () => llenarCategorias(selectCategoria, selectTipo.value);

            const contenedor =
                document.getElementById("imagenesActuales");

            contenedor.innerHTML = "";

            if (prod.imagenes && prod.imagenes.length > 0) {
                prod.imagenes.forEach(img => {

                    contenedor.innerHTML += `
                        <img
                            src="http://localhost:8080${img.url}"
                            class="img-preview-editar"
                        >
                    `;
                });

            } else {

                contenedor.innerHTML = `
                    <p>Este producto no tiene imágenes</p>
                `;
            }

            document.getElementById("modalEditarProducto").style.display =
                "flex";
        })

        .catch(error => {

            console.error(error);

            alert("Error abriendo modal");
        });
}

// 🔥 CERRAR MODAL

function cerrarModalEditarProducto() {

    document.getElementById("modalEditarProducto").style.display =
        "none";
}

// 🔥 GUARDAR EDICIÓN PRODUCTO

function guardarEdicionProducto() {

    if (usuario.rol !== "ADMIN") {

        alert("No tiene permisos.");

        return;
    }

    const nombre =
        document.getElementById("editarNombre").value;

    const precio =
        document.getElementById("editarPrecio").value;

    const descripcion =
        document.getElementById("editarDescripcion").value;

    const imagenes =
        document.getElementById("editarImagenes").files;

    const categoriaId =
        document.getElementById("editarCategoria").value;

    if (!nombre.trim() || !(parseFloat(precio) > 0) || !categoriaId) {

        alert("Completá el nombre, un precio válido y la categoría.");

        return;
    }

    const formData = new FormData();

    formData.append("nombre", nombre);
    formData.append("precio", precio);
    formData.append("descripcion", descripcion);
    formData.append("categoriaId", categoriaId);

    for (let i = 0; i < imagenes.length; i++) {

        formData.append(
            "imagenes",
            imagenes[i]
        );
    }

    pedir(`/productos/${productoEditando.id}/editar`, {
        method: "PUT",
        body: formData
    })
        .then(() => {

            cerrarModalEditarProducto();

            cargarProductos();
            cargarStock();

            cargarProductosVenta();

            mostrarAviso("Producto actualizado.", "ok");
        })
        .catch(error => {
            mostrarAviso("No se pudo guardar: " + error.message, "error");
        });
}

// ==========================
// MODAL CATEGORIAS
// ==========================

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

    fetch("http://localhost:8080/tipos-categoria")
        .then(res => res.json())
        .then(data => {

            select.innerHTML =
                '<option value="">Seleccionar tipo</option>';

            data.forEach(tipo => {

                select.innerHTML += `
                    <option value="${tipo.id}">
                        ${tipo.nombre}
                    </option>
                `;
            });

        })
        .catch(error => {

            console.error(error);
        });
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

        alert("Completar todos los datos");
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

            if (typeof cargarTiposCategoria === "function") {
                cargarTiposCategoria();
            }

            mostrarAviso("Categoría creada.", "ok");
        })

        .catch(error => {
            mostrarAviso("No se pudo crear la categoría: " + error.message, "error");
        });
}

function cargarCategoriasModal() {

    fetch("http://localhost:8080/categorias")
        .then(res => res.json())
        .then(data => {

            const lista =
                document.getElementById("listaCategorias");

            if (!lista) return;

            lista.innerHTML = "";

            data.forEach(cat => {

                lista.innerHTML += `
                    <div class="categoria-item">

                        <span>
                            ${cat.nombre}
                            (${cat.tipoCategoria?.nombre || "Sin tipo"})
                        </span>

                        <button
                            class="btn-tabla btn-eliminar"
                            onclick="eliminarCategoria(${cat.id})">
                            Eliminar
                        </button>

                    </div>
                `;
            });

        })
        .catch(error => {

            console.error(error);
        });
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
