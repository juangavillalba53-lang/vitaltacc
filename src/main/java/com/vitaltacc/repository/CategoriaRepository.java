package com.vitaltacc.repository;

import com.vitaltacc.model.Categoria;
import com.vitaltacc.model.TipoCategoria;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CategoriaRepository extends JpaRepository<Categoria, Long> {

    Optional<Categoria> findByNombre(String nombre);

    List<Categoria> findByTipoCategoria(TipoCategoria tipoCategoria);

}