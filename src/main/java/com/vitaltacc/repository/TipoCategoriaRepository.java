package com.vitaltacc.repository;

import com.vitaltacc.model.TipoCategoria;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TipoCategoriaRepository extends JpaRepository<TipoCategoria, Long> {

    Optional<TipoCategoria> findByNombre(String nombre);

}