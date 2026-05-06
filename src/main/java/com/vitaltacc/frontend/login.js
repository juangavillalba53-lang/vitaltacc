function login() {

    const email = document.getElementById("email").value;
    const contrasena = document.getElementById("contrasena").value;

    document.getElementById("error").innerText = "";

    if (!email || !contrasena) {
        document.getElementById("error").innerText = "Completá todos los campos";
        return;
    }

    fetch("http://localhost:8080/usuarios/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email: email,
            contrasena: contrasena
        })
    })
        .then(res => {
            if (!res.ok) throw new Error("Login incorrecto");
            return res.json();
        })
        .then(usuario => {

            console.log(usuario);

            // 🔥 guardar usuario completo (incluye rol)
            localStorage.setItem("usuario", JSON.stringify(usuario));

            // 🔥 redirigir según rol
            if (usuario.rol === "ADMIN" || usuario.rol === "EMPLEADO") {
                window.location.href = "admin.html";
            } else {
                window.location.href = "index.html";
            }

        })
        .catch(() => {
            document.getElementById("error").innerText = "Email o contraseña incorrectos";
        });
}