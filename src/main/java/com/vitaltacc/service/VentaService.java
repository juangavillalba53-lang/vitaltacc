package com.vitaltacc.service;

import com.vitaltacc.model.DetalleVenta;
import com.vitaltacc.model.Lote;
import com.vitaltacc.model.Venta;
import com.vitaltacc.repository.LoteRepository;
import com.vitaltacc.repository.VentaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;

@Service
public class VentaService {

    @Autowired
    private VentaRepository ventaRepository;

    @Autowired
    private LoteRepository loteRepository;

    public Venta crearVenta(Venta venta) {

        double total = 0;

        venta.setFecha(LocalDate.now());

        if (venta.getDetalles() != null) {

            for (DetalleVenta detalle : venta.getDetalles()) {

                if (detalle.getProducto() == null)
                    continue;

                int cantidadADescontar = detalle.getCantidad();

                // 🔥 OBTENER LOTES ORDENADOS (FIFO)
                List<Lote> lotes = loteRepository
                        .findByProductoIdOrderByFechaVencimientoAsc(detalle.getProducto().getId());

                // 🔥 CALCULAR STOCK TOTAL DISPONIBLE
                int stockTotal = lotes.stream()
                        .mapToInt(Lote::getCantidad)
                        .sum();

                // 🔥 VALIDAR STOCK ANTES DE DESCONTAR
                if (stockTotal < cantidadADescontar) {
                    throw new RuntimeException("No hay stock suficiente para el producto: "
                            + detalle.getProducto().getNombre());
                }

                // 🔥 DESCONTAR FIFO
                for (Lote lote : lotes) {

                    if (cantidadADescontar <= 0)
                        break;

                    int stockLote = lote.getCantidad();

                    if (stockLote <= 0)
                        continue;

                    if (stockLote <= cantidadADescontar) {
                        cantidadADescontar -= stockLote;
                        lote.setCantidad(0);
                    } else {
                        lote.setCantidad(stockLote - cantidadADescontar);
                        cantidadADescontar = 0;
                    }

                    loteRepository.save(lote);
                }

                total += detalle.getPrecioUnitario() * detalle.getCantidad();
            }
        }

        venta.setTotal(total);

        return ventaRepository.save(venta);
    }

    public List<Venta> obtenerVentas() {
        return ventaRepository.findAll();
    }

    public Double obtenerTotalFacturado() {

        return ventaRepository.findAll().stream()
                .mapToDouble(v -> v.getTotal() != null ? v.getTotal() : 0)
                .sum();
    }

    public List<Map<String, Object>> obtenerProductosMasVendidosPorMes(int mes, int anio) {

        Map<String, Integer> conteo = new HashMap<>();

        List<Venta> ventas = ventaRepository.findAll();

        for (Venta venta : ventas) {

            if (venta.getFecha() == null)
                continue;

            if (venta.getFecha().getMonthValue() == mes &&
                    venta.getFecha().getYear() == anio) {

                if (venta.getDetalles() != null) {
                    for (DetalleVenta detalle : venta.getDetalles()) {

                        if (detalle.getProducto() == null)
                            continue;

                        String nombre = detalle.getProducto().getNombre();
                        int cantidad = detalle.getCantidad();

                        conteo.put(nombre,
                                conteo.getOrDefault(nombre, 0) + cantidad);
                    }
                }
            }
        }

        return ordenarResultados(conteo);
    }

    public Double obtenerTotalPorMes(int mes, int anio) {

        return ventaRepository.findAll().stream()
                .filter(v -> v.getFecha() != null &&
                        v.getFecha().getMonthValue() == mes &&
                        v.getFecha().getYear() == anio)
                .mapToDouble(v -> v.getTotal() != null ? v.getTotal() : 0)
                .sum();
    }

    public List<Map<String, Object>> obtenerTotalPorAnio(int anio) {

        Map<Integer, Double> totalesPorMes = new HashMap<>();

        for (int i = 1; i <= 12; i++) {
            totalesPorMes.put(i, 0.0);
        }

        List<Venta> ventas = ventaRepository.findAll();

        for (Venta venta : ventas) {

            if (venta.getFecha() == null)
                continue;

            if (venta.getFecha().getYear() == anio) {

                int mes = venta.getFecha().getMonthValue();

                totalesPorMes.put(mes,
                        totalesPorMes.get(mes) + (venta.getTotal() != null ? venta.getTotal() : 0));
            }
        }

        return totalesPorMes.entrySet().stream()
                .map(entry -> {
                    Map<String, Object> data = new HashMap<>();
                    data.put("mes", entry.getKey());
                    data.put("total", entry.getValue());
                    return data;
                })
                .sorted((a, b) -> ((Integer) a.get("mes"))
                        .compareTo((Integer) b.get("mes")))
                .toList();
    }

    public List<Map<String, Object>> obtenerTopClientesPorMes(int mes, int anio) {

        Map<String, Double> gastoPorCliente = new HashMap<>();

        List<Venta> ventas = ventaRepository.findAll();

        for (Venta venta : ventas) {

            if (venta.getFecha() == null || venta.getCliente() == null)
                continue;

            if (venta.getFecha().getMonthValue() == mes &&
                    venta.getFecha().getYear() == anio) {

                String nombre = venta.getCliente().getNombre();
                double total = venta.getTotal() != null ? venta.getTotal() : 0;

                gastoPorCliente.put(nombre,
                        gastoPorCliente.getOrDefault(nombre, 0.0) + total);
            }
        }

        return gastoPorCliente.entrySet().stream()
                .map(entry -> {
                    Map<String, Object> data = new HashMap<>();
                    data.put("cliente", entry.getKey());
                    data.put("totalGastado", entry.getValue());
                    return data;
                })
                .sorted((a, b) -> ((Double) b.get("totalGastado"))
                        .compareTo((Double) a.get("totalGastado")))
                .toList();
    }

    public List<Map<String, Object>> obtenerProductosMasVendidos() {

        Map<String, Integer> conteo = new HashMap<>();

        List<Venta> ventas = ventaRepository.findAll();

        for (Venta venta : ventas) {

            if (venta.getDetalles() != null) {

                for (DetalleVenta detalle : venta.getDetalles()) {

                    if (detalle.getProducto() == null)
                        continue;

                    String nombre = detalle.getProducto().getNombre();
                    int cantidad = detalle.getCantidad();

                    conteo.put(nombre,
                            conteo.getOrDefault(nombre, 0) + cantidad);
                }
            }
        }

        return ordenarResultados(conteo);
    }

    private List<Map<String, Object>> ordenarResultados(Map<String, Integer> conteo) {

        return conteo.entrySet().stream()
                .map(entry -> {
                    Map<String, Object> data = new HashMap<>();
                    data.put("producto", entry.getKey());
                    data.put("cantidadVendida", entry.getValue());
                    return data;
                })
                .sorted((a, b) -> ((Integer) b.get("cantidadVendida"))
                        .compareTo((Integer) a.get("cantidadVendida")))
                .toList();
    }
}