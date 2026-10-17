package com.vitaltacc.service;

import com.vitaltacc.model.Rol;
import com.vitaltacc.model.Usuario;
import com.vitaltacc.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UsuarioService {

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

        return usuarioRepository.save(cliente);
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

    public Usuario guardarUsuario(Usuario usuario) {

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
            return usuarioRepository.save(usuario);
        }

        if (existente != null) {

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
            existente.setContrasena(usuario.getContrasena());
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

        return usuarioRepository.save(usuario);
    }

    // =========================================================
    // CONSULTAS
    // =========================================================

    public List<Usuario> obtenerUsuarios() {
        return usuarioRepository.findAll();
    }

    public Usuario obtenerPorId(Long id) {
        return usuarioRepository.findById(id).orElse(null);
    }

    public Usuario buscarPorDni(String dni) {
        return usuarioRepository.findByDni(normalizarDni(dni)).orElse(null);
    }

    public void eliminarUsuario(Long id) {
        usuarioRepository.deleteById(id);
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

        // Las cuentas creadas en el local no pueden iniciar sesión hasta registrarse
        if (esCuentaPendiente(usuario)) {
            throw new RuntimeException(
                    "Tu cuenta todavía no está activada. Registrate con tu DNI para activarla.");
        }

        if (!usuario.getContrasena().equals(contrasena)) {
            throw new RuntimeException("Email o contraseña incorrectos");
        }

        return usuario;
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

        if (!usuario.getContrasena().equals(contrasenaActual)) {
            throw new RuntimeException("La contraseña actual es incorrecta");
        }

        if (contrasenaNueva == null || contrasenaNueva.length() < 8) {
            throw new RuntimeException("La nueva contraseña debe tener al menos 8 caracteres");
        }

        if (contrasenaNueva.equals(contrasenaActual)) {
            throw new RuntimeException("La nueva contraseña debe ser diferente de la actual");
        }

        usuario.setContrasena(contrasenaNueva);
        usuarioRepository.save(usuario);
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

        usuario.setNombre(datos.getNombre().trim());
        usuario.setApellido(datos.getApellido().trim());
        usuario.setEmail(email);
        usuario.setTelefono(datos.getTelefono() == null ? null : datos.getTelefono().trim());

        // No se modifican DNI, rol ni contraseña.
        return usuarioRepository.save(usuario);
    }
}
