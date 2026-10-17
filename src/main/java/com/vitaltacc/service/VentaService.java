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
import com.vitaltacc.dto.VentaHistorialDTO;
import com.vitaltacc.dto.VentaItemRequest;
import org.springframework.transaction.annotation.Transactional;
import com.vitaltacc.service.ProductoService;

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

    @Autowired
    private ProductoService productoService;

    @Autowired
    private UsuarioService usuarioService;

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

        if (ventaRequest.getTipoVenta() == null) {
            throw new RuntimeException("El tipo de venta es obligatorio.");
        }

        if (ventaRequest.getMetodoPago() == null) {
            throw new RuntimeException("El método de pago es obligatorio.");
        }

        if (ventaRequest.getTipoVenta() == com.vitaltacc.model.TipoVenta.LOCAL) {

            if (ventaRequest.getEmpleadoId() == null) {
                throw new RuntimeException(
                        "Debe indicar el empleado que registra la venta.");
            }

            Usuario empleado = usuarioRepository.findById(ventaRequest.getEmpleadoId())
                    .orElseThrow(() -> new RuntimeException("Empleado no encontrado"));

            if (empleado.getRol() != Rol.ADMIN &&
                    empleado.getRol() != Rol.EMPLEADO) {
                throw new RuntimeException(
                        "Usuario sin permisos para registrar ventas.");
            }

            venta.setEmpleado(empleado);

        } else if (ventaRequest.getTipoVenta() == com.vitaltacc.model.TipoVenta.ONLINE) {

            if (ventaRequest.getClienteId() == null) {
                throw new RuntimeException(
                        "Debe indicar el cliente que realiza la compra online.");
            }

            Usuario cliente = usuarioRepository.findById(ventaRequest.getClienteId())
                    .orElseThrow(() -> new RuntimeException("Cliente no encontrado"));

            if (cliente.getRol() != Rol.CLIENTE) {
                throw new RuntimeException(
                        "Solo los clientes pueden realizar compras online.");
            }

            venta.setCliente(cliente);
            venta.setEmpleado(null);
        }

        if (ventaRequest.getTipoVenta() == com.vitaltacc.model.TipoVenta.LOCAL) {

            if (ventaRequest.getClienteId() != null) {

                Usuario cliente = usuarioRepository.findById(ventaRequest.getClienteId())
                        .orElseThrow(() -> new RuntimeException("Cliente no encontrado"));

                if (cliente.getRol() != Rol.CLIENTE) {
                    throw new RuntimeException("El usuario indicado no es un cliente.");
                }

                venta.setCliente(cliente);

            } else if (ventaRequest.getDniCliente() != null
                    && !ventaRequest.getDniCliente().isBlank()) {

                // Cliente identificado por DNI: si no existe se crea como cuenta
                // pendiente, que se activa cuando se registra en la web
                Usuario cliente = usuarioService.obtenerOCrearClientePorDni(
                        ventaRequest.getDniCliente(),
                        ventaRequest.getNombreCliente(),
                        ventaRequest.getApellidoCliente(),
                        ventaRequest.getTelefonoCliente());

                venta.setCliente(cliente);
            }

            // Si en el local dieron un email, queda guardado para los próximos comprobantes
            usuarioService.guardarEmailDeContacto(venta.getCliente(), ventaRequest.getEmailCliente());
        }

        double totalVenta = 0.0;

        for (VentaItemRequest item : ventaRequest.getDetalles()) {

            if (item.getCantidad() == null || item.getCantidad() <= 0) {
                throw new RuntimeException("Cantidad inválida.");
            }

            Producto producto = productoRepository.findById(item.getProductoId())
                    .orElseThrow(() -> new RuntimeException("Producto no encontrado"));

            if (Boolean.FALSE.equals(producto.getActivo())) {
                throw new RuntimeException(producto.getNombre() + " ya no está a la venta.");
            }

            List<Lote> lotes = loteRepository
                    .findByProductoIdOrderByFechaVencimientoAsc(producto.getId())
                    .stream()
                    .filter(l -> l.getCantidad() > 0)
                    .filter(l -> !l.getFechaVencimiento().isBefore(LocalDate.now()))
                    .toList();

            int stockDisponible = lotes.stream()
                    .mapToInt(Lote::getCantidad)
                    .sum();

            if (stockDisponible < item.getCantidad()) {

                throw new RuntimeException(
                        "Stock insuficiente para " + producto.getNombre());
            }

            Double precioConDescuento = productoService.calcularPrecioConDescuento(producto);

            double precioAplicado = precioConDescuento != null
                    ? precioConDescuento
                    : producto.getPrecio();

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
                detalle.setPrecioUnitario(precioAplicado);

                venta.getDetalles().add(detalle);

                lote.setCantidad(lote.getCantidad() - cantidadTomada);

                loteRepository.save(lote);

                totalVenta += cantidadTomada * precioAplicado;

                cantidadPendiente -= cantidadTomada;

            }
        }

        venta.setTotal(totalVenta);

        return ventaRepository.save(venta);
    }

    // Compras de un cliente, sin importar si fueron en el local u online
    @Transactional(readOnly = true)
    public List<Map<String, Object>> obtenerComprasDeCliente(Long clienteId) {

        return ventaRepository.findByClienteIdOrderByIdDesc(clienteId)
                .stream()
                .map(venta -> {

                    // Un mismo producto puede salir de varios lotes: se agrupa
                    Map<String, Map<String, Object>> items = new LinkedHashMap<>();

                    for (DetalleVenta detalle : venta.getDetalles()) {

                        String nombre = detalle.getProducto() != null
                                ? detalle.getProducto().getNombre()
                                : "Producto";

                        double precio = detalle.getPrecioUnitario() != null
                                ? detalle.getPrecioUnitario()
                                : 0.0;

                        Map<String, Object> item = items.computeIfAbsent(nombre, n -> {
                            Map<String, Object> nuevo = new HashMap<>();
                            nuevo.put("producto", n);
                            nuevo.put("cantidad", 0);
                            nuevo.put("precioUnitario", precio);
                            return nuevo;
                        });

                        item.put("cantidad", (Integer) item.get("cantidad") + detalle.getCantidad());
                    }

                    Map<String, Object> compra = new HashMap<>();
                    compra.put("id", venta.getId());
                    compra.put("fecha", venta.getFecha());
                    compra.put("tipoVenta", venta.getTipoVenta() != null ? venta.getTipoVenta().name() : "");
                    compra.put("metodoPago", venta.getMetodoPago() != null ? venta.getMetodoPago().name() : "");
                    compra.put("total", venta.getTotal());
                    compra.put("items", new ArrayList<>(items.values()));

                    return compra;
                })
                .toList();
    }

    public List<Venta> obtenerVentas() {
        return ventaRepository.findAll();
    }

    public List<Venta> buscarHistorial(String busqueda) {
        String texto = busqueda == null ? "" : busqueda.trim();

        if (texto.isEmpty()) {
            return ventaRepository.findAll()
                    .stream()
                    .sorted((a, b) -> b.getId().compareTo(a.getId()))
                    .toList();
        }

        String numeroCompra = texto.matches("\\d+") ? texto : "-1";

        return ventaRepository.buscarHistorial(texto, numeroCompra);
    }

    public Venta obtenerVentaPorId(Long id) {
        return ventaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException(
                        "No se encontró la venta número " + id));
    }

    @Transactional(readOnly = true)
    public List<VentaHistorialDTO> obtenerHistorialDTO(String busqueda) {

        List<Venta> ventas = buscarHistorial(busqueda);

        return ventas.stream()
                .map(venta -> {
                    Usuario cliente = venta.getCliente();
                    Usuario empleado = venta.getEmpleado();

                    String nombreCliente = cliente == null
                            ? "Consumidor final"
                            : (cliente.getNombre() + " " + cliente.getApellido()).trim();

                    String nombreEmpleado = empleado == null
                            ? "No informado"
                            : (empleado.getNombre() + " " + empleado.getApellido()).trim();

                    String rolEmpleado = empleado == null
                            ? "No informado"
                            : empleado.getRol().name();

                    return new VentaHistorialDTO(
                            venta.getId(),
                            venta.getFecha(),
                            nombreCliente,
                            venta.getTipoVenta() != null
                                    ? venta.getTipoVenta().name()
                                    : "",
                            nombreEmpleado,
                            rolEmpleado,
                            venta.getMetodoPago() != null
                                    ? venta.getMetodoPago().name()
                                    : "",
                            venta.getTotal());
                })
                .toList();
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

        Map<Long, Map<String, Object>> clientes = new HashMap<>();

        for (Venta venta : ventaRepository.findAll()) {

            if (venta.getFecha() == null || venta.getCliente() == null) {
                continue;
            }

            if (venta.getFecha().getMonthValue() != mes
                    || venta.getFecha().getYear() != anio) {
                continue;
            }

            acumularCliente(clientes, venta);
        }

        return ordenarClientes(clientes);
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

        Map<String, Object> data = new HashMap<>();

        if (fecha == null) {
            throw new IllegalArgumentException("La fecha del reporte es obligatoria.");
        }

        double efectivo = 0.0;
        double transferencia = 0.0;
        double tarjeta = 0.0;

        double totalLocal = 0.0;
        double totalOnline = 0.0;
        double totalGeneral = 0.0;

        int cantidadVentas = 0;
        int ventasLocales = 0;
        int ventasOnline = 0;

        for (Venta venta : ventaRepository.findAll()) {

            if (venta.getFecha() == null || !venta.getFecha().equals(fecha)) {
                continue;
            }

            double total = venta.getTotal() != null
                    ? venta.getTotal()
                    : 0.0;

            cantidadVentas++;
            totalGeneral += total;

            if (venta.getTipoVenta() != null) {
                switch (venta.getTipoVenta()) {
                    case LOCAL:
                        totalLocal += total;
                        ventasLocales++;
                        break;

                    case ONLINE:
                        totalOnline += total;
                        ventasOnline++;
                        break;
                }
            }

            if (venta.getMetodoPago() == null) {
                continue;
            }

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

        data.put("fecha", fecha.toString());
        data.put("ventas", cantidadVentas);

        data.put("ventasLocales", ventasLocales);
        data.put("ventasOnline", ventasOnline);

        data.put("totalLocal", totalLocal);
        data.put("totalOnline", totalOnline);

        data.put("efectivo", efectivo);
        data.put("transferencia", transferencia);
        data.put("tarjeta", tarjeta);

        data.put("total", totalGeneral);

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

        if (fecha == null) {
            return new ArrayList<>();
        }

        for (Venta venta : ventaRepository.findAll()) {

            if (venta.getFecha() == null || !venta.getFecha().equals(fecha)) {
                continue;
            }

            if (venta.getDetalles() == null) {
                continue;
            }

            for (DetalleVenta detalle : venta.getDetalles()) {

                if (detalle == null || detalle.getProducto() == null) {
                    continue;
                }

                String nombre = detalle.getProducto().getNombre();

                if (nombre == null || nombre.isBlank()) {
                    continue;
                }

                int cantidad = detalle.getCantidad();

                conteo.put(nombre, conteo.getOrDefault(nombre, 0) + cantidad);
            }
        }

        return ordenarResultados(conteo);
    }

    public List<Map<String, Object>> obtenerProductosMasVendidosPorAnio(int anio) {

        Map<String, Integer> conteo = new HashMap<>();

        for (Venta venta : ventaRepository.findAll()) {

            if (venta.getFecha() == null || venta.getFecha().getYear() != anio) {
                continue;
            }

            if (venta.getDetalles() == null) {
                continue;
            }

            for (DetalleVenta detalle : venta.getDetalles()) {

                if (detalle == null || detalle.getProducto() == null) {
                    continue;
                }

                String nombre = detalle.getProducto().getNombre();

                if (nombre == null || nombre.isBlank()) {
                    continue;
                }

                int cantidad = detalle.getCantidad();

                conteo.put(nombre, conteo.getOrDefault(nombre, 0) + cantidad);
            }
        }

        return ordenarResultados(conteo);
    }

    public List<Map<String, Object>> obtenerTopClientesPorDia(LocalDate fecha) {

        Map<Long, Map<String, Object>> clientes = new HashMap<>();

        if (fecha == null) {
            return new ArrayList<>();
        }

        for (Venta venta : ventaRepository.findAll()) {

            if (venta.getFecha() == null || !venta.getFecha().equals(fecha)) {
                continue;
            }

            if (venta.getCliente() == null) {
                continue;
            }

            acumularCliente(clientes, venta);
        }

        return ordenarClientes(clientes);
    }

    public List<Map<String, Object>> obtenerTopClientesPorAnio(int anio) {

        Map<Long, Map<String, Object>> clientes = new HashMap<>();

        for (Venta venta : ventaRepository.findAll()) {

            if (venta.getFecha() == null
                    || venta.getFecha().getYear() != anio) {
                continue;
            }

            if (venta.getCliente() == null) {
                continue;
            }

            acumularCliente(clientes, venta);
        }

        return ordenarClientes(clientes);
    }

    private void acumularCliente(
            Map<Long, Map<String, Object>> clientes,
            Venta venta) {

        Usuario cliente = venta.getCliente();
        Long clienteId = cliente.getId();

        if (clienteId == null) {
            return;
        }

        Map<String, Object> datos = clientes.computeIfAbsent(
                clienteId,
                id -> {
                    Map<String, Object> nuevo = new HashMap<>();
                    nuevo.put("clienteId", id);

                    String nombre = cliente.getNombre() == null
                            ? ""
                            : cliente.getNombre().trim();

                    String apellido = cliente.getApellido() == null
                            ? ""
                            : cliente.getApellido().trim();

                    String nombreCompleto = (nombre + " " + apellido).trim();

                    nuevo.put(
                            "cliente",
                            nombreCompleto.isEmpty()
                                    ? "Cliente #" + id
                                    : nombreCompleto);

                    nuevo.put("totalGastado", 0.0);

                    return nuevo;
                });

        double totalVenta = venta.getTotal() != null
                ? venta.getTotal()
                : 0.0;

        double totalActual = ((Number) datos.get("totalGastado")).doubleValue();

        datos.put("totalGastado", totalActual + totalVenta);
    }

    private List<Map<String, Object>> ordenarClientes(
            Map<Long, Map<String, Object>> clientes) {

        return clientes.values()
                .stream()
                .sorted((a, b) -> Double.compare(
                        ((Number) b.get("totalGastado")).doubleValue(),
                        ((Number) a.get("totalGastado")).doubleValue()))
                .toList();
    }

}