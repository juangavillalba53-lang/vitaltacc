package com.vitaltacc.repository;

import com.vitaltacc.model.ProductoImagen;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductoImagenRepository
        extends JpaRepository<ProductoImagen, Long> {
}