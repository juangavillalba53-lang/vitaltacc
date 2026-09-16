package com.vitaltacc.repository;

import com.vitaltacc.model.Devolucion;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DevolucionRepository
        extends JpaRepository<Devolucion, Long> {
}