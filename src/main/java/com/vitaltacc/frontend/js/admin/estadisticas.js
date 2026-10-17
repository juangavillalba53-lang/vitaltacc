// Los reportes de más vendidos y mejores clientes muestran solo el top 10
const TOP_REPORTES = 10;

// 🔥 CARGA GENERAL
function cargarGeneral() {
    filtrar();
}

function mostrarFiltro(tipo) {

    document.getElementById("filtroDia").style.display = "none";
    document.getElementById("filtroMes").style.display = "none";
    document.getElementById("filtroAnio").style.display = "none";

    if (tipo === "dia") {
        document.getElementById("filtroDia").style.display = "flex";
    }

    if (tipo === "mes") {
        document.getElementById("filtroMes").style.display = "flex";
    }

    if (tipo === "anio") {
        document.getElementById("filtroAnio").style.display = "flex";
    }

    document.querySelectorAll(".tabs-reportes button").forEach(boton => {
        boton.classList.toggle("activo", boton.dataset.filtro === tipo);
    });

    const contenedorGrafico = document.getElementById("contenedorGraficoVentas");

    if (contenedorGrafico) {
        contenedorGrafico.style.display = "none";
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
            document.getElementById("total").innerText = formatoPesos(data);
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

            data.slice(0, TOP_REPORTES).forEach(item => {
                const li = document.createElement("li");
                li.innerText = `${item.producto} · ${item.cantidadVendida} vendidos`;
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

            data.slice(0, TOP_REPORTES).forEach((item, index) => {
                const li = document.createElement("li");
                li.innerText = `${index + 1}. ${item.cliente} · ${formatoPesos(item.totalGastado)}`;
                lista.appendChild(li);
            });
        })
        .catch(() => {
            document.getElementById("topClientes").innerHTML = "<li>Error</li>";
        });

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
                formatoPesos(data.total);

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

            data.slice(0, TOP_REPORTES).forEach(item => {

                const li = document.createElement("li");

                li.innerText =
                    `${item.producto} · ${item.cantidadVendida} vendidos`;

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

            data.slice(0, TOP_REPORTES).forEach((item, index) => {

                const li = document.createElement("li");

                li.innerText =
                    `${index + 1}. ${item.cliente} · ${formatoPesos(item.totalGastado)}`;

                lista.appendChild(li);
            });
        });
}


function filtrarAnio() {

    const anio = parseInt(document.getElementById("anioReporte").value, 10);

    if (!Number.isInteger(anio) || anio < 1900 || anio > 9999) {
        alert("Ingrese un año válido.");
        return;
    }

    const contenedorGrafico = document.getElementById("contenedorGraficoVentas");

    if (contenedorGrafico) {
        contenedorGrafico.style.display = "block";
    }

    document.getElementById("filtroActual").innerText =
        `Mostrando datos del año ${anio}`;

    fetch(`http://localhost:8080/ventas/cantidad-ventas/anio?anio=${anio}`)
        .then(res => {
            if (!res.ok) throw new Error("Error al consultar cantidad de ventas");
            return res.json();
        })
        .then(data => {
            document.getElementById("cantidadVentas").innerText = data;
        })
        .catch(() => {
            document.getElementById("cantidadVentas").innerText = "Error";
        });

    fetch(`http://localhost:8080/ventas/total-por-anio?anio=${anio}`)
        .then(res => {
            if (!res.ok) throw new Error("Error al consultar totales");
            return res.json();
        })
        .then(data => {
            const total = data.reduce(
                (suma, item) => suma + (Number(item.total) || 0),
                0
            );

            document.getElementById("total").innerText =
                new Intl.NumberFormat("es-AR", {
                    style: "currency",
                    currency: "ARS",
                    maximumFractionDigits: 2
                }).format(total);
        })
        .catch(() => {
            document.getElementById("total").innerText = "Error";
        });

    fetch(`http://localhost:8080/ventas/mas-vendidos/por-anio?anio=${anio}`)
        .then(res => {
            if (!res.ok) throw new Error("Error al consultar productos");
            return res.json();
        })
        .then(data => {
            const lista = document.getElementById("masVendidos");
            lista.innerHTML = "";

            if (data.length === 0) {
                lista.innerHTML = "<li>Sin datos</li>";
                return;
            }

            data.slice(0, TOP_REPORTES).forEach(item => {
                const li = document.createElement("li");
                li.innerText =
                    `${item.producto} · ${item.cantidadVendida} vendidos`;
                lista.appendChild(li);
            });
        })
        .catch(() => {
            document.getElementById("masVendidos").innerHTML = "<li>Error</li>";
        });

    fetch(`http://localhost:8080/ventas/top-clientes/por-anio?anio=${anio}`)
        .then(res => {
            if (!res.ok) throw new Error("Error al consultar clientes");
            return res.json();
        })
        .then(data => {
            const lista = document.getElementById("topClientes");
            lista.innerHTML = "";

            if (data.length === 0) {
                lista.innerHTML = "<li>Sin datos</li>";
                return;
            }

            data.slice(0, TOP_REPORTES).forEach((item, index) => {
                const li = document.createElement("li");
                li.innerText =
                    `${index + 1}. ${item.cliente} · ${formatoPesos(item.totalGastado)}`;
                lista.appendChild(li);
            });
        })
        .catch(() => {
            document.getElementById("topClientes").innerHTML = "<li>Error</li>";
        });

    cargarGrafico(anio);
}


// 🔥 GRÁFICO
let grafico = null;


function cargarGrafico(anioSeleccionado) {

    const anio = Number(anioSeleccionado);

    if (!Number.isInteger(anio)) {
        return;
    }

    fetch(`http://localhost:8080/ventas/total-por-anio?anio=${anio}`)
        .then(res => {
            if (!res.ok) throw new Error("Error al cargar el gráfico");
            return res.json();
        })
        .then(data => {

            const meses = [
                "Ene", "Feb", "Mar", "Abr", "May", "Jun",
                "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
            ];

            const totalesPorMes = Array(12).fill(0);

            data.forEach(item => {
                const indice = Number(item.mes) - 1;

                if (indice >= 0 && indice < 12) {
                    totalesPorMes[indice] = Number(item.total) || 0;
                }
            });

            const canvas = document.getElementById("graficoVentas");

            if (!canvas) return;

            const ctx = canvas.getContext("2d");

            if (grafico) {
                grafico.destroy();
            }

            grafico = new Chart(ctx, {
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
                        legend: { display: false }
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
        })
        .catch(error => {
            console.error("Error gráfico:", error);
        });
}



async function cargarCierreCaja() {

    const estado = document.getElementById("estadoCierreCaja");

    if (estado) {
        estado.textContent = "Actualizando cierre de caja...";
    }

    try {
        const respuesta = await fetch("http://localhost:8080/ventas/cierre-caja");

        if (!respuesta.ok) {
            throw new Error("No se pudo obtener el cierre de caja.");
        }

        const data = await respuesta.json();

        const moneda = valor =>
            new Intl.NumberFormat("es-AR", {
                style: "currency",
                currency: "ARS",
                maximumFractionDigits: 2
            }).format(Number(valor) || 0);

        const mostrar = (id, valor) => {
            const elemento = document.getElementById(id);
            if (elemento) elemento.textContent = valor;
        };

        mostrar("fechaCierreCaja", `Fecha: ${data.fecha || "No disponible"}`);
        mostrar("totalCierreCaja", moneda(data.total));
        mostrar("cantidadVentasCierre", `${data.ventas ?? 0} ventas`);

        mostrar("totalLocalCierre", moneda(data.totalLocal));
        mostrar("cantidadLocalCierre", `${data.ventasLocales ?? 0} ventas`);

        mostrar("totalOnlineCierre", moneda(data.totalOnline));
        mostrar("cantidadOnlineCierre", `${data.ventasOnline ?? 0} ventas`);

        mostrar("efectivoCierre", moneda(data.efectivo));
        mostrar("transferenciaCierre", moneda(data.transferencia));
        mostrar("tarjetaCierre", moneda(data.tarjeta));

        if (estado) {
            estado.textContent = "Cierre de caja actualizado.";
        }

    } catch (error) {
        console.error("Error al cargar el cierre de caja:", error);

        if (estado) {
            estado.textContent = "No se pudo cargar el cierre de caja. Intentá actualizar.";
        }
    }
}


// Formato de moneda argentino para los totales del reporte
function formatoPesos(valor) {
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS"
    }).format(Number(valor) || 0);
}
