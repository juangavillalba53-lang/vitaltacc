package com.vitaltacc.config;

import com.vitaltacc.model.Usuario;
import com.vitaltacc.repository.UsuarioRepository;
import com.vitaltacc.service.UsuarioService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Al arrancar, encripta las contraseñas que todavía estaban guardadas tal cual
 * (las de antes de este cambio). Cada usuario sigue entrando con la misma
 * contraseña de siempre. Las que ya están encriptadas no se tocan.
 */
@Component
public class MigracionContrasenas implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(MigracionContrasenas.class);

    private final UsuarioRepository usuarioRepository;

    public MigracionContrasenas(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    @Override
    public void run(ApplicationArguments args) {

        List<Usuario> pendientes = usuarioRepository.findAll().stream()
                .filter(u -> u.getContrasena() != null && !u.getContrasena().isBlank())
                .filter(u -> !Contrasenas.estaEncriptada(u.getContrasena()))
                // Las cuentas creadas en el local tienen una marca, no una contraseña
                .filter(u -> !UsuarioService.CONTRASENA_PENDIENTE.equals(u.getContrasena()))
                .toList();

        if (pendientes.isEmpty()) {
            return;
        }

        pendientes.forEach(u -> u.setContrasena(Contrasenas.encriptar(u.getContrasena())));
        usuarioRepository.saveAll(pendientes);

        log.info("Se encriptaron {} contraseñas guardadas sin encriptar.", pendientes.size());
    }
}
