package com.vitaltacc.service;

import com.vitaltacc.model.Lote;
import com.vitaltacc.repository.LoteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class LoteService {

    @Autowired
    private LoteRepository loteRepository;

    // Guardar lote
    public Lote guardarLote(Lote lote) {
        return loteRepository.save(lote);
    }

    // Listar todos los lotes
    public List<Lote> obtenerLotes() {
        return loteRepository.findAll();
    }

    // Obtener lotes por producto
    public List<Lote> obtenerPorProducto(Long productoId) {
        return loteRepository.findByProductoId(productoId);
    }

    // Eliminar lote
    public void eliminarLote(Long id) {
        loteRepository.deleteById(id);
    }

    // 🔥 NUEVO: Lotes por vencer (2 meses)
    public List<Lote> obtenerLotesPorVencer() {

        LocalDate hoy = LocalDate.now();
        LocalDate limite = hoy.plusMonths(2);

        return loteRepository.findAll().stream()
                .filter(lote -> lote.getFechaVencimiento() != null &&
                        lote.getFechaVencimiento().isAfter(hoy) &&
                        lote.getFechaVencimiento().isBefore(limite))
                .collect(Collectors.toList());
    }
}