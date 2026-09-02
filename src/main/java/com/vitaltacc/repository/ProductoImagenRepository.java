package com.vitaltacc.repository;

import com.vitaltacc.model.ProductoImagen;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProductoImagenRepository
                extends JpaRepository<ProductoImagen, Long> {

        List<ProductoImagen> findByProductoId(Long productoId);

}