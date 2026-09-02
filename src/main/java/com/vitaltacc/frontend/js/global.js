const navbar = document.querySelector(".navbar");

const menuToggle = document.getElementById("menuToggle");

const navLinks = document.querySelector(".nav-links");

const footerToggle = document.getElementById("footerToggle");

const footerExtra = document.getElementById("footerExtra");

const menuPanel = document.getElementById("menuPanel");

// 🔥 NAVBAR SCROLL

window.addEventListener("scroll", () => {

    if (!navbar) return;

    if (window.scrollY > 50) {

        navbar.classList.add("scrolled");

    } else {

        navbar.classList.remove("scrolled");
    }
});

// 🔥 MENU MOBILE

if (menuToggle && navLinks) {

    menuToggle.addEventListener("click", () => {

        navLinks.classList.toggle("active");
    });

    document.querySelectorAll(".nav-links a").forEach(link => {

        link.addEventListener("click", () => {

            navLinks.classList.remove("active");
        });
    });

    document.addEventListener("click", (e) => {

        const clickDentroMenu = navLinks.contains(e.target);

        const clickBoton = menuToggle.contains(e.target);

        if (!clickDentroMenu && !clickBoton) {

            navLinks.classList.remove("active");
        }
    });
}

// 🔥 FOOTER

if (footerToggle && footerExtra) {

    footerToggle.addEventListener("click", () => {

        const isOpen = footerExtra.classList.contains("active");

        footerExtra.classList.toggle("active");

        footerToggle.classList.toggle("active");

        // SI ABRE → bajar suavemente hasta el final
        if (!isOpen) {

            setTimeout(() => {

                window.scrollTo({

                    top: document.body.scrollHeight,

                    behavior: "smooth"

                });

            }, 250);
        }

        // SI CIERRA → subir un poquito
        else {

            setTimeout(() => {

                window.scrollBy({

                    top: -250,

                    behavior: "smooth"

                });

            }, 150);
        }
    });
}

if (menuToggle && menuPanel) {

    menuToggle.addEventListener("click", () => {

        menuPanel.classList.toggle("active");
    });

    document.addEventListener("click", (e) => {

        const dentroPanel = menuPanel.contains(e.target);

        const clickBoton = menuToggle.contains(e.target);

        if (!dentroPanel && !clickBoton) {

            menuPanel.classList.remove("active");
        }
    });
}