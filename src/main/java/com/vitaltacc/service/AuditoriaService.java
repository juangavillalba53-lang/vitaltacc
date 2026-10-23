package com.vitaltacc.service;

import com.vitaltacc.config.ControlDeAcceso;
import com.vitaltacc.model.AccionAuditoria;
import com.vitaltacc.model.ModuloAuditoria;
import com.vitaltacc.model.RegistroAuditoria;
import com.vitaltacc.model.Rol;
import com.vitaltacc.model.Usuario;
import com.vitaltacc.repository.RegistroAuditoriaRepository;
import com.vitaltacc.repository.UsuarioRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

/**
 * AUDITORÍA: deja anotado quién hizo cada cambio, cuándo y qué cambió.
 *
 * Quién lo hizo sale de la sesión (el token que revisa ControlDeAcceso).
 * Las ventas, devoluciones y pedidos ya traen su usuario, así que lo pasan
 * directo con registrarComo().
 */
@Service
public class AuditoriaService {

    private static final int REGISTROS_POR_PAGINA = 20;
    private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter FECHA_HORA = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private final RegistroAuditoriaRepository registroRepository;
    private final UsuarioRepository usuarioRepository;

    public AuditoriaService(RegistroAuditoriaRepository registroRepository, UsuarioRepository usuarioRepository) {
        this.registroRepository = registroRepository;
        this.usuarioRepository = usuarioRepository;
    }

    // =========================================================
    // QUIÉN ESTÁ HACIENDO EL PEDIDO
    // =========================================================

    // Sale de la sesión (token) que revisó ControlDeAcceso
    public Usuario usuarioActual() {
        return ControlDeAcceso.usuarioActual();
    }

    // =========================================================
    // REGISTRAR
    // =========================================================

    // Con el usuario que mandó el panel
    public void registrar(ModuloAuditoria modulo, AccionAuditoria accion, Long entidadId,
                          String descripcion, Cambios detalle) {
        registrarComo(usuarioActual(), modulo, accion, entidadId, descripcion, detalle);
    }

    // Con un usuario que ya se conoce (el empleado de la venta, el que cambió el pedido...)
    // Lo que hacen los clientes no se anota: sus compras ya están en el historial.
    public void registrarComo(Usuario usuario, ModuloAuditoria modulo, AccionAuditoria accion,
                              Long entidadId, String descripcion, Cambios detalle) {

        if (usuario != null && usuario.getRol() == Rol.CLIENTE) {
            return;
        }

        RegistroAuditoria registro = new RegistroAuditoria();
        registro.setFechaHora(LocalDateTime.now());
        registro.setUsuario(usuario);
        registro.setUsuarioNombre(usuario != null ? nombreCompleto(usuario) : "Sin identificar");
        registro.setUsuarioRol(usuario != null ? usuario.getRol() : null);
        registro.setModulo(modulo);
        registro.setAccion(accion);
        registro.setEntidadId(entidadId);
        registro.setDescripcion(recortar(descripcion, 300));
        registro.setDetalle(detalle == null || detalle.vacio() ? null : recortar(detalle.texto(), 4000));

        registroRepository.save(registro);
    }

    // =========================================================
    // CONSULTAR (solo el administrador)
    // =========================================================

    @Transactional(readOnly = true)
    public Map<String, Object> buscar(LocalDate desde, LocalDate hasta, Long usuarioId,
                                      ModuloAuditoria modulo, AccionAuditoria accion,
                                      String texto, int pagina) {

        Usuario actual = usuarioActual();

        if (actual == null || actual.getRol() != Rol.ADMIN || Boolean.FALSE.equals(actual.getActivo())) {
            throw new RuntimeException("Solo el administrador puede ver la auditoría.");
        }

        if (desde != null && hasta != null && hasta.isBefore(desde)) {
            throw new RuntimeException("La fecha «hasta» no puede ser anterior a la fecha «desde».");
        }

        LocalDateTime inicio = desde != null ? desde.atStartOfDay() : LocalDateTime.of(2000, 1, 1, 0, 0);
        LocalDateTime fin = hasta != null ? hasta.plusDays(1).atStartOfDay() : LocalDateTime.now().plusDays(1);
        String busqueda = texto == null || texto.isBlank() ? null : texto.trim();

        Page<RegistroAuditoria> resultado = registroRepository.buscar(
                inicio, fin, usuarioId, modulo, accion, busqueda, Rol.CLIENTE,
                PageRequest.of(Math.max(pagina - 1, 0), REGISTROS_POR_PAGINA));

        Map<String, Object> respuesta = new HashMap<>();
        respuesta.put("registros", resultado.getContent().stream().map(this::aMapa).toList());
        respuesta.put("pagina", resultado.getNumber() + 1);
        respuesta.put("totalPaginas", Math.max(resultado.getTotalPages(), 1));
        respuesta.put("total", resultado.getTotalElements());
        return respuesta;
    }

    // Para armar los filtros de la pantalla. Los usuarios del equipo van todos,
    // también los dados de baja, para poder ver lo que hicieron.
    public Map<String, Object> opciones() {
        Map<String, Object> respuesta = new HashMap<>();
        respuesta.put("usuarios", usuarioRepository.findAll().stream()
                .filter(u -> u.getRol() == Rol.ADMIN || u.getRol() == Rol.EMPLEADO)
                .sorted(java.util.Comparator.comparing(AuditoriaService::nombreCompleto, String.CASE_INSENSITIVE_ORDER))
                .map(u -> Map.of(
                        "id", u.getId(),
                        "nombre", nombreCompleto(u) + (Boolean.FALSE.equals(u.getActivo()) ? " (dado de baja)" : "")))
                .toList());
        respuesta.put("modulos", Arrays.stream(ModuloAuditoria.values())
                .map(m -> Map.of("valor", m.name(), "nombre", m.getNombre())).toList());
        respuesta.put("acciones", Arrays.stream(AccionAuditoria.values())
                .map(a -> Map.of("valor", a.name(), "nombre", a.getNombre())).toList());
        return respuesta;
    }

    private Map<String, Object> aMapa(RegistroAuditoria r) {
        Map<String, Object> data = new HashMap<>();
        data.put("id", r.getId());
        data.put("fechaHora", r.getFechaHora().format(FECHA_HORA));
        data.put("usuarioId", r.getUsuario() != null ? r.getUsuario().getId() : null);
        data.put("usuario", r.getUsuarioNombre());
        data.put("rol", r.getUsuarioRol() != null ? nombreRol(r.getUsuarioRol()) : null);
        data.put("modulo", r.getModulo().name());
        data.put("moduloNombre", r.getModulo().getNombre());
        data.put("accion", r.getAccion().name());
        data.put("accionNombre", r.getAccion().getNombre());
        data.put("entidadId", r.getEntidadId());
        data.put("descripcion", r.getDescripcion());
        data.put("detalle", r.getDetalle() == null ? List.of() : List.of(r.getDetalle().split("\n")));
        return data;
    }

    // =========================================================
    // FORMATOS (para que el detalle se lea bien)
    // =========================================================

    public static String nombreCompleto(Usuario usuario) {
        String nombre = ((usuario.getNombre() == null ? "" : usuario.getNombre()) + " "
                + (usuario.getApellido() == null ? "" : usuario.getApellido())).trim();
        return nombre.isEmpty() ? usuario.getEmail() : nombre;
    }

    public static String nombreRol(Rol rol) {
        if (rol == null) return "—";
        return switch (rol) {
            case ADMIN -> "Administrador";
            case EMPLEADO -> "Empleado";
            case CLIENTE -> "Cliente";
        };
    }

    public static String pesos(Double valor) {
        if (valor == null) return "(vacío)";
        return NumberFormat.getCurrencyInstance(Locale.forLanguageTag("es-AR")).format(valor)
                .replace(' ', ' ');
    }

    public static String fecha(LocalDate fecha) {
        return fecha == null ? "(vacío)" : fecha.format(FECHA);
    }

    public static String comillas(String texto) {
        return "«" + (texto == null ? "" : texto) + "»";
    }

    private static String recortar(String texto, int largo) {
        if (texto == null) return null;
        return texto.length() > largo ? texto.substring(0, largo - 1) + "…" : texto;
    }

    // =========================================================
    // CAMBIOS: arma el detalle «Campo: antes → después», un dato por línea
    // =========================================================

    public static class Cambios {

        private final List<String> lineas = new ArrayList<>();

        // Agrega la línea solo si el valor cambió
        public Cambios campo(String nombre, Object antes, Object despues) {
            String a = mostrar(antes);
            String d = mostrar(despues);
            if (!Objects.equals(a, d)) {
                lineas.add(nombre + ": " + a + " → " + d);
            }
            return this;
        }

        public Cambios pesos(String nombre, Double antes, Double despues) {
            if (!Objects.equals(antes, despues)) {
                lineas.add(nombre + ": " + AuditoriaService.pesos(antes) + " → " + AuditoriaService.pesos(despues));
            }
            return this;
        }

        // Un dato suelto, por ejemplo en un alta: «Precio: $ 2.500,00»
        public Cambios dato(String nombre, Object valor) {
            lineas.add(nombre + ": " + mostrar(valor));
            return this;
        }

        public Cambios linea(String texto) {
            if (texto != null && !texto.isBlank()) {
                lineas.add(texto);
            }
            return this;
        }

        public boolean vacio() {
            return lineas.isEmpty();
        }

        public String texto() {
            return String.join("\n", lineas);
        }

        private static String mostrar(Object valor) {
            if (valor == null) return "(vacío)";
            if (valor instanceof LocalDate f) return fecha(f);
            if (valor instanceof Rol r) return nombreRol(r);
            String texto = valor.toString().trim().replaceAll("\\s+", " ");
            if (texto.isEmpty()) return "(vacío)";
            return texto.length() > 120 ? texto.substring(0, 119) + "…" : texto;
        }
    }
}
