package com.vitaltacc.service;

import com.vitaltacc.model.DetalleVenta;
import com.vitaltacc.model.Lote;
import com.vitaltacc.model.Venta;
import com.vitaltacc.repository.LoteRepository;
import com.vitaltacc.repository.VentaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.vitaltacc.dto.VentaRequest;
import com.vitaltacc.model.Producto;
import com.vitaltacc.model.Usuario;
import com.vitaltacc.model.Rol;
import com.vitaltacc.repository.ProductoRepository;
import com.vitaltacc.repository.UsuarioRepository;
import com.vitaltacc.dto.VentaItemRequest;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;

@Service
public class VentaService {

    @Autowired
    private VentaRepository ventaRepository;

    @Autowired
    private LoteRepository loteRepository;

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Transactional
    public Venta crearVenta(VentaRequest ventaRequest) {

        Venta venta = new Venta();

        venta.setFecha(LocalDate.now());
        venta.setMetodoPago(ventaRequest.getMetodoPago());
        venta.setTipoVenta(ventaRequest.getTipoVenta());
        venta.setTotal(0.0);

        if (ventaRequest.getDetalles() == null || ventaRequest.getDetalles().isEmpty()) {
            throw new RuntimeException("La venta no contiene productos.");
        }

        Usuario empleado = usuarioRepository.findById(ventaRequest.getEmpleadoId())
                .orElseThrow(() -> new RuntimeException("Empleado no encontrado"));

        venta.setEmpleado(empleado);

        if (ventaRequest.getClienteId() != null) {

            Usuario cliente = usuarioRepository.findById(ventaRequest.getClienteId())
                    .orElseThrow(() -> new RuntimeException("Cliente no encontrado"));

            venta.setCliente(cliente);

        } else if (ventaRequest.getDniCliente() != null &&
                !ventaRequest.getDniCliente().isBlank()) {

            Usuario cliente = usuarioRepository
                    .findByDni(ventaRequest.getDniCliente())
                    .orElse(null);

            if (cliente == null) {

                cliente = new Usuario();

                cliente.setNombre(
                        ventaRequest.getNombreCliente() != null
                                ? ventaRequest.getNombreCliente()
                                : "Consumidor");

                cliente.setApellido(
                        ventaRequest.getApellidoCliente() != null
                                ? ventaRequest.getApellidoCliente()
                                : "Final");

                cliente.setDni(ventaRequest.getDniCliente());

                cliente.setEmail(
                        "cliente_" + ventaRequest.getDniCliente() + "@local.com");

                cliente.setContrasena("TEMP");

                cliente.setRol(Rol.CLIENTE);

                cliente = usuarioRepository.save(cliente);
            }

            venta.setCliente(cliente);
        }

        double totalVenta = 0.0;

        for (VentaItemRequest item : ventaRequest.getDetalles()) {

            if (item.getCantidad() == null || item.getCantidad() <= 0) {
                throw new RuntimeException("Cantidad inválida.");
            }

            Producto producto = productoRepository.findById(item.getProductoId())
                    .orElseThrow(() -> new RuntimeException("Producto no encontrado"));

            List<Lote> lotes = loteRepository
                    .findByProductoIdOrderByFechaVencimientoAsc(producto.getId());

            lotes.removeIf(l -> l.getCantidad() <= 0);

            int stockDisponible = lotes.stream()
                    .mapToInt(Lote::getCantidad)
                    .sum();

            if (stockDisponible < item.getCantidad()) {

                throw new RuntimeException(
                        "Stock insuficiente para " + producto.getNombre());
            }

            int cantidadPendiente = item.getCantidad();

            for (Lote lote : lotes) {

                if (cantidadPendiente == 0)
                    break;

                int cantidadTomada = Math.min(
                        cantidadPendiente,
                        lote.getCantidad());

                DetalleVenta detalle = new DetalleVenta();

                detalle.setVenta(venta);
                detalle.setProducto(producto);
                detalle.setLote(lote);
                detalle.setCantidad(cantidadTomada);
                detalle.setPrecioUnitario(producto.getPrecio());

                venta.getDetalles().add(detalle);

                lote.setCantidad(lote.getCantidad() - cantidadTomada);

                totalVenta += cantidadTomada * producto.getPrecio();

                cantidadPendiente -= cantidadTomada;
            }
        }

        venta.setTotal(totalVenta);

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

    public Map<String, Object> obtenerCierreCajaHoy() {

        return obtenerReportePorDia(LocalDate.now());

    }

    public Map<String, Object> obtenerReportePorDia(LocalDate fecha) {

        List<Venta> ventas = ventaRepository.findAll();

        double efectivo = 0;
        double transferencia = 0;
        double tarjeta = 0;

        int cantidadVentas = 0;

        for (Venta venta : ventas) {

            if (!venta.getFecha().equals(fecha))
                continue;

            cantidadVentas++;

            double total = venta.getTotal();

            switch (venta.getMetodoPago()) {

                case EFECTIVO:
                    efectivo += total;
                    break;

                case TRANSFERENCIA:
                case MERCADO_PAGO:
                case MODO:
                    transferencia += total;
                    break;

                case TARJETA_DEBITO:
                case TARJETA_CREDITO:
                    tarjeta += total;
                    break;
            }
        }

        Map<String, Object> data = new HashMap<>();

        data.put("ventas", cantidadVentas);
        data.put("efectivo", efectivo);
        data.put("transferencia", transferencia);
        data.put("tarjeta", tarjeta);
        data.put("total", efectivo + transferencia + tarjeta);

        return data;
    }

    public int obtenerCantidadVentasPorMes(int mes, int anio) {

        return (int) ventaRepository.findAll().stream()
                .filter(v -> v.getFecha() != null
                        && v.getFecha().getMonthValue() == mes
                        && v.getFecha().getYear() == anio)
                .count();
    }

    public int obtenerCantidadVentasPorAnio(int anio) {

        return (int) ventaRepository.findAll().stream()
                .filter(v -> v.getFecha() != null
                        && v.getFecha().getYear() == anio)
                .count();
    }

    public List<Map<String, Object>> obtenerProductosMasVendidosPorDia(LocalDate fecha) {

        Map<String, Integer> conteo = new HashMap<>();

        for (Venta venta : ventaRepository.findAll()) {

            if (!venta.getFecha().equals(fecha))
                continue;

            for (DetalleVenta detalle : venta.getDetalles()) {

                String nombre = detalle.getProducto().getNombre();

                conteo.put(
                        nombre,
                        conteo.getOrDefault(nombre, 0)
                                + detalle.getCantidad());
            }
        }

        return ordenarResultados(conteo);
    }

    public List<Map<String, Object>> obtenerProductosMasVendidosPorAnio(int anio) {

        Map<String, Integer> conteo = new HashMap<>();

        for (Venta venta : ventaRepository.findAll()) {

            if (venta.getFecha().getYear() != anio)
                continue;

            for (DetalleVenta detalle : venta.getDetalles()) {

                String nombre = detalle.getProducto().getNombre();

                conteo.put(
                        nombre,
                        conteo.getOrDefault(nombre, 0)
                                + detalle.getCantidad());
            }
        }

        return ordenarResultados(conteo);
    }

    public List<Map<String, Object>> obtenerTopClientesPorDia(LocalDate fecha) {

        Map<String, Double> clientes = new HashMap<>();

        for (Venta venta : ventaRepository.findAll()) {

            if (!venta.getFecha().equals(fecha))
                continue;

            if (venta.getCliente() == null)
                continue;

            String nombre = venta.getCliente().getNombre();

            clientes.put(
                    nombre,
                    clientes.getOrDefault(nombre, 0.0)
                            + venta.getTotal());
        }

        return clientes.entrySet()
                .stream()
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

    public List<Map<String, Object>> obtenerTopClientesPorAnio(int anio) {

        Map<String, Double> clientes = new HashMap<>();

        for (Venta venta : ventaRepository.findAll()) {

            if (venta.getFecha().getYear() != anio)
                continue;

            if (venta.getCliente() == null)
                continue;

            String nombre = venta.getCliente().getNombre();

            clientes.put(
                    nombre,
                    clientes.getOrDefault(nombre, 0.0)
                            + venta.getTotal());
        }

        return clientes.entrySet()
                .stream()
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