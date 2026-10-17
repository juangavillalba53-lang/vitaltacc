package com.vitaltacc.controller;

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

    // Crear usuario
    @PostMapping
    public Usuario crearUsuario(@RequestBody Usuario usuario) {
        return usuarioService.guardarUsuario(usuario);
    }

    // Listar usuarios
    @GetMapping
    public List<Usuario> listarUsuarios() {
        return usuarioService.obtenerUsuarios();
    }

    // Buscar por ID
    @GetMapping("/{id}")
    public Usuario obtenerUsuario(@PathVariable Long id) {
        return usuarioService.obtenerPorId(id);
    }

    // 🔥 Buscar por DNI
    @GetMapping("/dni/{dni}")
    public Usuario buscarPorDni(@PathVariable String dni) {
        return usuarioService.buscarPorDni(dni);
    }

    // Eliminar
    @DeleteMapping("/{id}")
    public void eliminarUsuario(@PathVariable Long id) {
        usuarioService.eliminarUsuario(id);
    }

    @PostMapping("/login")
    public Usuario login(@RequestBody Usuario loginData) {
        return usuarioService.login(
                loginData.getEmail(),
                loginData.getContrasena());
    }

    // 🔥 ACTUALIZAR ROL
    @PutMapping("/{id}/rol")
    public Usuario actualizarRol(@PathVariable Long id, @RequestBody Usuario datos) {

        Usuario usuario = usuarioService.obtenerPorId(id);

        usuario.setRol(datos.getRol());

        return usuarioService.guardarUsuario(usuario);
    }

    // Cambiar contraseña
    @PutMapping("/{id}/contrasena")
    public Map<String, String> cambiarContrasena(
            @PathVariable Long id,
            @RequestBody Map<String, String> datos) {

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

        return usuarioService.actualizarDatosPersonales(id, datos);
    }

}