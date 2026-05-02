package com.vitaltacc.repository;

import com.vitaltacc.model.Lote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LoteRepository extends JpaRepository<Lote, Long> {

    // Lotes por producto
    List<Lote> findByProductoId(Long productoId);

    // 🔥 Lotes ordenados por fecha de vencimiento (importante para ventas)
    List<Lote> findByProductoIdOrderByFechaVencimientoAsc(Long productoId);

}