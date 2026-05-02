package com.vitaltacc.service;

import com.vitaltacc.model.DetalleVenta;
import com.vitaltacc.model.Lote;
import com.vitaltacc.model.Venta;
import com.vitaltacc.repository.LoteRepository;
import com.vitaltacc.repository.VentaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.Map;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;

@Service
public class VentaService {

    @Autowired
    private VentaRepository ventaRepository;

    @Autowired
    private LoteRepository loteRepository;

    public Venta crearVenta(Venta venta) {

        double total = 0;

        // Fecha automática
        venta.setFecha(LocalDate.now());

        for (DetalleVenta detalle : venta.getDetalles()) {

            int cantidadADescontar = detalle.getCantidad();

            // 🔥 FIFO → primero los que vencen antes
            List<Lote> lotes = loteRepository
                    .findByProductoIdOrderByFechaVencimientoAsc(detalle.getProducto().getId());

            for (Lote lote : lotes) {

                if (cantidadADescontar <= 0)
                    break;

                int stockLote = lote.getCantidad();

                if (stockLote <= cantidadADescontar) {
                    cantidadADescontar -= stockLote;
                    lote.setCantidad(0);
                } else {
                    lote.setCantidad(stockLote - cantidadADescontar);
                    cantidadADescontar = 0;
                }

                loteRepository.save(lote);
            }

            // calcular total
            total += detalle.getPrecioUnitario() * detalle.getCantidad();
        }

        venta.setTotal(total);

        return ventaRepository.save(venta);
    }

    // 🔥 NUEVO: obtener todas las ventas
    public List<Venta> obtenerVentas() {
        return ventaRepository.findAll();
    }

    // 🔥 NUEVO: total facturado
    public Double obtenerTotalFacturado() {

        return ventaRepository.findAll().stream()
                .mapToDouble(Venta::getTotal)
                .sum();
    }

    // 🔥 NUEVO: productos más vendidos por mes
    public List<Map<String, Object>> obtenerProductosMasVendidosPorMes(int mes, int anio) {

        Map<String, Integer> conteo = new HashMap<>();

        List<Venta> ventas = ventaRepository.findAll();

        for (Venta venta : ventas) {

            // 🔥 FILTRO POR MES Y AÑO
            if (venta.getFecha().getMonthValue() == mes &&
                    venta.getFecha().getYear() == anio) {

                for (DetalleVenta detalle : venta.getDetalles()) {

                    String nombreProducto = detalle.getProducto().getNombre();
                    int cantidad = detalle.getCantidad();

                    conteo.put(nombreProducto,
                            conteo.getOrDefault(nombreProducto, 0) + cantidad);
                }
            }
        }

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

    // 🔥 NUEVO: total facturado por mes
    public Double obtenerTotalPorMes(int mes, int anio) {

        return ventaRepository.findAll().stream()
                .filter(venta -> venta.getFecha().getMonthValue() == mes &&
                        venta.getFecha().getYear() == anio)
                .mapToDouble(Venta::getTotal)
                .sum();
    }

    // 🔥 NUEVO: total por año (mes a mes)
    public List<Map<String, Object>> obtenerTotalPorAnio(int anio) {

        Map<Integer, Double> totalesPorMes = new HashMap<>();

        // inicializar meses en 0
        for (int i = 1; i <= 12; i++) {
            totalesPorMes.put(i, 0.0);
        }

        List<Venta> ventas = ventaRepository.findAll();

        for (Venta venta : ventas) {

            if (venta.getFecha().getYear() == anio) {

                int mes = venta.getFecha().getMonthValue();

                totalesPorMes.put(mes,
                        totalesPorMes.get(mes) + venta.getTotal());
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

    // 🔥 NUEVO: top clientes por dinero
    public List<Map<String, Object>> obtenerTopClientes() {

        Map<String, Double> gastoPorCliente = new HashMap<>();

        List<Venta> ventas = ventaRepository.findAll();

        for (Venta venta : ventas) {

            if (venta.getCliente() != null) {

                String nombre = venta.getCliente().getNombre();
                double total = venta.getTotal();

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
}