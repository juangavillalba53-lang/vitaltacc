package com.vitaltacc.repository;

import com.vitaltacc.model.Promocion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface PromocionRepository extends JpaRepository<Promocion, Long> {

    // Promociones activas en una fecha
    List<Promocion> findByFechaInicioLessThanEqualAndFechaFinGreaterThanEqual(LocalDate fecha1, LocalDate fecha2);

}
