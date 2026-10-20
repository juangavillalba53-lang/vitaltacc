// =========================================================
// GALERÍA DE IMÁGENES DEL PRODUCTO (alta y edición)
// Agregar varias, quitar con la X y acomodar el orden
// arrastrando o con las flechas. La primera es la principal.
// =========================================================

const MAXIMO_IMAGENES = 8;
const PESO_MAXIMO_IMAGEN = 10 * 1024 * 1024;
const TIPOS_IMAGEN = ["image/jpeg", "image/png", "image/webp"];
const LADO_RECOMENDADO = 1000;
const LADO_MINIMO = 800;

const ICONO_QUITAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
const ICONO_IZQ = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg>';
const ICONO_DER = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';
const ICONO_MAS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';

function leerDimensiones(archivo) {
    return new Promise(resolver => {
        const url = URL.createObjectURL(archivo);
        const img = new Image();
        img.onload = () => resolver({ url, ancho: img.naturalWidth, alto: img.naturalHeight });
        img.onerror = () => resolver({ url, ancho: 0, alto: 0 });
        img.src = url;
    });
}

function revisarImagen(ancho, alto) {
    if (!ancho) {
        return { tipo: "error", texto: "No se pudo leer la imagen." };
    }
    if (Math.min(ancho, alto) < LADO_MINIMO) {
        return { tipo: "alerta", texto: "Es chica: se puede ver borrosa." };
    }
    if (Math.abs(ancho - alto) / Math.max(ancho, alto) > 0.05) {
        return { tipo: "alerta", texto: "No es cuadrada: se recortan los bordes." };
    }
    return { tipo: "ok", texto: ancho >= LADO_RECOMENDADO ? "Perfecta." : "Bien." };
}

function crearGaleria(idContenedor, idInput) {

    const contenedor = document.getElementById(idContenedor);
    let items = [];
    let arrastrando = null;

    // ---------- datos ----------

    function cargar(imagenesGuardadas = []) {
        limpiar();
        items = imagenesGuardadas.map(img => ({ tipo: "guardada", id: img.id, url: `${API}${img.url}` }));
        dibujar();
    }

    function limpiar() {
        items.forEach(item => item.tipo === "nueva" && URL.revokeObjectURL(item.url));
        items = [];
        dibujar();
    }

    async function agregarArchivos(lista) {

        const rechazos = [];
        let sinLugar = 0;

        for (const archivo of [...lista]) {
            if (!TIPOS_IMAGEN.includes(archivo.type)) {
                rechazos.push(`«${archivo.name}» no es JPG, PNG ni WEBP`);
                continue;
            }
            if (archivo.size > PESO_MAXIMO_IMAGEN) {
                rechazos.push(`«${archivo.name}» pesa más de 10 MB`);
                continue;
            }
            if (items.length >= MAXIMO_IMAGENES) {
                sinLugar++;
                continue;
            }
            const { url, ancho, alto } = await leerDimensiones(archivo);
            items.push({ tipo: "nueva", archivo, url, ancho, alto, estado: revisarImagen(ancho, alto), recien: true });
        }

        if (sinLugar) {
            rechazos.push(`hay un máximo de ${MAXIMO_IMAGENES} imágenes por producto`);
        }
        if (rechazos.length) {
            mostrarAviso("No se agregaron todas: " + rechazos.join("; ") + ".", "alerta");
        }

        dibujar();
    }

    function mover(desde, hasta) {
        if (hasta < 0 || hasta >= items.length || desde === hasta) return;
        const [item] = items.splice(desde, 1);
        items.splice(hasta, 0, item);
        dibujar();
    }

    function quitar(posicion) {
        const [item] = items.splice(posicion, 1);
        if (item?.tipo === "nueva") URL.revokeObjectURL(item.url);
        dibujar();
    }

    // Arma lo que se manda al servidor: los archivos nuevos y, al editar,
    // el orden final ("e12" = guardada con id 12, "n0" = primer archivo nuevo)
    function completarFormulario(formData, conOrden) {
        const orden = [];
        let nuevas = 0;

        items.forEach(item => {
            if (item.tipo === "guardada") {
                orden.push(`e${item.id}`);
            } else {
                formData.append("imagenes", item.archivo);
                orden.push(`n${nuevas++}`);
            }
        });

        if (conOrden) formData.append("orden", orden.join(","));
    }

    // ---------- dibujo ----------

    function dibujar() {

        const tarjetas = items.map((item, i) => {
            const nombre = `Imagen ${i + 1} de ${items.length}`;
            const pie = item.tipo === "nueva"
                ? `<figcaption class="foto-${item.estado.tipo}">
                       <strong>${item.ancho && item.alto ? `${item.ancho} × ${item.alto} px` : "Sin datos"}</strong>
                       <span>${escaparHTML(item.estado.texto)}</span>
                   </figcaption>`
                : "";

            return `
                <figure class="foto${item.recien ? " foto-recien" : ""}" draggable="true" data-pos="${i}" aria-label="${nombre}">
                    <div class="foto-marco">
                        <img src="${escaparHTML(item.url)}" alt="" draggable="false">
                        ${i === 0 ? '<span class="foto-principal">Principal</span>' : ""}
                        <button type="button" class="foto-boton foto-quitar" data-accion="quitar"
                            aria-label="Quitar ${nombre.toLowerCase()}" title="Quitar">${ICONO_QUITAR}</button>
                        <div class="foto-mover">
                            <button type="button" class="foto-boton" data-accion="izq" ${i === 0 ? "disabled" : ""}
                                aria-label="Mover ${nombre.toLowerCase()} antes" title="Mover antes">${ICONO_IZQ}</button>
                            <button type="button" class="foto-boton" data-accion="der" ${i === items.length - 1 ? "disabled" : ""}
                                aria-label="Mover ${nombre.toLowerCase()} después" title="Mover después">${ICONO_DER}</button>
                        </div>
                    </div>
                    ${pie}
                </figure>`;
        }).join("");

        const agregar = items.length < MAXIMO_IMAGENES
            ? `<label class="foto-agregar" for="${idInput}" tabindex="0" role="button">
                   <span class="foto-agregar-icono">${ICONO_MAS}</span>
                   <strong>${items.length ? "Agregar más" : "Agregar imágenes"}</strong>
                   <small>${items.length} de ${MAXIMO_IMAGENES}</small>
               </label>`
            : `<p class="foto-lleno">Llegaste al máximo de ${MAXIMO_IMAGENES} imágenes.</p>`;

        // El input se conserva entre dibujos (el label lo abre)
        const input = document.getElementById(idInput);
        contenedor.innerHTML = tarjetas + agregar;
        contenedor.appendChild(input);
        items.forEach(item => { item.recien = false; });
    }

    // ---------- eventos ----------

    // El input queda oculto: con el teclado se usa el botón "Agregar"
    document.getElementById(idInput).tabIndex = -1;

    contenedor.addEventListener("keydown", evento => {
        if (evento.target.matches(".foto-agregar") && (evento.key === "Enter" || evento.key === " ")) {
            evento.preventDefault();
            document.getElementById(idInput).click();
        }
    });

    document.getElementById(idInput).addEventListener("change", evento => {
        agregarArchivos(evento.target.files);
        evento.target.value = "";
    });

    contenedor.addEventListener("click", evento => {
        const boton = evento.target.closest("button[data-accion]");
        if (!boton) return;

        const posicion = Number(boton.closest(".foto").dataset.pos);
        const accion = boton.dataset.accion;

        if (accion === "quitar") {
            quitar(posicion);
            contenedor.querySelector(`.foto[data-pos="${Math.min(posicion, items.length - 1)}"] .foto-quitar`)?.focus()
                || contenedor.querySelector(".foto-agregar")?.focus();
            return;
        }

        const destino = accion === "izq" ? posicion - 1 : posicion + 1;
        mover(posicion, destino);
        // El foco sigue a la imagen que se movió
        const nuevo = contenedor.querySelector(`.foto[data-pos="${destino}"] button[data-accion="${accion}"]`);
        (nuevo && !nuevo.disabled ? nuevo : contenedor.querySelector(`.foto[data-pos="${destino}"] .foto-quitar`))?.focus();
    });

    // Arrastrar para reordenar
    contenedor.addEventListener("dragstart", evento => {
        const foto = evento.target.closest(".foto");
        if (!foto) return;
        arrastrando = Number(foto.dataset.pos);
        evento.dataTransfer.effectAllowed = "move";
        evento.dataTransfer.setData("text/plain", String(arrastrando));
        requestAnimationFrame(() => foto.classList.add("arrastrando"));
    });

    contenedor.addEventListener("dragend", () => {
        arrastrando = null;
        contenedor.querySelectorAll(".foto").forEach(f => f.classList.remove("arrastrando", "soltar-antes", "soltar-despues"));
        contenedor.classList.remove("recibiendo");
    });

    function posicionDeSoltado(evento, foto) {
        const caja = foto.getBoundingClientRect();
        const despues = evento.clientX > caja.left + caja.width / 2;
        return { despues, pos: Number(foto.dataset.pos) };
    }

    contenedor.addEventListener("dragover", evento => {
        const traeArchivos = [...evento.dataTransfer.types].includes("Files");

        if (traeArchivos) {
            evento.preventDefault();
            evento.dataTransfer.dropEffect = "copy";
            contenedor.classList.add("recibiendo");
            return;
        }

        if (arrastrando === null) return;
        evento.preventDefault();

        contenedor.querySelectorAll(".foto").forEach(f => f.classList.remove("soltar-antes", "soltar-despues"));
        const foto = evento.target.closest(".foto");
        if (!foto || Number(foto.dataset.pos) === arrastrando) return;
        const { despues } = posicionDeSoltado(evento, foto);
        foto.classList.add(despues ? "soltar-despues" : "soltar-antes");
    });

    contenedor.addEventListener("dragleave", evento => {
        if (!contenedor.contains(evento.relatedTarget)) contenedor.classList.remove("recibiendo");
    });

    contenedor.addEventListener("drop", evento => {
        evento.preventDefault();
        contenedor.classList.remove("recibiendo");

        // Archivos arrastrados desde la computadora
        if (evento.dataTransfer.files?.length && arrastrando === null) {
            agregarArchivos(evento.dataTransfer.files);
            return;
        }

        if (arrastrando === null) return;
        const foto = evento.target.closest(".foto");
        let destino = items.length - 1;

        if (foto) {
            const { despues, pos } = posicionDeSoltado(evento, foto);
            destino = pos + (despues ? 1 : 0);
            if (destino > arrastrando) destino--;
        }

        mover(arrastrando, destino);
    });

    dibujar();

    return { cargar, limpiar, completarFormulario, cantidad: () => items.length };
}
