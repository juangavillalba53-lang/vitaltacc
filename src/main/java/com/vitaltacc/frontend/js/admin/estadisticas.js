// 🔥 CARGA GENERAL
function cargarGeneral() {
    cargarGrafico();
    filtrar();
}

function mostrarFiltro(tipo) {

    document.getElementById("filtroDia").style.display = "none";
    document.getElementById("filtroMes").style.display = "none";
    document.getElementById("filtroAnio").style.display = "none";

    if (tipo === "dia") {
        document.getElementById("filtroDia").style.display = "block";
    }

    if (tipo === "mes") {
        document.getElementById("filtroMes").style.display = "block";
    }

    if (tipo === "anio") {
        document.getElementById("filtroAnio").style.display = "block";
    }
}

// 🔥 FILTRAR POR MES
function filtrar() {

    const mes = parseInt(document.getElementById("mes").value);
    const anio = parseInt(document.getElementById("anio").value);

    const filtroTexto = document.getElementById("filtroActual");
    if (filtroTexto) {
        filtroTexto.innerText = `Mostrando datos de ${mes}/${anio}`;
    }

    // 🔥 TOTAL
    fetch(`http://localhost:8080/ventas/total-por-mes?mes=${mes}&anio=${anio}`)
        .then(res => res.json())
        .then(data => {
            document.getElementById("total").innerText = "$" + data;
        })
        .catch(() => {
            document.getElementById("total").innerText = "Error";
        });

    // 🔥 CANTIDAD DE VENTAS
    fetch(`http://localhost:8080/ventas/cantidad-ventas/mes?mes=${mes}&anio=${anio}`)
        .then(res => res.json())
        .then(data => {
            document.getElementById("cantidadVentas").innerText = data;
        })
        .catch(() => {
            document.getElementById("cantidadVentas").innerText = "Error";
        });
    // 🔥 PRODUCTOS MÁS VENDIDOS
    fetch(`http://localhost:8080/ventas/mas-vendidos/por-mes?mes=${mes}&anio=${anio}`)
        .then(res => res.json())
        .then(data => {

            const lista = document.getElementById("masVendidos");
            lista.innerHTML = "";

            if (data.length === 0) {
                lista.innerHTML = "<li>No hay ventas en este mes</li>";
                return;
            }

            data.forEach(item => {
                const li = document.createElement("li");
                li.innerText = `${item.producto} - ${item.cantidadVendida} vendidos`;
                lista.appendChild(li);
            });
        })
        .catch(() => {
            document.getElementById("masVendidos").innerHTML = "<li>Error</li>";
        });

    // 🔥 TOP CLIENTES
    fetch(`http://localhost:8080/ventas/top-clientes/por-mes?mes=${mes}&anio=${anio}`)
        .then(res => res.json())
        .then(data => {

            const lista = document.getElementById("topClientes");
            lista.innerHTML = "";

            if (data.length === 0) {
                lista.innerHTML = "<li>No hay clientes en este mes</li>";
                return;
            }

            data.forEach((item, index) => {
                const li = document.createElement("li");
                li.innerText = `${index + 1}. ${item.cliente} - $${item.totalGastado}`;
                lista.appendChild(li);
            });
        })
        .catch(() => {
            document.getElementById("topClientes").innerHTML = "<li>Error</li>";
        });

    cargarGrafico();
}

function filtrarDia() {

    const fecha = document.getElementById("fechaReporte").value;

    if (!fecha) {
        alert("Seleccione una fecha");
        return;
    }

    document.getElementById("filtroActual").innerText =
        `Mostrando datos del ${fecha}`;

    fetch(`http://localhost:8080/ventas/reporte-dia?fecha=${fecha}`)
        .then(res => res.json())
        .then(data => {

            document.getElementById("total").innerText =
                "$" + data.total;

            document.getElementById("cantidadVentas").innerText =
                data.ventas;
        });

    fetch(`http://localhost:8080/ventas/mas-vendidos/por-dia?fecha=${fecha}`)
        .then(res => res.json())
        .then(data => {

            const lista = document.getElementById("masVendidos");
            lista.innerHTML = "";

            if (data.length === 0) {
                lista.innerHTML = "<li>Sin datos</li>";
                return;
            }

            data.forEach(item => {

                const li = document.createElement("li");

                li.innerText =
                    `${item.producto} - ${item.cantidadVendida} vendidos`;

                lista.appendChild(li);
            });
        });

    fetch(`http://localhost:8080/ventas/top-clientes/por-dia?fecha=${fecha}`)
        .then(res => res.json())
        .then(data => {

            const lista = document.getElementById("topClientes");
            lista.innerHTML = "";

            if (data.length === 0) {
                lista.innerHTML = "<li>Sin datos</li>";
                return;
            }

            data.forEach((item, index) => {

                const li = document.createElement("li");

                li.innerText =
                    `${index + 1}. ${item.cliente} - $${item.totalGastado}`;

                lista.appendChild(li);
            });
        });
}

function filtrarAnio() {

    const anio = parseInt(
        document.getElementById("anioReporte").value
    );

    document.getElementById("filtroActual").innerText =
        `Mostrando datos del año ${anio}`;

    fetch(`http://localhost:8080/ventas/cantidad-ventas/anio?anio=${anio}`)
        .then(res => res.json())
        .then(data => {
            document.getElementById("cantidadVentas").innerText = data;
        });

    fetch(`http://localhost:8080/ventas/total-por-anio?anio=${anio}`)
        .then(res => res.json())
        .then(data => {

            let total = 0;

            data.forEach(item => {
                total += item.total;
            });

            document.getElementById("total").innerText =
                "$" + total;
        });

    fetch(`http://localhost:8080/ventas/mas-vendidos/por-anio?anio=${anio}`)
        .then(res => res.json())
        .then(data => {

            const lista = document.getElementById("masVendidos");
            lista.innerHTML = "";

            if (data.length === 0) {
                lista.innerHTML = "<li>Sin datos</li>";
                return;
            }

            data.forEach(item => {

                const li = document.createElement("li");

                li.innerText =
                    `${item.producto} - ${item.cantidadVendida} vendidos`;

                lista.appendChild(li);
            });
        });

    fetch(`http://localhost:8080/ventas/top-clientes/por-anio?anio=${anio}`)
        .then(res => res.json())
        .then(data => {

            const lista = document.getElementById("topClientes");
            lista.innerHTML = "";

            if (data.length === 0) {
                lista.innerHTML = "<li>Sin datos</li>";
                return;
            }

            data.forEach((item, index) => {

                const li = document.createElement("li");

                li.innerText =
                    `${index + 1}. ${item.cliente} - $${item.totalGastado}`;

                lista.appendChild(li);
            });
        });

    cargarGrafico();
}

// 🔥 GRÁFICO
let grafico = null;

function cargarGrafico() {

    const anio = parseInt(document.getElementById("anio").value);

    fetch(`http://localhost:8080/ventas/total-por-anio?anio=${anio}`)
        .then(res => res.json())
        .then(data => {

            const meses = [];
            const totales = [];

            data.forEach(item => {
                meses.push(item.mes);
                totales.push(item.total);
            });

            const ctx = document.getElementById("graficoVentas").getContext("2d");

            if (grafico) {
                grafico.destroy();
            }

            grafico = new Chart(ctx, {
                type: "bar",
                data: {
                    labels: meses,
                    datasets: [{
                        label: "Ventas por mes",
                        data: totales
                    }]
                }
            });
        })
        .catch(() => {
            console.error("Error gráfico");
        });
}