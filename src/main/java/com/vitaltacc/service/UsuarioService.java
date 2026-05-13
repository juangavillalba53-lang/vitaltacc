package com.vitaltacc.service;

import com.vitaltacc.model.Usuario;
import com.vitaltacc.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UsuarioService {

    @Autowired
    private UsuarioRepository usuarioRepository;

    // Guardar usuario
    public Usuario guardarUsuario(Usuario usuario) {

        // 🔥 validar email SOLO si existe
        if (usuario.getEmail() != null &&
                !usuario.getEmail().isBlank()) {

            // 🔥 buscar si el email ya pertenece a otro usuario
            Usuario usuarioEmail = usuarioRepository.findByEmail(usuario.getEmail())
                    .orElse(null);

            if (usuarioEmail != null &&
                    !usuarioEmail.getDni().equals(usuario.getDni())) {

                throw new RuntimeException("El email ya está registrado");
            }
        }

        // 🔥 buscar por DNI
        Usuario existente = usuarioRepository.findByDni(usuario.getDni())
                .orElse(null);

        // 🔥 si ya existe → completar cuenta
        if (existente != null) {

            // completar email
            if (usuario.getEmail() != null &&
                    !usuario.getEmail().isBlank()) {

                existente.setEmail(usuario.getEmail());
            }

            // completar contraseña
            if (usuario.getContrasena() != null &&
                    !usuario.getContrasena().isBlank()) {

                existente.setContrasena(usuario.getContrasena());
            }

            // actualizar nombre
            if (usuario.getNombre() != null &&
                    !usuario.getNombre().isBlank()) {

                existente.setNombre(usuario.getNombre());
            }

            return usuarioRepository.save(existente);
        }

        // 🔥 usuario nuevo
        return usuarioRepository.save(usuario);
    }

    // Listar todos
    public List<Usuario> obtenerUsuarios() {
        return usuarioRepository.findAll();
    }

    // Buscar por ID
    public Usuario obtenerPorId(Long id) {
        return usuarioRepository.findById(id).orElse(null);
    }

    public Usuario buscarPorDni(String dni) {
        return usuarioRepository.findByDni(dni).orElse(null);
    }

    // Eliminar
    public void eliminarUsuario(Long id) {
        usuarioRepository.deleteById(id);
    }

    public Usuario login(String email, String contrasena) {

        Usuario usuario = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        if (!usuario.getContrasena().equals(contrasena)) {
            throw new RuntimeException("Contraseña incorrecta");
        }

        return usuario;
    }
}
