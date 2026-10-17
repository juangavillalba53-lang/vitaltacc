package com.vitaltacc.service;

import com.vitaltacc.model.Lote;
import com.vitaltacc.model.Producto;
import com.vitaltacc.repository.DetalleVentaRepository;
import com.vitaltacc.repository.LoteRepository;
import com.vitaltacc.repository.ProductoRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class LoteService {

    // Umbrales de vencimiento (iguales en todo el sistema)
    public static final int DIAS_URGENTE = 15;
    public static final int DIAS_ATENCION = 30;

    @Autowired
    private LoteRepository loteRepository;

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private DetalleVentaRepository detalleVentaRepository;

    // =========================================================
    // UTILIDADES
    // =========================================================

    public static long diasRestantes(Lote lote) {
        return ChronoUnit.DAYS.between(LocalDate.now(), lote.getFechaVencimiento());
    }

    // VENCIDO (ya pasó la fecha), URGENTE (15 días o menos), ATENCION (hasta 30) u OK
    public static String nivelAlerta(long diasRestantes) {
        if (diasRestantes < 0) {
            return "VENCIDO";
        }
        if (diasRestantes <= DIAS_URGENTE) {
            return "URGENTE";
        }
        if (diasRestantes <= DIAS_ATENCION) {
            return "ATENCION";
        }
        return "OK";
    }

    private static boolean productoActivo(Lote lote) {
        Producto producto = lote.getProducto();
        return producto != null && !Boolean.FALSE.equals(producto.getActivo());
    }

    // =========================================================
    // ALTA
    // =========================================================

    @Transactional
    public Lote guardarLote(Lote lote) {

        if (lote.getCantidad() == null || lote.getCantidad() <= 0) {
            throw new RuntimeException("La cantidad debe ser mayor a 0");
        }

        if (lote.getFechaVencimiento() == null) {
            throw new RuntimeException("La fecha de vencimiento es obligatoria");
        }

        if (!lote.getFechaVencimiento().isAfter(LocalDate.now())) {
            throw new RuntimeException("La fecha de vencimiento debe ser futura");
        }

        if (lote.getProducto() == null || lote.getProducto().getId() == null) {
            throw new RuntimeException("Debe seleccionar un producto");
        }

        Producto producto = productoRepository.findById(lote.getProducto().getId())
                .orElseThrow(() -> new RuntimeException("Producto no encontrado"));

        if (Boolean.FALSE.equals(producto.getActivo())) {
            throw new RuntimeException("Ese producto fue dado de baja");
        }

        LocalDate hoy = LocalDate.now();

        lote.setProducto(producto);
        lote.setFechaProduccion(hoy);
        lote.setCantidadInicial(lote.getCantidad());
        lote.setFechaRetiro(null);
        lote.setNumeroLote(siguienteNumeroLote(hoy));

        return loteRepository.save(lote);
    }

    // Formato AAAAMMDD-NN. Usa el número más alto del día + 1, así nunca se
    // repite aunque se haya borrado algún lote de ese día.
    private String siguienteNumeroLote(LocalDate dia) {

        String prefijo = dia.toString().replace("-", "") + "-";

        int mayor = loteRepository.findByFechaProduccion(dia)
                .stream()
                .map(Lote::getNumeroLote)
                .filter(n -> n != null && n.startsWith(prefijo))
                .mapToInt(n -> {
                    try {
                        return Integer.parseInt(n.substring(prefijo.length()));
                    } catch (NumberFormatException e) {
                        return 0;
                    }
                })
                .max()
                .orElse(0);

        return prefijo + String.format("%02d", mayor + 1);
    }

    // =========================================================
    // CONSULTAS
    // =========================================================

    // Todos los lotes de productos activos
    public List<Lote> obtenerLotes() {
        return loteRepository.findAll()
                .stream()
                .filter(LoteService::productoActivo)
                .toList();
    }

    // Lotes con stock de un producto (incluye los vencidos, para poder retirarlos)
    public List<Lote> obtenerPorProducto(Long productoId) {
        return loteRepository.findByProductoIdAndCantidadGreaterThan(productoId, 0);
    }

    // Lotes que vencen desde hoy y dentro de los próximos 2 meses
    public List<Lote> obtenerLotesPorVencer() {

        LocalDate hoy = LocalDate.now();
        LocalDate limite = hoy.plusMonths(2);

        return loteRepository.findAll().stream()
                .filter(LoteService::productoActivo)
                .filter(lote -> lote.getFechaVencimiento() != null
                        && !lote.getFechaVencimiento().isBefore(hoy)
                        && lote.getFechaVencimiento().isBefore(limite)
                        && lote.getCantidad() > 0)
                .toList();
    }

    // Lotes vencidos que todavía tienen unidades: hay que retirarlos del local
    public List<Lote> obtenerLotesVencidos() {

        LocalDate hoy = LocalDate.now();

        return loteRepository.findAll().stream()
                .filter(LoteService::productoActivo)
                .filter(lote -> lote.getFechaVencimiento() != null
                        && lote.getFechaVencimiento().isBefore(hoy)
                        && lote.getCantidad() > 0)
                .toList();
    }

    // =========================================================
    // ACCIONES
    // =========================================================

    // Saca del stock un lote vencido (queda guardado con la fecha de retiro)
    @Transactional
    public Lote retirarLote(Long id) {

        Lote lote = loteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Lote no encontrado"));

        if (!lote.getFechaVencimiento().isBefore(LocalDate.now())) {
            throw new RuntimeException("Solo se pueden retirar lotes vencidos");
        }

        if (lote.getCantidad() <= 0) {
            throw new RuntimeException("Ese lote ya no tiene unidades");
        }

        lote.setCantidad(0);
        lote.setFechaRetiro(LocalDate.now());

        return loteRepository.save(lote);
    }

    @Transactional
    public void eliminarLote(Long id) {

        Lote lote = loteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Lote no encontrado"));

        if (detalleVentaRepository.existsByLoteId(id)) {
            throw new RuntimeException(
                    "No se puede eliminar un lote que ya se usó en una venta.");
        }

        loteRepository.delete(lote);
    }
}
