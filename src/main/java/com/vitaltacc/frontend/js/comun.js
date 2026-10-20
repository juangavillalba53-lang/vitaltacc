// =========================================================
// VITALTACC · UTILIDADES COMPARTIDAS
// Las usan la tienda y el panel. Se carga antes que todo lo demás.
// =========================================================

// Dirección del servidor: si cambia (por ejemplo al subirlo a internet), se cambia solo acá
const API = "http://localhost:8080";

// Precios con formato argentino: $ 3.200,00
const FORMATO_PESOS = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });

function pesos(valor) {
    return FORMATO_PESOS.format(Number(valor) || 0);
}

// Evita que un texto con < > o comillas se interprete como HTML
function escaparHTML(texto) {
    return String(texto ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

// Minúsculas y sin acentos, para buscar: "Ñoquis" → "noquis"
function normalizarTexto(texto) {
    return String(texto || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

// "2026-10-20" → "20/10/2026"
function fechaCorta(fecha) {
    const [anio, mes, dia] = String(fecha || "").substring(0, 10).split("-");
    return anio && mes && dia ? `${dia}/${mes}/${anio}` : "";
}

// Métodos de pago: el valor que guarda el servidor y cómo se muestra
const NOMBRES_PAGO = {
    EFECTIVO: "Efectivo",
    TRANSFERENCIA: "Transferencia",
    TARJETA_DEBITO: "Tarjeta de débito",
    TARJETA_CREDITO: "Tarjeta de crédito",
    MERCADO_PAGO: "Mercado Pago",
    MODO: "MODO"
};

function nombrePago(metodo) {
    return NOMBRES_PAGO[metodo] || metodo || "-";
}
