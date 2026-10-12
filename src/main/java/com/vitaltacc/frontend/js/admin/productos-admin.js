
// 🔥 CREAR PRODUCTO
function crearProducto() {

    const nombre =
        document.getElementById("nombreProducto").value.trim();

    const precio =
        parseFloat(
            document.getElementById("precioProducto").value
        );

    const descripcion =
        document.getElementById("descripcionProducto").value.trim();

    const stockMinimo =
        parseInt(
            document.getElementById("stockMinimoProducto").value
        );

    const categoriaId =
        document.getElementById("categoriaProducto").value;

    const imagenes =
        document.getElementById("imagenesProducto").files;

    if (
        !nombre ||
        isNaN(precio) ||
        !descripcion ||
        isNaN(stockMinimo) ||
        !categoriaId
    ) {

        alert("Completar todos los datos.");

        return;
    }

    const formData = new FormData();

    formData.append("nombre", nombre);
    formData.append("precio", precio);
    formData.append("descripcion", descripcion);
    formData.append("stockMinimo", stockMinimo);
    formData.append("categoriaId", categoriaId);

    for (let i = 0; i < imagenes.length; i++) {

        formData.append(
            "imagenes",
            imagenes[i]
        );

    }

    fetch("http://localhost:8080/productos", {

        method: "POST",

        body: formData

    })
        .then(async res => {

            console.log("STATUS:", res.status);

            const texto = await res.text();

            console.log("RESPUESTA DEL BACKEND:");
            console.log(texto);

            if (!res.ok) {

                throw new Error(texto);

            }

            return JSON.parse(texto);

        })

        .then(() => {

            alert("Producto creado correctamente.");

            document.getElementById("nombreProducto").value = "";
            document.getElementById("precioProducto").value = "";
            document.getElementById("descripcionProducto").value = "";
            document.getElementById("stockMinimoProducto").value = "";
            document.getElementById("tipoCategoriaProducto").value = "";
            document.getElementById("categoriaProducto").innerHTML =
                '<option value="">Seleccionar categoría</option>';
            document.getElementById("imagenesProducto").value = "";

            cargarProductos();

        })

        .catch(error => {

            console.error(error);

            alert("Error al crear el producto.");

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

            const tablaStock =
                document.getElementById("tablaStock");

            // 🔥 LIMPIAR

            select.innerHTML = "";

            if (tablaStock) {
                tablaStock.innerHTML = "";
            }

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

                // 🔥 TABLA PRODUCTOS

                if (tablaStock) {

                    tablaStock.innerHTML += `
                    <tr>
                        <td>${prod.nombre}</td>

                        <td>$${Number(prod.precio).toFixed(2)}</td>

                        <td class="${prod.stock <= 5 ? 'stock-bajo' : 'stock-ok'}">
                            ${prod.stock}
                        </td>

                        <td>
                            <div class="acciones-producto">

                                <button
                                    class="btn-tabla btn-lotes"
                                    onclick="abrirModalLotes(${prod.id})"
                                >
                                    Ver lotes
                                </button>

                                ${usuario.rol === "ADMIN" ? `
                                    <button
                                        class="btn-tabla btn-editar"
                                        onclick="abrirModalEditarProducto(${prod.id})"
                                    >
                                        Editar
                                    </button>
                                ` : ""}

                                ${usuario.rol === "ADMIN" ? `
                                    <button
                                        class="btn-tabla btn-eliminar"
                                        onclick="eliminarProductoAdmin(${prod.id})"
                                    >
                                        Eliminar
                                    </button>
                                ` : ""}

                            </div>
                        </td>
                    </tr>
                    `;
                }

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

// 🔥 CARGAR TIPOS DE CATEGORÍA
function cargarTiposCategoria() {

    fetch("http://localhost:8080/tipos-categoria")

        .then(res => res.json())

        .then(tipos => {

            console.log("TIPOS:", tipos);

            const select = document.getElementById("tipoCategoriaProducto");

            select.innerHTML =
                '<option value="">Seleccionar tipo</option>';

            tipos.forEach(tipo => {

                select.innerHTML += `
                    <option value="${tipo.id}">
                        ${tipo.nombre}
                    </option>
                `;

            });

        });

}

// 🔥 CARGAR CATEGORÍAS POR TIPO
function cargarCategoriasPorTipo(tipoId) {

    const selectCategoria =
        document.getElementById("categoriaProducto");

    selectCategoria.innerHTML =
        '<option value="">Seleccionar categoría</option>';

    if (!tipoId)
        return;

    fetch(`http://localhost:8080/categorias/tipo/${tipoId}`)

        .then(res => res.json())

        .then(categorias => {

            categorias.forEach(categoria => {

                selectCategoria.innerHTML += `
                    <option value="${categoria.id}">
                        ${categoria.nombre}
                    </option>
                `;

            });

        });

}

// 🔥 STOCK

let productosStock = [];
let productosVenta = [];
let carrito = [];
window.lotesStock = [];

let paginaStockActual = 1;
const productosPorPagina = 15;

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

        // Buscar el lote disponible que vence primero
        const loteProximo = (window.lotesStock || [])
            .filter(l =>
                Number(l.productoId) === Number(prod.id) &&
                Number(l.cantidad) > 0 &&
                Number(l.diasRestantes) >= 0
            )
            .sort((a, b) =>
                new Date(a.fechaVencimiento) -
                new Date(b.fechaVencimiento)
            )[0];

        let estado;
        let claseEstado;

        if (stock <= 0) {

            estado = "⚪ Sin stock";
            claseEstado = "estado-critico";

        } else if (!loteProximo) {

            estado = "🟢 Sin vencimientos próximos";
            claseEstado = "estado-ok";

        } else {

            const dias = Number(loteProximo.diasRestantes);

            if (dias <= 10) {
                claseEstado = "estado-critico";
                estado = `🔴 Vence en ${dias} ${dias === 1 ? "día" : "días"}`;

            } else if (dias <= 20) {
                claseEstado = "estado-alerta";
                estado = `🟡 Vence en ${dias} días`;

            } else {
                claseEstado = "estado-ok";
                estado = `🟢 Vence en ${dias} días`;
            }

            estado += `<br><em>(Lote #${loteProximo.numeroLote})</em>`;
        }

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${prod.nombre}</td>

            <td>$${formatoPrecio.format(Number(prod.precio) || 0)}</td>

            <td>${stock}</td>

            <td>
                <span class="${claseEstado}">
                    ${estado}
                </span>
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
function eliminarProductoAdmin(id) {

    if (usuario.rol !== "ADMIN") {

        alert("No tiene permisos.");

        return;
    }

    if (!confirm("Eliminar producto?")) {
        return;
    }

    fetch(`http://localhost:8080/productos/${id}`, {

        method: "DELETE"

    })
        .then(() => {

            alert("Producto eliminado");

            cargarProductos();

        })
        .catch(() => {

            alert("Error eliminando producto");
        });
}

function editarProducto(id) {

    alert("Editar producto ID: " + id);
}

let productoEditando = null;

// 🔥 ABRIR MODAL EDITAR

function abrirModalEditarProducto(id) {

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

            document.getElementById("editarTipoCategoria").value =
                prod.tipoCategoria.nombre;

            document.getElementById("editarCategoria").value =
                prod.categoria.nombre;

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

    const formData = new FormData();

    formData.append("nombre", nombre);
    formData.append("precio", precio);
    formData.append("descripcion", descripcion);
    formData.append(
        "categoriaId",
        productoEditando.categoria.id
    );

    for (let i = 0; i < imagenes.length; i++) {

        formData.append(
            "imagenes",
            imagenes[i]
        );
    }

    fetch(`http://localhost:8080/productos/${productoEditando.id}/editar`, {

        method: "PUT",
        body: formData

    })

        .then(res => {

            if (!res.ok) {
                throw new Error();
            }

            return res.json();
        })

        .then(() => {

            cerrarModalEditarProducto();

            cargarProductos();

            alert("Producto actualizado");
        })

        .catch(error => {

            console.error(error);

            alert("Error actualizando producto");
        });
}

// ==========================
// MODAL CATEGORIAS
// ==========================

function crearTipoCategoria() {

    const nombre = prompt("Nombre del tipo de categoría");

    if (!nombre || nombre.trim() === "") {
        return;
    }

    fetch("http://localhost:8080/tipos-categoria", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            nombre: nombre.trim()
        })

    })
        .then(res => {

            if (!res.ok) {
                throw new Error();
            }

            return res.json();
        })
        .then(() => {

            cargarTiposCategoriaModal();

            alert("Tipo de categoría creado");

        })
        .catch(() => {

            alert("Error al crear tipo de categoría");

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

    fetch("http://localhost:8080/categorias", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({

            nombre: nombre,

            tipoCategoria: {
                id: Number(tipoId)
            }

        })

    })
        .then(res => {

            if (!res.ok) {
                throw new Error("Error al crear categoría");
            }

            return res.json();
        })

        .then(() => {

            document.getElementById("nombreNuevaCategoria").value = "";
            document.getElementById("tipoCategoriaNueva").value = "";

            cargarCategoriasModal();

            if (typeof cargarTiposCategoria === "function") {
                cargarTiposCategoria();
            }

            alert("Categoría creada");
        })

        .catch(error => {

            console.error(error);
            alert("Error al crear categoría");
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


function eliminarCategoria(id) {

    if (!confirm("¿Eliminar categoría?")) {
        return;
    }

    fetch(`http://localhost:8080/categorias/${id}`, {

        method: "DELETE"

    })
        .then(res => {

            if (!res.ok) {
                throw new Error();
            }

            cargarCategoriasModal();
        })

        .catch(error => {

            console.error(error);
            alert("No se pudo eliminar la categoría");
        });
}

function abrirModalCategorias() {

    document.getElementById("modalCategorias").style.display = "flex";

    cargarTiposCategoriaModal();
    cargarCategoriasModal();
}

function cerrarModalCategorias() {

    document.getElementById("modalCategorias").style.display = "none";
}
