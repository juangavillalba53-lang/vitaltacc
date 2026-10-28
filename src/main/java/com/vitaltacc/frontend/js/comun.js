const API = "http://localhost:8080";

// Precios con formato argentino: $ 3.200,00
const FORMATO_PESOS = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });

// Cabecera con el token de la sesión (la usan el panel y la tienda)
function cabeceraSesion() {
    try {
        const sesion = JSON.parse(localStorage.getItem("usuario") || "null");
        return sesion?.token ? { Authorization: `Bearer ${sesion.token}` } : {};
    } catch {
        return {};
    }
}

// Avisa al servidor que la persona cerró sesión (queda en la auditoría).
// keepalive: el aviso sale aunque enseguida se cambie de página.
function avisarCierreSesion() {
    const cabecera = cabeceraSesion();
    if (!cabecera.Authorization) return;
    fetch(`${API}/usuarios/logout`, { method: "POST", headers: cabecera, keepalive: true }).catch(() => {});
}

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
