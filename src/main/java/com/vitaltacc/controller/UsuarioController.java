package com.vitaltacc.controller;

import com.vitaltacc.config.ControlDeAcceso;
import com.vitaltacc.config.Sesiones;
import com.vitaltacc.model.Usuario;
import com.vitaltacc.service.UsuarioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.HashMap;

import java.util.List;

@RestController
@RequestMapping("/usuarios")
@CrossOrigin(origins = "*")
public class UsuarioController {

    @Autowired
    private UsuarioService usuarioService;

    @Autowired
    private Sesiones sesiones;

    // Datos del usuario para el navegador, con el token de la sesión (nunca la contraseña)
    private Map<String, Object> conSesion(Usuario usuario) {
        Map<String, Object> datos = new HashMap<>();
        datos.put("id", usuario.getId());
        datos.put("nombre", usuario.getNombre());
        datos.put("apellido", usuario.getApellido());
        datos.put("email", usuario.getEmail());
        datos.put("dni", usuario.getDni());
        datos.put("telefono", usuario.getTelefono());
        datos.put("rol", usuario.getRol());
        datos.put("activo", usuario.getActivo());
        datos.put("token", sesiones.crear(usuario.getId()));
        return datos;
    }

    // Crear usuario
    // Desde el panel (el administrador crea a alguien del equipo) o el registro de la tienda.
    // En el registro se devuelve también la sesión, así el cliente queda adentro.
    @PostMapping
    public Object crearUsuario(@RequestBody Usuario usuario) {
        boolean loCreaElEquipo = ControlDeAcceso.esEquipo(ControlDeAcceso.usuarioActual());
        Usuario guardado = usuarioService.guardarUsuario(usuario);
        return loCreaElEquipo ? guardado : conSesion(guardado);
    }

    // Listar usuarios
    @GetMapping
    public List<Usuario> listarUsuarios() {
        return usuarioService.obtenerUsuarios();
    }

    // Buscar por ID
    @GetMapping("/{id}")
    public Usuario obtenerUsuario(@PathVariable Long id) {
        ControlDeAcceso.exigirDuenoOEquipo(id);
        return usuarioService.obtenerPorId(id);
    }

    // Buscar por DNI
    @GetMapping("/dni/{dni}")
    public Usuario buscarPorDni(@PathVariable String dni) {
        return usuarioService.buscarPorDni(dni);
    }

    // Dar de baja (no se borra: sus ventas quedan guardadas)
    @DeleteMapping("/{id}")
    public void eliminarUsuario(@PathVariable Long id) {
        usuarioService.eliminarUsuario(id);
    }

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody Usuario loginData) {
        return conSesion(usuarioService.login(
                loginData.getEmail(),
                loginData.getContrasena()));
    }

    // Cerrar sesión: queda anotado en la auditoría
    @PostMapping("/logout")
    public void logout() {
        usuarioService.cerrarSesion(ControlDeAcceso.usuarioActual());
    }

    // Actualizar rol
    @PutMapping("/{id}/rol")
    public Usuario actualizarRol(@PathVariable Long id, @RequestBody Usuario datos) {
        return usuarioService.cambiarRol(id, datos.getRol());
    }

    // Cambiar contraseña
    @PutMapping("/{id}/contrasena")
    public Map<String, String> cambiarContrasena(
            @PathVariable Long id,
            @RequestBody Map<String, String> datos) {

        ControlDeAcceso.exigirMismoUsuario(id);
        usuarioService.cambiarContrasena(
                id,
                datos.get("contrasenaActual"),
                datos.get("contrasenaNueva"));

        Map<String, String> respuesta = new HashMap<>();
        respuesta.put("mensaje", "Contraseña actualizada correctamente");

        return respuesta;
    }

    @PutMapping("/{id}/datos")
    public Usuario actualizarDatosPersonales(
            @PathVariable Long id,
            @RequestBody Usuario datos) {

        ControlDeAcceso.exigirMismoUsuario(id);
        return usuarioService.actualizarDatosPersonales(id, datos);
    }

}