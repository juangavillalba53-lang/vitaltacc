// =========================================================
// REPORTES: por día, por mes y por año, gráfico y cierre de caja
// =========================================================

// Los reportes de más vendidos y mejores clientes muestran solo el top 3
const TOP_REPORTES = 3;

// La primera vez que se abre Reportes, arranca en el mes y el año actuales
let reportesIniciados = false;

function cargarGeneral() {
    if (!reportesIniciados) {
        const hoy = new Date();
        document.getElementById("mes").value = String(hoy.getMonth() + 1);
        document.getElementById("anio").value = hoy.getFullYear();
        document.getElementById("anioReporte").value = hoy.getFullYear();
        document.getElementById("fechaReporte").value = hoyLocal();
        reportesIniciados = true;
    }
    filtrar();
}

function mostrarFiltro(tipo) {

    ["dia", "mes", "anio"].forEach(t => {
        const nombre = t.charAt(0).toUpperCase() + t.slice(1);
        document.getElementById(`filtro${nombre}`).style.display = t === tipo ? "flex" : "none";
    });

    document.querySelectorAll(".tabs-reportes button").forEach(boton => {
        boton.classList.toggle("activo", boton.dataset.filtro === tipo);
    });

    const contenedorGrafico = document.getElementById("contenedorGraficoVentas");

    if (contenedorGrafico) {
        contenedorGrafico.style.display = "none";
    }
}

// ---------------------------------------------------------
// Piezas comunes de los tres filtros
// ---------------------------------------------------------

function mostrarTexto(id, texto) {
    const elemento = document.getElementById(id);
    if (elemento) elemento.textContent = texto;
}

function mostrarLista(id, items, vacio, armarTexto) {
    const lista = document.getElementById(id);
    lista.innerHTML = "";

    if (!items.length) {
        lista.innerHTML = `<li>${vacio}</li>`;
        return;
    }

    items.slice(0, TOP_REPORTES).forEach((item, indice) => {
        const li = document.createElement("li");
        li.textContent = armarTexto(item, indice);
        lista.appendChild(li);
    });
}

const textoVentas = cantidad => Number(cantidad) === 1 ? "1 venta" : `${cantidad ?? 0} ventas`;
const textoMasVendido = item => `${item.producto} · ${item.cantidadVendida} ${Number(item.cantidadVendida) === 1 ? "vendido" : "vendidos"}`;
const textoCliente = (item, indice) => `${indice + 1}. ${item.cliente} · ${pesos(item.totalGastado)}`;

// Pide los cuatro datos del reporte a la vez; si uno falla, solo ese muestra "Error"
async function cargarReporte({ total, cantidad, masVendidos, clientes, vacio }) {

    const [rTotal, rCantidad, rVendidos, rClientes] = await Promise.allSettled([
        pedir(total.ruta),
        cantidad ? pedir(cantidad) : Promise.resolve(null),
        pedir(masVendidos),
        pedir(clientes)
    ]);

    if (rTotal.status === "fulfilled") {
        mostrarTexto("total", pesos(total.leer(rTotal.value)));
        if (total.cantidad) mostrarTexto("cantidadVentas", total.cantidad(rTotal.value));
    } else {
        mostrarTexto("total", "Error");
    }

    if (cantidad) {
        mostrarTexto("cantidadVentas", rCantidad.status === "fulfilled" ? rCantidad.value : "Error");
    }

    if (rVendidos.status === "fulfilled") {
        mostrarLista("masVendidos", rVendidos.value || [], vacio.productos, textoMasVendido);
    } else {
        document.getElementById("masVendidos").innerHTML = "<li>Error</li>";
    }

    if (rClientes.status === "fulfilled") {
        mostrarLista("topClientes", rClientes.value || [], vacio.clientes, textoCliente);
    } else {
        document.getElementById("topClientes").innerHTML = "<li>Error</li>";
    }
}

// ---------------------------------------------------------
// Filtros
// ---------------------------------------------------------

function filtrar() {

    const mes = parseInt(document.getElementById("mes").value, 10);
    const anio = parseInt(document.getElementById("anio").value, 10);
    const consulta = `mes=${mes}&anio=${anio}`;

    mostrarTexto("filtroActual", `Mostrando datos de ${mes}/${anio}`);

    cargarReporte({
        total: { ruta: `/ventas/total-por-mes?${consulta}`, leer: dato => dato },
        cantidad: `/ventas/cantidad-ventas/mes?${consulta}`,
        masVendidos: `/ventas/mas-vendidos/por-mes?${consulta}`,
        clientes: `/ventas/top-clientes/por-mes?${consulta}`,
        vacio: { productos: "No hay ventas en este mes", clientes: "No hay clientes en este mes" }
    });
}

function filtrarDia() {

    const fecha = document.getElementById("fechaReporte").value;

    if (!fecha) {
        mostrarAviso("Elegí una fecha.", "error");
        return;
    }

    mostrarTexto("filtroActual", `Mostrando datos del ${fechaCorta(fecha)}`);

    cargarReporte({
        // Este reporte trae el total y la cantidad de ventas juntos
        total: { ruta: `/ventas/reporte-dia?fecha=${fecha}`, leer: dato => dato.total, cantidad: dato => dato.ventas },
        masVendidos: `/ventas/mas-vendidos/por-dia?fecha=${fecha}`,
        clientes: `/ventas/top-clientes/por-dia?fecha=${fecha}`,
        vacio: { productos: "Sin datos", clientes: "Sin datos" }
    });
}

function filtrarAnio() {

    const anio = parseInt(document.getElementById("anioReporte").value, 10);

    if (!Number.isInteger(anio) || anio < 1900 || anio > 9999) {
        mostrarAviso("Ingresá un año válido.", "error");
        return;
    }

    const contenedorGrafico = document.getElementById("contenedorGraficoVentas");

    if (contenedorGrafico) {
        contenedorGrafico.style.display = "block";
    }

    mostrarTexto("filtroActual", `Mostrando datos del año ${anio}`);

    // El total del año es la suma de los meses; con esos mismos datos se dibuja el gráfico
    const sumarMeses = meses => {
        dibujarGrafico(anio, meses);
        return meses.reduce((suma, item) => suma + (Number(item.total) || 0), 0);
    };

    cargarReporte({
        total: { ruta: `/ventas/total-por-anio?anio=${anio}`, leer: sumarMeses },
        cantidad: `/ventas/cantidad-ventas/anio?anio=${anio}`,
        masVendidos: `/ventas/mas-vendidos/por-anio?anio=${anio}`,
        clientes: `/ventas/top-clientes/por-anio?anio=${anio}`,
        vacio: { productos: "Sin datos", clientes: "Sin datos" }
    });
}

// ---------------------------------------------------------
// Gráfico de ventas por mes
// ---------------------------------------------------------

let grafico = null;

function dibujarGrafico(anio, datos) {

    const canvas = document.getElementById("graficoVentas");
    if (!canvas || typeof Chart === "undefined") return;

    const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const totalesPorMes = Array(12).fill(0);

    datos.forEach(item => {
        const indice = Number(item.mes) - 1;
        if (indice >= 0 && indice < 12) {
            totalesPorMes[indice] = Number(item.total) || 0;
        }
    });

    if (grafico) {
        grafico.destroy();
    }

    grafico = new Chart(canvas.getContext("2d"), {
        type: "bar",
        data: {
            labels: meses,
            datasets: [{
                label: `Ventas por mes (${anio})`,
                data: totalesPorMes,
                backgroundColor: "#02BDB2",
                hoverBackgroundColor: "#03807A",
                borderRadius: 6,
                maxBarThickness: 42
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: contexto => pesos(contexto.parsed.y) } }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    border: { display: false },
                    grid: { color: "#E1E9E7" },
                    ticks: { color: "#4E6362", font: { family: "DM Sans" } }
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        color: "#4E6362",
                        font: { family: "DM Sans" },
                        autoSkip: false,
                        maxRotation: 0,
                        minRotation: 0
                    }
                }
            }
        }
    });
}

// ---------------------------------------------------------
// Cierre de caja del día
// ---------------------------------------------------------

async function cargarCierreCaja() {

    mostrarTexto("estadoCierreCaja", "Actualizando cierre de caja...");

    try {
        const data = await pedir("/ventas/cierre-caja");

        mostrarTexto("fechaCierreCaja", `Fecha: ${fechaCorta(data.fecha) || "No disponible"}`);
        mostrarTexto("totalCierreCaja", pesos(data.total));
        mostrarTexto("cantidadVentasCierre", textoVentas(data.ventas));

        // Lo devuelto hoy ya está descontado del total y de cada medio de pago
        const devoluciones = document.getElementById("devolucionesCierre");
        if (devoluciones) {
            const cantidad = Number(data.devoluciones) || 0;
            devoluciones.hidden = cantidad === 0;
            devoluciones.textContent = cantidad === 0 ? "" :
                `Vendido ${pesos(data.totalVendido)} − devuelto ${pesos(data.totalDevuelto)} ` +
                `(${cantidad === 1 ? "1 devolución" : `${cantidad} devoluciones`})`;
        }

        mostrarTexto("totalLocalCierre", pesos(data.totalLocal));
        mostrarTexto("cantidadLocalCierre", textoVentas(data.ventasLocales));

        mostrarTexto("totalOnlineCierre", pesos(data.totalOnline));
        mostrarTexto("cantidadOnlineCierre", textoVentas(data.ventasOnline));

        mostrarTexto("efectivoCierre", pesos(data.efectivo));
        mostrarTexto("transferenciaCierre", pesos(data.transferencia));
        mostrarTexto("tarjetaCierre", pesos(data.tarjeta));

        mostrarTexto("estadoCierreCaja", "Cierre de caja actualizado.");

    } catch {
        mostrarTexto("estadoCierreCaja", "No se pudo cargar el cierre de caja. Intentá actualizar.");
    }
}
