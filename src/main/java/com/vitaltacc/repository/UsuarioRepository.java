package com.vitaltacc.repository;

import com.vitaltacc.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    boolean existsByEmail(String email);

    boolean existsByDni(String dni);

    // Para el login y para no repetir emails
    Optional<Usuario> findByEmail(String email);

    Optional<Usuario> findByDni(String dni);
}