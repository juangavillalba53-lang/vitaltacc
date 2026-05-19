window.addEventListener("scroll", () => {

    const navbar = document.querySelector(".navbar");

    if (!navbar) return;

    if (window.scrollY > 50) {

        navbar.classList.add("scrolled");

    } else {

        navbar.classList.remove("scrolled");
    }
});