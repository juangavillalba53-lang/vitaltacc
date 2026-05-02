package com.vitaltacc.service;

import com.vitaltacc.model.Promocion;
import com.vitaltacc.repository.PromocionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class PromocionService {

    @Autowired
    private PromocionRepository promocionRepository;

    // Guardar promoción
    public Promocion guardarPromocion(Promocion promocion) {
        return promocionRepository.save(promocion);
    }

    // Listar todas
    public List<Promocion> obtenerPromociones() {
        return promocionRepository.findAll();
    }

    // Promociones activas hoy
    public List<Promocion> obtenerPromocionesActivas() {
        LocalDate hoy = LocalDate.now();
        return promocionRepository
                .findByFechaInicioLessThanEqualAndFechaFinGreaterThanEqual(hoy, hoy);
    }
}
