package com.vitaltacc.config;

import com.vitaltacc.model.Rol;
import com.vitaltacc.model.Usuario;
import com.vitaltacc.repository.UsuarioRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.regex.Pattern;

/**
 * CONTROL DE ACCESO: antes de atender cada pedido se fija quién lo hace
 * (por el token de la sesión) y si tiene permiso para esa dirección.
 * Así los permisos no dependen solo de lo que muestra la pantalla:
 * aunque alguien llame a la API a mano, el servidor lo rechaza.
 *
 *   PUBLICO  → cualquiera (catálogo, datos del local, ingresar, registrarse)
 *   SESION   → cualquiera que haya iniciado sesión (sus compras, su cuenta)
 *   EQUIPO   → empleado o administrador
 *   ADMIN    → solo el administrador
 *
 * Lo que no está en la lista queda como EQUIPO.
 */
@Component
public class ControlDeAcceso implements HandlerInterceptor {

    public static final String ATRIBUTO_USUARIO = "vitaltacc.usuarioActual";

    enum Nivel { PUBLICO, SESION, EQUIPO, ADMIN }

    private record Regla(String metodo, Pattern ruta, Nivel nivel) {
        boolean aplica(String m, String r) {
            return (metodo.equals("*") || metodo.equals(m)) && ruta.matcher(r).matches();
        }
    }

    private static Regla regla(String metodo, String ruta, Nivel nivel) {
        return new Regla(metodo, Pattern.compile(ruta), nivel);
    }

    // Se usa la primera que coincide
    private static final List<Regla> REGLAS = List.of(
            // ---------- Públicas (tienda)
            regla("GET", "/productos(/\\d+)?", Nivel.PUBLICO),
            regla("GET", "/categorias(/.*)?", Nivel.PUBLICO),
            regla("GET", "/tipos-categoria(/.*)?", Nivel.PUBLICO),
            regla("GET", "/configuracion", Nivel.PUBLICO),
            regla("GET", "/promociones/(vigentes|activas)", Nivel.PUBLICO),
            regla("POST", "/usuarios/login", Nivel.PUBLICO),
            regla("POST", "/usuarios", Nivel.PUBLICO),          // registro; crear equipo lo controla el servicio
            regla("GET", "/uploads/.*", Nivel.PUBLICO),
            regla("*", "/error", Nivel.PUBLICO),

            // ---------- Con sesión (cada uno lo suyo; el dueño se controla en el controlador)
            regla("GET", "/ventas/cliente/\\d+", Nivel.SESION),
            regla("GET", "/ventas/\\d+/pdf", Nivel.SESION),
            regla("POST", "/ventas", Nivel.SESION),
            regla("GET", "/usuarios/\\d+", Nivel.SESION),
            regla("PUT", "/usuarios/\\d+/(contrasena|datos)", Nivel.SESION),
            regla("POST", "/usuarios/logout", Nivel.SESION),

            // ---------- Solo administrador
            regla("PUT", "/productos/\\d+(/editar)?", Nivel.ADMIN),
            regla("DELETE", "/productos/\\d+", Nivel.ADMIN),
            regla("DELETE", "/lotes/\\d+", Nivel.ADMIN),
            regla("*", "/promociones(/\\d+)?", Nivel.ADMIN),
            regla("PUT", "/configuracion", Nivel.ADMIN),
            regla("PUT", "/usuarios/\\d+/rol", Nivel.ADMIN),
            regla("DELETE", "/usuarios/\\d+", Nivel.ADMIN),
            regla("GET", "/ventas/(total.*|mas-vendidos.*|top-clientes.*|cierre-caja|reporte-dia|cantidad-ventas.*)", Nivel.ADMIN),
            regla("*", "/auditoria(/.*)?", Nivel.ADMIN)
    );

    private final Sesiones sesiones;
    private final UsuarioRepository usuarioRepository;

    public ControlDeAcceso(Sesiones sesiones, UsuarioRepository usuarioRepository) {
        this.sesiones = sesiones;
        this.usuarioRepository = usuarioRepository;
    }

    @Override
    public boolean preHandle(HttpServletRequest pedido, HttpServletResponse respuesta, Object handler)
            throws IOException {

        // La consulta previa del navegador (CORS) no lleva sesión
        if ("OPTIONS".equalsIgnoreCase(pedido.getMethod())) {
            return true;
        }

        Usuario usuario = usuarioDelToken(pedido);
        if (usuario != null) {
            pedido.setAttribute(ATRIBUTO_USUARIO, usuario);
        }

        String ruta = pedido.getRequestURI().substring(pedido.getContextPath().length());
        Nivel nivel = REGLAS.stream()
                .filter(r -> r.aplica(pedido.getMethod().toUpperCase(), ruta))
                .map(Regla::nivel)
                .findFirst()
                .orElse(Nivel.EQUIPO);

        if (nivel == Nivel.PUBLICO) {
            return true;
        }

        if (usuario == null) {
            return rechazar(respuesta, 401, tieneToken(pedido)
                    ? "Tu sesión venció. Volvé a iniciar sesión."
                    : "Tenés que iniciar sesión.");
        }

        boolean permitido = switch (nivel) {
            case SESION -> true;
            case EQUIPO -> esEquipo(usuario);
            case ADMIN -> usuario.getRol() == Rol.ADMIN;
            default -> true;
        };

        return permitido || rechazar(respuesta, 403, nivel == Nivel.ADMIN
                ? "Solo el administrador puede hacer esto."
                : "No tenés permisos para hacer esto.");
    }

    private Usuario usuarioDelToken(HttpServletRequest pedido) {
        String cabecera = pedido.getHeader("Authorization");
        if (cabecera == null || !cabecera.startsWith("Bearer ")) {
            return null;
        }
        Long id = sesiones.usuarioDe(cabecera.substring(7).trim());
        if (id == null) {
            return null;
        }
        // Si lo dieron de baja, su sesión deja de servir
        return usuarioRepository.findById(id)
                .filter(u -> !Boolean.FALSE.equals(u.getActivo()))
                .orElse(null);
    }

    private static boolean tieneToken(HttpServletRequest pedido) {
        String cabecera = pedido.getHeader("Authorization");
        return cabecera != null && cabecera.startsWith("Bearer ");
    }

    private static boolean rechazar(HttpServletResponse respuesta, int estado, String mensaje) throws IOException {
        respuesta.setStatus(estado);
        respuesta.setContentType("application/json");
        respuesta.setCharacterEncoding(StandardCharsets.UTF_8.name());
        respuesta.setHeader("Access-Control-Allow-Origin", "*");
        respuesta.getWriter().write("{\"error\":\"" + mensaje.replace("\"", "'") + "\"}");
        return false;
    }

    // =========================================================
    // Para usar desde los controladores y servicios
    // =========================================================

    public static boolean esEquipo(Usuario usuario) {
        return usuario != null && (usuario.getRol() == Rol.ADMIN || usuario.getRol() == Rol.EMPLEADO);
    }

    // Quién hizo el pedido actual (null si no inició sesión)
    public static Usuario usuarioActual() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes atributos) {
            Object valor = atributos.getRequest().getAttribute(ATRIBUTO_USUARIO);
            return valor instanceof Usuario u ? u : null;
        }
        return null;
    }

    // Lo puede ver el mismo usuario o alguien del equipo
    public static void exigirDuenoOEquipo(Long usuarioId) {
        Usuario actual = usuarioActual();
        if (actual == null || (!esEquipo(actual) && !actual.getId().equals(usuarioId))) {
            throw new AccesoDenegado("No tenés permiso para ver esto.");
        }
    }

    // Solo el mismo usuario (por ejemplo, cambiar su contraseña)
    public static void exigirMismoUsuario(Long usuarioId) {
        Usuario actual = usuarioActual();
        if (actual == null || !actual.getId().equals(usuarioId)) {
            throw new AccesoDenegado("Solo podés modificar tu propia cuenta.");
        }
    }

    public static class AccesoDenegado extends RuntimeException {
        public AccesoDenegado(String mensaje) {
            super(mensaje);
        }
    }
}
