package com.vitaltacc.repository;

import com.vitaltacc.model.Lote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface LoteRepository extends JpaRepository<Lote, Long> {

    // 🔥 Buscar todos los lotes de un producto
    List<Lote> findByProductoId(Long productoId);

    // 🔥 Lotes activos (con stock)
    List<Lote> findByProductoIdAndCantidadGreaterThan(Long productoId, Integer cantidad);

    // 🔥 Lotes ordenados por fecha de vencimiento (FEFO)
    List<Lote> findByProductoIdOrderByFechaVencimientoAsc(Long productoId);

    // 🔥 Cantidad de lotes creados en una fecha (para generar el número de lote)
    int countByFechaProduccion(LocalDate fechaProduccion);
}