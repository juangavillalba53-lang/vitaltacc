package com.vitaltacc.repository;

import com.vitaltacc.model.DetalleVenta;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DetalleVentaRepository extends JpaRepository<DetalleVenta, Long> {

    boolean existsByLoteId(Long loteId);

}