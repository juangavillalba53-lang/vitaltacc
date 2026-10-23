package com.vitaltacc.service;

import com.vitaltacc.config.ControlDeAcceso.AccesoDenegado;
import com.vitaltacc.config.Contrasenas;
import com.vitaltacc.model.AccionAuditoria;
import com.vitaltacc.model.ModuloAuditoria;
import com.vitaltacc.model.Rol;
import com.vitaltacc.service.AuditoriaService.Cambios;
import com.vitaltacc.model.Usuario;
import com.vitaltacc.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UsuarioService {

    @Autowired
    private AuditoriaService auditoria;

    private static boolean esDelEquipo(Usuario usuario) {
        return usuario != null && (usuario.getRol() == Rol.ADMIN || usuario.getRol() == Rol.EMPLEADO);
    }

    /*
     * Cuenta "pendiente": cliente creado en el local con su DNI, que todavía
     * no se registró en la web. Tiene un email y una contraseña provisorios.
     * Cuando se registra online con el mismo DNI, se completa esa misma
     * cuenta y quedan vinculadas todas sus compras anteriores.
     */
    public static final String CONTRASENA_PENDIENTE = "TEMP";
    private static final String DOMINIO_EMAIL_PENDIENTE = "@local.com";

    @Autowired
    private UsuarioRepository usuarioRepository;

    // =========================================================
    // UTILIDADES
    // =========================================================

    // Deja solo los números: "30.111.222" y "30111222" son el mismo DNI
    public static String normalizarDni(String dni) {
        if (dni == null) {
            return null;
        }
        return dni.replaceAll("\\D", "");
    }

    private static boolean tieneTexto(String valor) {
        return valor != null && !valor.isBlank();
    }

    public static boolean esCuentaPendiente(Usuario usuario) {
        return usuario != null
                && (CONTRASENA_PENDIENTE.equals(usuario.getContrasena())
                        || (usuario.getEmail() != null
                                && usuario.getEmail().endsWith(DOMINIO_EMAIL_PENDIENTE)));
    }

    // =========================================================
    // CLIENTES CREADOS EN EL LOCAL
    // =========================================================

    // Busca el cliente por DNI y, si no existe, lo crea como cuenta pendiente
    public Usuario obtenerOCrearClientePorDni(
            String dni,
            String nombre,
            String apellido,
            String telefono) {

        String dniNormalizado = normalizarDni(dni);

        if (!tieneTexto(dniNormalizado)) {
            throw new RuntimeException("El DNI es obligatorio");
        }

        Usuario existente = usuarioRepository.findByDni(dniNormalizado).orElse(null);

        if (existente != null) {
            // Si no tenía teléfono y ahora lo dio, se guarda
            if (!tieneTexto(existente.getTelefono()) && tieneTexto(telefono)) {
                existente.setTelefono(telefono.trim());
                return usuarioRepository.save(existente);
            }
            return existente;
        }

        Usuario cliente = new Usuario();
        cliente.setNombre(tieneTexto(nombre) ? nombre.trim() : "Consumidor");
        cliente.setApellido(tieneTexto(apellido) ? apellido.trim() : "Final");
        cliente.setDni(dniNormalizado);
        cliente.setTelefono(tieneTexto(telefono) ? telefono.trim() : null);
        cliente.setEmail("cliente_" + dniNormalizado + DOMINIO_EMAIL_PENDIENTE);
        cliente.setContrasena(CONTRASENA_PENDIENTE);
        cliente.setRol(Rol.CLIENTE);

        Usuario guardado = usuarioRepository.save(cliente);

        auditoria.registrar(ModuloAuditoria.USUARIOS, AccionAuditoria.CREAR, guardado.getId(),
                "Registró al cliente " + AuditoriaService.nombreCompleto(guardado) + " en una venta del local",
                new Cambios()
                        .dato("DNI", guardado.getDni())
                        .dato("Teléfono", guardado.getTelefono()));

        return guardado;
    }

    // Valida un email de forma simple y lo deja en minúsculas (o null si no sirve)
    public static String limpiarEmail(String email) {
        if (!tieneTexto(email)) {
            return null;
        }
        String limpio = email.trim().toLowerCase();
        return limpio.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$") ? limpio : null;
    }

    public static boolean esEmailInterno(String email) {
        return email == null || email.endsWith(DOMINIO_EMAIL_PENDIENTE);
    }

    // Si el cliente del local da su email, se guarda en su cuenta pendiente
    // para mandarle los próximos comprobantes. Las cuentas activas no se tocan.
    public void guardarEmailDeContacto(Usuario cliente, String email) {

        String limpio = limpiarEmail(email);

        if (cliente == null || limpio == null || !esCuentaPendiente(cliente)
                || limpio.equals(cliente.getEmail())) {
            return;
        }

        // Si el email ya es de otra persona, no se pisa nada
        if (usuarioRepository.findByEmail(limpio).isPresent()) {
            return;
        }

        cliente.setEmail(limpio);
        usuarioRepository.save(cliente);
    }

    // =========================================================
    // ALTA Y ACTUALIZACIÓN
    // =========================================================

    // Alta desde el panel (un administrador crea a alguien del equipo)
    // o registro de un cliente en la tienda
    public Usuario guardarUsuario(Usuario usuario) {

        Usuario quienLoHace = auditoria.usuarioActual();

        // Sin un administrador detrás es un registro desde la tienda: siempre como cliente
        if (quienLoHace == null || quienLoHace.getRol() != Rol.ADMIN) {
            if (usuario.getRol() != null && usuario.getRol() != Rol.CLIENTE) {
                throw new AccesoDenegado("Solo el administrador puede crear usuarios del equipo.");
            }
            usuario.setRol(Rol.CLIENTE);
            usuario.setId(null);
        }

        if (usuario.getContrasena() != null && usuario.getContrasena().length() < 8) {
            throw new RuntimeException("La contraseña debe tener al menos 8 caracteres");
        }

        Usuario guardado = guardarUsuarioSinAuditar(usuario);

        Cambios datos = new Cambios()
                .dato("DNI", guardado.getDni())
                .dato("Email", guardado.getEmail())
                .dato("Rol", guardado.getRol());

        // Solo cuando alguien del equipo crea un usuario desde el panel
        // (el registro de un cliente en la tienda no se anota)
        if (quienLoHace != null && !quienLoHace.getId().equals(guardado.getId())) {
            auditoria.registrarComo(quienLoHace, ModuloAuditoria.USUARIOS, AccionAuditoria.CREAR, guardado.getId(),
                    "Creó el usuario " + AuditoriaService.nombreCompleto(guardado)
                            + " (" + AuditoriaService.nombreRol(guardado.getRol()) + ")", datos);
        }

        return guardado;
    }

    private Usuario guardarUsuarioSinAuditar(Usuario usuario) {

        usuario.setDni(normalizarDni(usuario.getDni()));

        if (!tieneTexto(usuario.getDni())) {
            throw new RuntimeException("El DNI es obligatorio");
        }

        if (!tieneTexto(usuario.getNombre())) {
            throw new RuntimeException("El nombre es obligatorio");
        }

        if (!tieneTexto(usuario.getApellido())) {
            throw new RuntimeException("El apellido es obligatorio");
        }

        if (tieneTexto(usuario.getEmail())) {
            usuario.setEmail(usuario.getEmail().trim().toLowerCase());
        }

        Usuario existente = usuarioRepository.findByDni(usuario.getDni()).orElse(null);

        // El email no puede pertenecer a otra persona
        if (tieneTexto(usuario.getEmail())) {
            Usuario usuarioEmail = usuarioRepository.findByEmail(usuario.getEmail()).orElse(null);

            if (usuarioEmail != null && !usuarioEmail.getDni().equals(usuario.getDni())) {
                throw new RuntimeException("El email ya está registrado");
            }
        }

        // Actualización de un usuario que ya existe (por ejemplo, cambio de rol)
        if (existente != null
                && usuario.getId() != null
                && usuario.getId().equals(existente.getId())) {
            // La contraseña se encripta si vino una nueva; si no, queda la que tenía
            usuario.setContrasena(tieneTexto(usuario.getContrasena())
                    ? Contrasenas.encriptar(usuario.getContrasena())
                    : existente.getContrasena());
            return usuarioRepository.save(usuario);
        }

        if (existente != null) {

            // Cuenta dada de baja (por ejemplo, un empleado que vuelve): se reactiva
            if (Boolean.FALSE.equals(existente.getActivo())) {

                if (!tieneTexto(usuario.getEmail()) || !tieneTexto(usuario.getContrasena())) {
                    throw new RuntimeException("El email y la contraseña son obligatorios");
                }

                existente.setNombre(usuario.getNombre().trim());
                existente.setApellido(usuario.getApellido().trim());
                existente.setEmail(usuario.getEmail());
                existente.setContrasena(Contrasenas.encriptar(usuario.getContrasena()));
                existente.setRol(usuario.getRol() != null ? usuario.getRol() : Rol.CLIENTE);
                existente.setActivo(true);

                if (tieneTexto(usuario.getTelefono())) {
                    existente.setTelefono(usuario.getTelefono().trim());
                }

                return usuarioRepository.save(existente);
            }

            // Una cuenta activa no se puede volver a registrar
            if (!esCuentaPendiente(existente)) {
                throw new RuntimeException(
                        "Ya existe una cuenta con ese DNI. Iniciá sesión con tu email.");
            }

            // Cuenta creada en el local: se completa y conserva sus compras
            if (!tieneTexto(usuario.getEmail()) || !tieneTexto(usuario.getContrasena())) {
                throw new RuntimeException("El email y la contraseña son obligatorios");
            }

            existente.setEmail(usuario.getEmail());
            existente.setContrasena(Contrasenas.encriptar(usuario.getContrasena()));
            existente.setNombre(usuario.getNombre().trim());
            existente.setApellido(usuario.getApellido().trim());

            if (tieneTexto(usuario.getTelefono())) {
                existente.setTelefono(usuario.getTelefono().trim());
            }

            if (usuario.getRol() != null) {
                existente.setRol(usuario.getRol());
            }

            return usuarioRepository.save(existente);
        }

        // Usuario nuevo
        if (!tieneTexto(usuario.getEmail()) || !tieneTexto(usuario.getContrasena())) {
            throw new RuntimeException("El email y la contraseña son obligatorios");
        }

        if (usuario.getRol() == null) {
            usuario.setRol(Rol.CLIENTE);
        }

        usuario.setContrasena(Contrasenas.encriptar(usuario.getContrasena()));
        return usuarioRepository.save(usuario);
    }

    // =========================================================
    // CONSULTAS
    // =========================================================

    // Usuarios activos (los dados de baja no se listan)
    public List<Usuario> obtenerUsuarios() {
        return usuarioRepository.findAll()
                .stream()
                .filter(u -> !Boolean.FALSE.equals(u.getActivo()))
                .toList();
    }

    public Usuario obtenerPorId(Long id) {
        return usuarioRepository.findById(id).orElse(null);
    }

    public Usuario buscarPorDni(String dni) {
        return usuarioRepository.findByDni(normalizarDni(dni)).orElse(null);
    }

    // Baja lógica: el usuario ya no puede entrar, pero sus ventas quedan guardadas
    public void eliminarUsuario(Long id) {

        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        if (usuario.getRol() == Rol.ADMIN && contarAdminsActivos() <= 1) {
            throw new RuntimeException(
                    "No se puede eliminar al único administrador. Primero nombrá a otro.");
        }

        usuario.setActivo(false);
        usuarioRepository.save(usuario);

        auditoria.registrar(ModuloAuditoria.USUARIOS, AccionAuditoria.ELIMINAR, id,
                "Dio de baja a " + AuditoriaService.nombreCompleto(usuario)
                        + " (" + AuditoriaService.nombreRol(usuario.getRol()) + ")",
                new Cambios().dato("Email", usuario.getEmail()));
    }

    public Usuario cambiarRol(Long id, Rol rol) {

        if (rol == null) {
            throw new RuntimeException("Elegí un rol");
        }

        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        if (usuario.getRol() == Rol.ADMIN && rol != Rol.ADMIN && contarAdminsActivos() <= 1) {
            throw new RuntimeException(
                    "Tiene que quedar al menos un administrador.");
        }

        Rol antes = usuario.getRol();
        usuario.setRol(rol);
        Usuario guardado = usuarioRepository.save(usuario);

        auditoria.registrar(ModuloAuditoria.USUARIOS, AccionAuditoria.MODIFICAR, id,
                "Cambió el rol de " + AuditoriaService.nombreCompleto(usuario),
                new Cambios().campo("Rol", antes, rol));

        return guardado;
    }

    private long contarAdminsActivos() {
        return usuarioRepository.findAll()
                .stream()
                .filter(u -> u.getRol() == Rol.ADMIN && !Boolean.FALSE.equals(u.getActivo()))
                .count();
    }

    // =========================================================
    // SESIÓN Y CUENTA
    // =========================================================

    public Usuario login(String email, String contrasena) {

        if (!tieneTexto(email) || !tieneTexto(contrasena)) {
            throw new RuntimeException("Completá el email y la contraseña");
        }

        Usuario usuario = usuarioRepository.findByEmail(email.trim().toLowerCase())
                .or(() -> usuarioRepository.findByEmail(email.trim()))
                .orElseThrow(() -> new RuntimeException("Email o contraseña incorrectos"));

        if (Boolean.FALSE.equals(usuario.getActivo())) {
            ingresoFallido(usuario, "La cuenta está dada de baja");
            throw new RuntimeException("Esta cuenta fue dada de baja.");
        }

        // Las cuentas creadas en el local no pueden iniciar sesión hasta registrarse
        if (esCuentaPendiente(usuario)) {
            throw new RuntimeException(
                    "Tu cuenta todavía no está activada. Registrate con tu DNI para activarla.");
        }

        if (!Contrasenas.coincide(contrasena, usuario.getContrasena())) {
            ingresoFallido(usuario, "Contraseña incorrecta");
            throw new RuntimeException("Email o contraseña incorrectos");
        }

        // Se anotan los ingresos del equipo (los de los clientes no)
        if (esDelEquipo(usuario)) {
            auditoria.registrarComo(usuario, ModuloAuditoria.SESION, AccionAuditoria.INGRESO, usuario.getId(),
                    "Inició sesión en el panel", null);
        }

        return usuario;
    }

    private void ingresoFallido(Usuario usuario, String motivo) {
        if (esDelEquipo(usuario)) {
            auditoria.registrarComo(usuario, ModuloAuditoria.SESION, AccionAuditoria.INGRESO_FALLIDO, usuario.getId(),
                    "Intento de ingreso fallido", new Cambios().dato("Motivo", motivo));
        }
    }

    public void cambiarContrasena(
            Long id,
            String contrasenaActual,
            String contrasenaNueva) {

        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        if (!tieneTexto(contrasenaActual)) {
            throw new RuntimeException("Ingresá tu contraseña actual");
        }

        if (!Contrasenas.coincide(contrasenaActual, usuario.getContrasena())) {
            throw new RuntimeException("La contraseña actual es incorrecta");
        }

        if (contrasenaNueva == null || contrasenaNueva.length() < 8) {
            throw new RuntimeException("La nueva contraseña debe tener al menos 8 caracteres");
        }

        if (contrasenaNueva.equals(contrasenaActual)) {
            throw new RuntimeException("La nueva contraseña debe ser diferente de la actual");
        }

        usuario.setContrasena(Contrasenas.encriptar(contrasenaNueva));
        usuarioRepository.save(usuario);

        // La contraseña nunca se guarda en la auditoría: solo que se cambió
        auditoria.registrarComo(usuario, ModuloAuditoria.USUARIOS, AccionAuditoria.MODIFICAR, id,
                "Cambió su contraseña", null);
    }

    public Usuario actualizarDatosPersonales(Long id, Usuario datos) {

        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        if (!tieneTexto(datos.getNombre())) {
            throw new RuntimeException("El nombre es obligatorio");
        }

        if (!tieneTexto(datos.getApellido())) {
            throw new RuntimeException("El apellido es obligatorio");
        }

        if (!tieneTexto(datos.getEmail())) {
            throw new RuntimeException("El correo electrónico es obligatorio");
        }

        String email = datos.getEmail().trim().toLowerCase();

        Usuario usuarioEmail = usuarioRepository.findByEmail(email).orElse(null);

        if (usuarioEmail != null && !usuarioEmail.getId().equals(id)) {
            throw new RuntimeException("El email ya está registrado");
        }

        Cambios cambios = new Cambios()
                .campo("Nombre", usuario.getNombre(), datos.getNombre().trim())
                .campo("Apellido", usuario.getApellido(), datos.getApellido().trim())
                .campo("Email", usuario.getEmail(), email)
                .campo("Teléfono", usuario.getTelefono(), datos.getTelefono());

        usuario.setNombre(datos.getNombre().trim());
        usuario.setApellido(datos.getApellido().trim());
        usuario.setEmail(email);
        usuario.setTelefono(datos.getTelefono() == null ? null : datos.getTelefono().trim());

        // No se modifican DNI, rol ni contraseña.
        Usuario guardado = usuarioRepository.save(usuario);

        auditoria.registrarComo(guardado, ModuloAuditoria.USUARIOS, AccionAuditoria.MODIFICAR, id,
                "Actualizó sus datos", cambios.vacio() ? cambios.linea("Se guardó sin cambios") : cambios);

        return guardado;
    }
}
