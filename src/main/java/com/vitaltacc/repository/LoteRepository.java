package com.vitaltacc.repository;

import com.vitaltacc.model.Lote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface LoteRepository extends JpaRepository<Lote, Long> {

    // 🔹 Lotes por producto
    List<Lote> findByProductoId(Long productoId);

    // 🔹 Lotes ordenados por vencimiento (FIFO)
    List<Lote> findByProductoIdOrderByFechaVencimientoAsc(Long productoId);

    // 🔥 NUEVO: contar lotes por día (para generar número de lote)
    int countByFechaProduccion(LocalDate fechaProduccion);
}