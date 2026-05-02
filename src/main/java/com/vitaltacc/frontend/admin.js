// 🔥 Total facturado
fetch("http://localhost:8080/ventas/total")
    .then(res => res.json())
    .then(data => {
        document.getElementById("total").innerText = "$" + data;
    });


// 🔥 Productos más vendidos
fetch("http://localhost:8080/ventas/mas-vendidos")
    .then(res => res.json())
    .then(data => {

        const lista = document.getElementById("masVendidos");

        data.forEach(item => {

            const li = document.createElement("li");

            li.innerText = `${item.producto} - ${item.cantidadVendida} vendidos`;

            lista.appendChild(li);
        });
    });