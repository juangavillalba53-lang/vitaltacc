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

                                <button
                                    class="btn-tabla btn-editar"
                                    onclick="abrirModalEditarProducto(${prod.id})"
                                >
                                    Editar
                                </button>

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
            <td>
                ${prod.nombre}
            </td>

            <td>
                $${Number(prod.precio).toFixed(2)}
            </td>

            <td class="${clase}">
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

                    <button
                        class="btn-tabla btn-editar"
                        onclick="abrirModalEditarProducto(${prod.id})"
                    >
                        Editar
                    </button>

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

// 🔥 ELIMINAR PRODUCTO
function eliminarProductoAdmin(id) {

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