package com.vitaltacc.service;

import com.vitaltacc.model.Lote;
import com.vitaltacc.repository.LoteRepository;
import com.vitaltacc.repository.ProductoRepository;

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
    @Autowired
    private ProductoRepository productoRepository;

    public Lote guardarLote(Lote lote) {

        // 🔥 VALIDACIONES
        if (lote.getCantidad() == null || lote.getCantidad() <= 0) {
            throw new RuntimeException("La cantidad debe ser mayor a 0");
        }

        if (lote.getFechaVencimiento() == null) {
            throw new RuntimeException("La fecha de vencimiento es obligatoria");
        }

        if (!lote.getFechaVencimiento().isAfter(LocalDate.now())) {
            throw new RuntimeException("La fecha de vencimiento debe ser futura");
        }

        LocalDate hoy = LocalDate.now();

        // 🔥 asignar fecha producción
        lote.setFechaProduccion(hoy);

        // 🔥 asegurar producto correcto
        Long productoId = lote.getProducto().getId();

        lote.setProducto(
                productoRepository.findById(productoId)
                        .orElseThrow(() -> new RuntimeException("Producto no encontrado")));

        // 🔥 generar número de lote
        int cantidadHoy = loteRepository.countByFechaProduccion(hoy);
        int numero = cantidadHoy + 1;

        String codigo = hoy.toString().replace("-", "") + "-" + String.format("%02d", numero);

        lote.setNumeroLote(codigo);

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
                        lote.getFechaVencimiento().isBefore(limite) &&
                        lote.getCantidad() > 0)
                .collect(Collectors.toList());
    }

}