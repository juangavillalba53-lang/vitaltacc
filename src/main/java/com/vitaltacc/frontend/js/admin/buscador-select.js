// =========================================================
// BUSCADOR EN UN SELECT
// Convierte un <select> en un campo donde se escribe para
// buscar. El select queda escondido y sigue siendo el que
// guarda el valor, así el resto del código no cambia.
// =========================================================

const MAXIMO_RESULTADOS = 50;

function agregarBuscadorASelect(select, { placeholder = "Escribí para buscar…", etiqueta = "Buscar" } = {}) {

    if (!select || select.dataset.conBuscador) return;
    select.dataset.conBuscador = "1";

    const id = select.id || `select-${Math.random().toString(36).slice(2)}`;
    const idLista = `${id}-opciones`;

    const caja = document.createElement("div");
    caja.className = "combo";
    caja.innerHTML = `
        <input type="text" id="${id}-buscar" class="combo-input" role="combobox" autocomplete="off" spellcheck="false"
            aria-expanded="false" aria-autocomplete="list" aria-controls="${idLista}"
            aria-label="${escaparHTML(etiqueta)}" placeholder="${escaparHTML(placeholder)}">
        <svg class="combo-flecha" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
        <ul class="combo-lista" id="${idLista}" role="listbox" hidden></ul>`;

    // Si el select tenía una etiqueta, ahora apunta al campo de búsqueda
    const etiquetaVisible = select.id && document.querySelector(`label[for="${select.id}"]`);

    select.before(caja);
    caja.appendChild(select);
    select.hidden = true;
    select.tabIndex = -1;

    const input = caja.querySelector(".combo-input");
    if (etiquetaVisible) {
        etiquetaVisible.htmlFor = input.id;
        input.removeAttribute("aria-label");
    }
    const lista = caja.querySelector(".combo-lista");
    let resultados = [];
    let activo = -1;

    const opciones = () => [...select.options];
    // Las opciones con data-placeholder (por ejemplo "Elegí un producto") no se muestran ni se buscan
    const esPlaceholder = op => op.dataset.placeholder !== undefined;
    const textoElegido = () => {
        const op = select.selectedOptions[0];
        return !op || esPlaceholder(op) ? "" : op.text;
    };

    function mostrarElegido() {
        input.value = textoElegido();
    }

    function filtrar(texto) {
        const palabras = normalizarTexto(texto).split(/\s+/).filter(Boolean);
        return opciones().filter(op => {
            if (op.disabled || esPlaceholder(op)) return false;
            const nombre = normalizarTexto(op.text);
            return palabras.every(p => nombre.includes(p));
        });
    }

    function dibujar(texto) {
        const todos = filtrar(texto);
        resultados = todos.slice(0, MAXIMO_RESULTADOS);

        if (!resultados.length) {
            lista.innerHTML = `<li class="combo-vacio" role="presentation">No hay productos con ese nombre</li>`;
        } else {
            lista.innerHTML = resultados.map((op, i) => `
                <li role="option" id="${idLista}-${i}" data-i="${i}"
                    class="combo-opcion${op.value === select.value ? " elegida" : ""}"
                    aria-selected="${op.value === select.value}">${escaparHTML(op.text)}</li>`).join("")
                + (todos.length > resultados.length
                    ? `<li class="combo-mas" role="presentation">Hay ${todos.length - resultados.length} más: seguí escribiendo para encontrarlo</li>`
                    : "");
        }

        activo = Math.max(0, resultados.findIndex(op => op.value === select.value));
        if (!resultados.length) activo = -1;
        marcarActivo();
    }

    function marcarActivo() {
        lista.querySelectorAll(".combo-opcion").forEach((li, i) => li.classList.toggle("activa", i === activo));
        const li = lista.querySelector(`[data-i="${activo}"]`);
        if (li) {
            input.setAttribute("aria-activedescendant", li.id);
            li.scrollIntoView({ block: "nearest" });
        } else {
            input.removeAttribute("aria-activedescendant");
        }
    }

    function abrir() {
        if (!lista.hidden) return;
        lista.hidden = false;
        caja.classList.add("abierto");
        input.setAttribute("aria-expanded", "true");
    }

    function cerrar() {
        lista.hidden = true;
        caja.classList.remove("abierto");
        input.setAttribute("aria-expanded", "false");
        input.removeAttribute("aria-activedescendant");
    }

    function elegir(op) {
        if (!op) return;
        const cambio = select.value !== op.value;
        select.value = op.value;
        cerrar();
        mostrarElegido();
        if (cambio) select.dispatchEvent(new Event("change", { bubbles: true }));
    }

    // ---------- eventos ----------

    input.addEventListener("focus", () => {
        input.select();
        dibujar("");
        abrir();
    });

    input.addEventListener("click", () => {
        if (lista.hidden) {
            dibujar("");
            abrir();
        }
    });

    // La flecha abre y cierra (mousedown para que el campo no pierda el foco)
    caja.querySelector(".combo-flecha").addEventListener("mousedown", evento => {
        evento.preventDefault();
        if (lista.hidden) {
            if (document.activeElement !== input) {
                input.focus();   // al enfocar se abre sola
            } else {
                dibujar("");
                abrir();
            }
        } else {
            cerrar();
            mostrarElegido();
        }
    });

    input.addEventListener("input", () => {
        dibujar(input.value);
        abrir();
    });

    input.addEventListener("keydown", evento => {
        if (evento.key === "ArrowDown" || evento.key === "ArrowUp") {
            evento.preventDefault();
            if (lista.hidden) { dibujar(""); abrir(); return; }
            if (!resultados.length) return;
            activo = (activo + (evento.key === "ArrowDown" ? 1 : -1) + resultados.length) % resultados.length;
            marcarActivo();
        } else if (evento.key === "Enter") {
            if (!lista.hidden && resultados[activo]) {
                evento.preventDefault();
                elegir(resultados[activo]);
            }
        } else if (evento.key === "Escape") {
            if (!lista.hidden) {
                evento.preventDefault();
                evento.stopPropagation();
                cerrar();
                mostrarElegido();
            }
        } else if (evento.key === "Tab") {
            cerrar();
            mostrarElegido();
        }
    });

    // mousedown para elegir antes de que el input pierda el foco
    lista.addEventListener("mousedown", evento => {
        evento.preventDefault();
        const li = evento.target.closest(".combo-opcion");
        if (li) elegir(resultados[Number(li.dataset.i)]);
    });

    input.addEventListener("blur", () => {
        cerrar();
        mostrarElegido();
    });

    // Si el código cambia el select (se recargan los productos o se elige uno), se actualiza el texto
    select.addEventListener("change", mostrarElegido);
    new MutationObserver(() => {
        if (document.activeElement !== input) mostrarElegido();
        else dibujar(input.value);
    }).observe(select, { childList: true });

    mostrarElegido();

    return { actualizar: mostrarElegido };
}
