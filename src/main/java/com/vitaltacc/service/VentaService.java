package com.vitaltacc.service;

import com.vitaltacc.model.CambioEstadoPedido;
import com.vitaltacc.model.DetalleVenta;
import com.vitaltacc.model.Devolucion;
import com.vitaltacc.model.EstadoPedido;
import com.vitaltacc.model.FormaEntrega;
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

    @Autowired
    private DevolucionService devolucionService;

    @Autowired
    private PedidoService pedidoService;

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

            prepararEntrega(venta, ventaRequest);
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

        if (venta.esOnline()) {
            venta.setEstadoPedido(EstadoPedido.RECIBIDO);
            venta.getCambiosEstado().add(
                    new CambioEstadoPedido(venta, EstadoPedido.RECIBIDO, venta.getCliente(), null));
        }

        return ventaRepository.save(venta);
    }

    // Retiro en el local (por defecto) o envío: para el envío hacen falta dirección,
    // localidad y un teléfono para coordinar
    private void prepararEntrega(Venta venta, VentaRequest pedido) {

        FormaEntrega forma = pedido.getFormaEntrega() != null ? pedido.getFormaEntrega() : FormaEntrega.RETIRO;
        venta.setFormaEntrega(forma);

        if (forma != FormaEntrega.ENVIO) {
            return;
        }

        String direccion = recortar(pedido.getEnvioDireccion(), 150);
        String localidad = recortar(pedido.getEnvioLocalidad(), 80);
        String telefono = recortar(pedido.getEnvioTelefono(), 40);

        if (direccion == null || localidad == null || telefono == null) {
            throw new RuntimeException("Para el envío completá la dirección, la localidad y un teléfono.");
        }

        venta.setEnvioDireccion(direccion);
        venta.setEnvioLocalidad(localidad);
        venta.setEnvioTelefono(telefono);
        venta.setEnvioIndicaciones(recortar(pedido.getEnvioIndicaciones(), 250));
    }

    private static String recortar(String texto, int largo) {
        if (texto == null || texto.isBlank()) return null;
        String limpio = texto.trim();
        return limpio.length() > largo ? limpio.substring(0, largo) : limpio;
    }

    // Compras de un cliente, sin importar si fueron en el local u online
    @Transactional(readOnly = true)
    public List<Map<String, Object>> obtenerComprasDeCliente(Long clienteId) {

        Map<Long, Double> reintegros = devolucionService.reintegradoPorVenta();

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
                    compra.put("devuelto", reintegros.getOrDefault(venta.getId(), 0.0));

                    // Compras online: estado, entrega y los pasos del pedido
                    if (venta.esOnline()) {
                        Map<String, Object> pedido = pedidoService.datosPedido(venta);
                        for (String clave : List.of("estado", "estadoNombre", "estadoMensaje", "formaEntrega",
                                "formaEntregaNombre", "envioDireccion", "envioLocalidad", "recorrido", "historial")) {
                            compra.put(clave, pedido.get(clave));
                        }
                    }
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
        Map<Long, Double> reintegros = devolucionService.reintegradoPorVenta();

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
                            venta.getTotal(),
                            reintegros.getOrDefault(venta.getId(), 0.0),
                            DevolucionService.estaEnPlazo(venta),
                            venta.esOnline() ? venta.estadoActual().name() : null);
                })
                .toList();
    }

    // =========================================================
    // REPORTES
    // - La plata (totales y cierre de caja) se cuenta por día: una devolución
    //   resta el día en que se hizo, como pasa con la caja real.
    // - Más vendidos y mejores clientes miran cada venta ya neta: lo devuelto
    //   con reintegro no cuenta como vendido.
    // =========================================================

    private static double total(Venta venta) {
        return venta.getTotal() != null ? venta.getTotal() : 0.0;
    }

    private double reintegradoEntre(LocalDate desde, LocalDate hasta) {
        return devolucionService.conReintegroEntre(desde, hasta).stream()
                .mapToDouble(Devolucion::getMontoReintegradoSeguro)
                .sum();
    }

    // Para los reportes y la caja: los pedidos cancelados no cuentan
    private List<Venta> ventasQueCuentan() {
        return ventaRepository.findAll().stream().filter(v -> !v.estaCancelada()).toList();
    }

    public Double obtenerTotalFacturado() {

        double vendido = ventasQueCuentan().stream().mapToDouble(VentaService::total).sum();
        double devuelto = devolucionService.reintegradoPorVenta().values().stream()
                .mapToDouble(Double::doubleValue).sum();

        return vendido - devuelto;
    }

    public Double obtenerTotalPorMes(int mes, int anio) {

        LocalDate desde = LocalDate.of(anio, mes, 1);
        LocalDate hasta = desde.plusMonths(1).minusDays(1);

        double vendido = ventasQueCuentan().stream()
                .filter(v -> v.getFecha() != null && !v.getFecha().isBefore(desde) && !v.getFecha().isAfter(hasta))
                .mapToDouble(VentaService::total)
                .sum();

        return vendido - reintegradoEntre(desde, hasta);
    }

    public List<Map<String, Object>> obtenerTotalPorAnio(int anio) {

        double[] totalesPorMes = new double[13];

        for (Venta venta : ventasQueCuentan()) {
            if (venta.getFecha() != null && venta.getFecha().getYear() == anio) {
                totalesPorMes[venta.getFecha().getMonthValue()] += total(venta);
            }
        }

        for (Devolucion devolucion : devolucionService.conReintegroEntre(
                LocalDate.of(anio, 1, 1), LocalDate.of(anio, 12, 31))) {
            totalesPorMes[devolucion.getFecha().getMonthValue()] -= devolucion.getMontoReintegradoSeguro();
        }

        List<Map<String, Object>> resultado = new ArrayList<>();

        for (int mes = 1; mes <= 12; mes++) {
            Map<String, Object> data = new HashMap<>();
            data.put("mes", mes);
            data.put("total", totalesPorMes[mes]);
            resultado.add(data);
        }

        return resultado;
    }

    // ---------------------------------------------------------
    // Más vendidos (las cuatro variantes usan la misma cuenta)
    // ---------------------------------------------------------

    public List<Map<String, Object>> obtenerProductosMasVendidos() {
        return contarVendidos(venta -> true);
    }

    public List<Map<String, Object>> obtenerProductosMasVendidosPorMes(int mes, int anio) {
        return contarVendidos(venta -> venta.getFecha().getMonthValue() == mes
                && venta.getFecha().getYear() == anio);
    }

    public List<Map<String, Object>> obtenerProductosMasVendidosPorDia(LocalDate fecha) {
        if (fecha == null) {
            return new ArrayList<>();
        }
        return contarVendidos(venta -> venta.getFecha().equals(fecha));
    }

    public List<Map<String, Object>> obtenerProductosMasVendidosPorAnio(int anio) {
        return contarVendidos(venta -> venta.getFecha().getYear() == anio);
    }

    private List<Map<String, Object>> contarVendidos(java.util.function.Predicate<Venta> filtro) {

        Map<String, Integer> conteo = new HashMap<>();
        Map<Long, Map<String, Integer>> devueltas = devolucionService.unidadesDevueltasPorVenta();

        for (Venta venta : ventasQueCuentan()) {

            if (venta.getFecha() == null || venta.getDetalles() == null || !filtro.test(venta)) {
                continue;
            }

            for (DetalleVenta detalle : venta.getDetalles()) {
                if (detalle == null || detalle.getProducto() == null) continue;

                String nombre = detalle.getProducto().getNombre();
                if (nombre == null || nombre.isBlank()) continue;

                conteo.merge(nombre, detalle.getCantidad(), Integer::sum);
            }

            devueltas.getOrDefault(venta.getId(), Map.of())
                    .forEach((nombre, cantidad) -> conteo.merge(nombre, -cantidad, Integer::sum));
        }

        return conteo.entrySet().stream()
                .filter(entry -> entry.getValue() > 0)
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

    // ---------------------------------------------------------
    // Mejores clientes (las tres variantes usan la misma cuenta)
    // ---------------------------------------------------------

    public List<Map<String, Object>> obtenerTopClientesPorMes(int mes, int anio) {
        return topClientes(venta -> venta.getFecha().getMonthValue() == mes
                && venta.getFecha().getYear() == anio);
    }

    public List<Map<String, Object>> obtenerTopClientesPorDia(LocalDate fecha) {
        if (fecha == null) {
            return new ArrayList<>();
        }
        return topClientes(venta -> venta.getFecha().equals(fecha));
    }

    public List<Map<String, Object>> obtenerTopClientesPorAnio(int anio) {
        return topClientes(venta -> venta.getFecha().getYear() == anio);
    }

    private List<Map<String, Object>> topClientes(java.util.function.Predicate<Venta> filtro) {

        Map<Long, Map<String, Object>> clientes = new HashMap<>();
        Map<Long, Double> reintegros = devolucionService.reintegradoPorVenta();

        for (Venta venta : ventasQueCuentan()) {

            Usuario cliente = venta.getCliente();

            if (venta.getFecha() == null || cliente == null || cliente.getId() == null || !filtro.test(venta)) {
                continue;
            }

            Map<String, Object> datos = clientes.computeIfAbsent(cliente.getId(), id -> {
                Map<String, Object> nuevo = new HashMap<>();
                nuevo.put("clienteId", id);

                String nombreCompleto = ((cliente.getNombre() == null ? "" : cliente.getNombre().trim()) + " "
                        + (cliente.getApellido() == null ? "" : cliente.getApellido().trim())).trim();

                nuevo.put("cliente", nombreCompleto.isEmpty() ? "Cliente #" + id : nombreCompleto);
                nuevo.put("totalGastado", 0.0);
                return nuevo;
            });

            double neto = total(venta) - reintegros.getOrDefault(venta.getId(), 0.0);
            datos.put("totalGastado", ((Number) datos.get("totalGastado")).doubleValue() + neto);
        }

        return clientes.values()
                .stream()
                .filter(c -> ((Number) c.get("totalGastado")).doubleValue() > 0)
                .sorted((a, b) -> Double.compare(
                        ((Number) b.get("totalGastado")).doubleValue(),
                        ((Number) a.get("totalGastado")).doubleValue()))
                .toList();
    }

    // ---------------------------------------------------------
    // Cierre de caja y reporte por día
    // ---------------------------------------------------------

    public Map<String, Object> obtenerCierreCajaHoy() {
        return obtenerReportePorDia(LocalDate.now());
    }

    public Map<String, Object> obtenerReportePorDia(LocalDate fecha) {

        if (fecha == null) {
            throw new IllegalArgumentException("La fecha del reporte es obligatoria.");
        }

        Map<String, Double> porMedio = new HashMap<>(Map.of("efectivo", 0.0, "transferencia", 0.0, "tarjeta", 0.0));
        Map<String, Double> porCanal = new HashMap<>(Map.of("LOCAL", 0.0, "ONLINE", 0.0));

        double vendido = 0.0;
        int cantidadVentas = 0;
        int ventasLocales = 0;
        int ventasOnline = 0;

        for (Venta venta : ventasQueCuentan()) {

            if (venta.getFecha() == null || !venta.getFecha().equals(fecha)) {
                continue;
            }

            double monto = total(venta);

            cantidadVentas++;
            vendido += monto;

            if (venta.getTipoVenta() == com.vitaltacc.model.TipoVenta.LOCAL) ventasLocales++;
            if (venta.getTipoVenta() == com.vitaltacc.model.TipoVenta.ONLINE) ventasOnline++;

            sumar(porCanal, porMedio, venta, monto);
        }

        // Lo que se devolvió hoy sale de la caja de hoy, por el medio de pago de la venta
        List<Devolucion> devoluciones = devolucionService.conReintegroEntre(fecha, fecha);
        double devuelto = 0.0;

        for (Devolucion devolucion : devoluciones) {
            double monto = devolucion.getMontoReintegradoSeguro();
            devuelto += monto;
            sumar(porCanal, porMedio, devolucion.getVenta(), -monto);
        }

        Map<String, Object> data = new HashMap<>();

        data.put("fecha", fecha.toString());
        data.put("ventas", cantidadVentas);
        data.put("ventasLocales", ventasLocales);
        data.put("ventasOnline", ventasOnline);

        data.put("totalLocal", porCanal.get("LOCAL"));
        data.put("totalOnline", porCanal.get("ONLINE"));

        data.put("efectivo", porMedio.get("efectivo"));
        data.put("transferencia", porMedio.get("transferencia"));
        data.put("tarjeta", porMedio.get("tarjeta"));

        data.put("totalVendido", vendido);
        data.put("devoluciones", devoluciones.size());
        data.put("totalDevuelto", devuelto);
        data.put("total", vendido - devuelto);

        return data;
    }

    private static void sumar(Map<String, Double> porCanal, Map<String, Double> porMedio, Venta venta, double monto) {

        if (venta.getTipoVenta() != null) {
            porCanal.merge(venta.getTipoVenta().name(), monto, Double::sum);
        }

        if (venta.getMetodoPago() == null) {
            return;
        }

        String medio = switch (venta.getMetodoPago()) {
            case EFECTIVO -> "efectivo";
            case TRANSFERENCIA, MERCADO_PAGO, MODO -> "transferencia";
            case TARJETA_DEBITO, TARJETA_CREDITO -> "tarjeta";
        };

        porMedio.merge(medio, monto, Double::sum);
    }

    public int obtenerCantidadVentasPorMes(int mes, int anio) {

        return (int) ventasQueCuentan().stream()
                .filter(v -> v.getFecha() != null
                        && v.getFecha().getMonthValue() == mes
                        && v.getFecha().getYear() == anio)
                .count();
    }

    public int obtenerCantidadVentasPorAnio(int anio) {

        return (int) ventasQueCuentan().stream()
                .filter(v -> v.getFecha() != null
                        && v.getFecha().getYear() == anio)
                .count();
    }
}
