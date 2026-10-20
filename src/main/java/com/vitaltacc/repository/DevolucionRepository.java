package com.vitaltacc.repository;

import com.vitaltacc.model.Devolucion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface DevolucionRepository extends JpaRepository<Devolucion, Long> {

    List<Devolucion> findByVentaIdOrderByIdAsc(Long ventaId);

    List<Devolucion> findAllByOrderByIdDesc();

    List<Devolucion> findByFechaBetween(LocalDate desde, LocalDate hasta);
}
