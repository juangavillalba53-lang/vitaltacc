package com.vitaltacc.service;

import com.vitaltacc.dto.DevolucionRequest;
import com.vitaltacc.service.AuditoriaService.Cambios;
import com.vitaltacc.model.*;
import com.vitaltacc.repository.DevolucionRepository;
import com.vitaltacc.repository.LoteRepository;
import com.vitaltacc.repository.UsuarioRepository;
import com.vitaltacc.repository.VentaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Devoluciones:
 * - Se pueden hacer hasta 2 días después de la compra.
 * - Se puede devolver una parte de la compra, y más de una vez,
 *   mientras queden unidades sin devolver.
 * - El motivo decide si se devuelve la plata y si el producto puede volver a la venta
 *   (ver MotivoDevolucion). Solo vuelve al stock lo que está cerrado y sano.
 * - La plata se devuelve por el mismo medio de pago de la venta.
 */
@Service
public class DevolucionService {

    public static final int DIAS_PARA_DEVOLVER = 2;

    @Autowired
    private DevolucionRepository devolucionRepository;

    @Autowired
    private VentaRepository ventaRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private LoteRepository loteRepository;

    @Autowired
    private AuditoriaService auditoria;

    // ---------------------------------------------------------
    // Plazo y unidades disponibles
    // ---------------------------------------------------------

    // En el local los 2 días corren desde la compra; online, desde que el cliente lo recibió
    public static LocalDate fechaLimite(Venta venta) {
        LocalDate desde = venta.esOnline() && venta.getFechaEntrega() != null
                ? venta.getFechaEntrega()
                : venta.getFecha();
        return desde.plusDays(DIAS_PARA_DEVOLVER);
    }

    // Un pedido online solo se puede devolver una vez entregado
    public static boolean estaEnPlazo(Venta venta) {
        return venta.getFecha() != null
                && (!venta.esOnline() || venta.estadoActual() == EstadoPedido.ENTREGADO)
                && !LocalDate.now().isAfter(fechaLimite(venta));
    }

    private static String porQueNoSePuede(Venta venta) {
        if (venta.estaCancelada()) return "El pedido fue cancelado.";
        if (venta.esOnline() && venta.estadoActual() != EstadoPedido.ENTREGADO) {
            return "El pedido todavía no se entregó.";
        }
        return "Pasaron más de " + DIAS_PARA_DEVOLVER + " días desde la " + (venta.esOnline() ? "entrega." : "compra.");
    }

    // Un renglón devuelto "cuenta" si se aceptó: se devolvió plata o volvió al stock
    private static boolean fueAceptado(DevolucionItem item) {
        return Boolean.TRUE.equals(item.getVuelveAlStock())
                || (item.getReintegro() != null && item.getReintegro() > 0);
    }

    // Unidades ya devueltas de cada renglón de la venta
    private Map<Long, Integer> devueltasPorDetalle(Long ventaId) {
        Map<Long, Integer> devueltas = new HashMap<>();

        for (Devolucion devolucion : devolucionRepository.findByVentaIdOrderByIdAsc(ventaId)) {
            for (DevolucionItem item : devolucion.getItems()) {
                if (fueAceptado(item)) {
                    devueltas.merge(item.getDetalleVenta().getId(), item.getCantidad(), Integer::sum);
                }
            }
        }
        return devueltas;
    }

    // Lo que se puede volver a vender: lote no vencido, no retirado y producto activo
    private static boolean loteVendible(Lote lote) {
        return lote != null
                && lote.getFechaRetiro() == null
                && lote.getFechaVencimiento() != null
                && !lote.getFechaVencimiento().isBefore(LocalDate.now())
                && !Boolean.FALSE.equals(lote.getProducto().getActivo());
    }

    // ---------------------------------------------------------
    // Datos para armar la devolución en el panel
    // ---------------------------------------------------------

    @Transactional(readOnly = true)
    public Map<String, Object> prepararDevolucion(Long ventaId) {

        Venta venta = buscarVenta(ventaId);
        Map<Long, Integer> devueltas = devueltasPorDetalle(ventaId);

        // Un producto puede haber salido de varios lotes: se muestra junto
        Map<Long, Map<String, Object>> porProducto = new LinkedHashMap<>();

        for (DetalleVenta detalle : venta.getDetalles()) {
            Producto producto = detalle.getProducto();

            Map<String, Object> item = porProducto.computeIfAbsent(producto.getId(), id -> {
                Map<String, Object> nuevo = new LinkedHashMap<>();
                nuevo.put("productoId", id);
                nuevo.put("producto", producto.getNombre());
                nuevo.put("precioUnitario", detalle.getPrecioUnitario());
                nuevo.put("vendidas", 0);
                nuevo.put("devueltas", 0);
                return nuevo;
            });

            item.put("vendidas", (Integer) item.get("vendidas") + detalle.getCantidad());
            item.put("devueltas", (Integer) item.get("devueltas")
                    + devueltas.getOrDefault(detalle.getId(), 0));
        }

        porProducto.values().forEach(item ->
                item.put("disponibles", (Integer) item.get("vendidas") - (Integer) item.get("devueltas")));

        boolean enPlazo = estaEnPlazo(venta);
        boolean quedanUnidades = porProducto.values().stream()
                .anyMatch(item -> (Integer) item.get("disponibles") > 0);

        Map<String, Object> datos = new LinkedHashMap<>();
        datos.put("ventaId", venta.getId());
        datos.put("fecha", venta.getFecha());
        datos.put("fechaLimite", fechaLimite(venta));
        datos.put("cliente", nombreCliente(venta));
        datos.put("tipoVenta", venta.getTipoVenta() != null ? venta.getTipoVenta().name() : "");
        datos.put("metodoPago", venta.getMetodoPago() != null ? venta.getMetodoPago().name() : "");
        datos.put("total", venta.getTotal());
        datos.put("enPlazo", enPlazo);
        datos.put("puedeDevolver", enPlazo && quedanUnidades);
        datos.put("motivoNoPuede", !enPlazo
                ? porQueNoSePuede(venta)
                : !quedanUnidades ? "Ya se devolvió todo lo de esta compra." : "");
        datos.put("items", new ArrayList<>(porProducto.values()));
        datos.put("devoluciones", devolucionRepository.findByVentaIdOrderByIdAsc(ventaId)
                .stream().map(this::resumen).toList());
        return datos;
    }

    public List<Map<String, Object>> motivos() {
        return Arrays.stream(MotivoDevolucion.values())
                .map(m -> {
                    Map<String, Object> datos = new LinkedHashMap<>();
                    datos.put("codigo", m.name());
                    datos.put("nombre", m.getNombre());
                    datos.put("descripcion", m.getDescripcion());
                    datos.put("reintegroSoloSiCerrado", m.isReintegroSoloSiCerrado());
                    datos.put("puedeVolverAlStock", m.isPuedeVolverAlStock());
                    return datos;
                })
                .toList();
    }

    // ---------------------------------------------------------
    // Registrar la devolución
    // ---------------------------------------------------------

    @Transactional
    public Map<String, Object> registrarDevolucion(DevolucionRequest request) {

        if (request.getVentaId() == null) {
            throw new RuntimeException("Elegí la venta que se devuelve.");
        }

        if (request.getMotivo() == null) {
            throw new RuntimeException("Elegí el motivo de la devolución.");
        }

        Venta venta = buscarVenta(request.getVentaId());

        if (!estaEnPlazo(venta)) {
            throw new RuntimeException("No se puede devolver: " + porQueNoSePuede(venta).toLowerCase());
        }

        Usuario empleado = request.getEmpleadoId() == null ? null
                : usuarioRepository.findById(request.getEmpleadoId()).orElse(null);

        if (empleado == null
                || Boolean.FALSE.equals(empleado.getActivo())
                || (empleado.getRol() != Rol.ADMIN && empleado.getRol() != Rol.EMPLEADO)) {
            throw new RuntimeException("Solo el personal del local puede registrar devoluciones.");
        }

        List<DevolucionRequest.Item> pedidos = request.getItems() == null ? List.of()
                : request.getItems().stream()
                        .filter(i -> i.getCantidad() != null && i.getCantidad() > 0)
                        .toList();

        if (pedidos.isEmpty()) {
            throw new RuntimeException("Indicá cuántas unidades se devuelven.");
        }

        MotivoDevolucion motivo = request.getMotivo();
        Map<Long, Integer> devueltas = devueltasPorDetalle(venta.getId());

        Devolucion devolucion = new Devolucion();
        devolucion.setVenta(venta);
        devolucion.setEmpleado(empleado);
        devolucion.setFecha(LocalDate.now());
        devolucion.setMotivo(motivo);
        devolucion.setObservacion(request.getObservacion() == null ? null
                : request.getObservacion().trim());

        Set<Long> productosVistos = new HashSet<>();

        for (DevolucionRequest.Item pedido : pedidos) {

            if (!productosVistos.add(pedido.getProductoId())) {
                throw new RuntimeException("Hay un producto repetido en la devolución.");
            }

            // Los renglones de la venta de este producto, primero los que se pueden
            // volver a vender y, entre ellos, el lote que vence más tarde
            List<DetalleVenta> renglones = venta.getDetalles().stream()
                    .filter(d -> d.getProducto().getId().equals(pedido.getProductoId()))
                    .sorted(Comparator
                            .comparing((DetalleVenta d) -> !loteVendible(d.getLote()))
                            .thenComparing(d -> d.getLote().getFechaVencimiento(), Comparator.reverseOrder()))
                    .toList();

            if (renglones.isEmpty()) {
                throw new RuntimeException("Ese producto no está en la venta N.º " + venta.getId() + ".");
            }

            String nombre = renglones.get(0).getProducto().getNombre();

            int disponibles = renglones.stream()
                    .mapToInt(d -> d.getCantidad() - devueltas.getOrDefault(d.getId(), 0))
                    .sum();

            if (pedido.getCantidad() > disponibles) {
                throw new RuntimeException(disponibles == 0
                        ? nombre + " ya se devolvió completo."
                        : disponibles == 1
                                ? "De " + nombre + " queda 1 unidad para devolver."
                                : "De " + nombre + " se pueden devolver como máximo " + disponibles + " unidades.");
            }

            // Si el motivo no permite volver a vender, el estado no cambia nada
            EstadoProductoDevuelto estado = pedido.getEstado() != null
                    ? pedido.getEstado()
                    : EstadoProductoDevuelto.ABIERTO;

            int pendiente = pedido.getCantidad();

            for (DetalleVenta renglon : renglones) {
                if (pendiente == 0) break;

                int libres = renglon.getCantidad() - devueltas.getOrDefault(renglon.getId(), 0);
                int cantidad = Math.min(libres, pendiente);
                if (cantidad <= 0) continue;

                DevolucionItem item = new DevolucionItem();
                item.setDevolucion(devolucion);
                item.setDetalleVenta(renglon);
                item.setProducto(renglon.getProducto());
                item.setCantidad(cantidad);
                item.setPrecioUnitario(renglon.getPrecioUnitario());
                item.setEstadoProducto(estado);

                item.setReintegro(motivo.correspondeReintegro(estado)
                        ? redondear(cantidad * renglon.getPrecioUnitario())
                        : 0.0);

                // Vuelve al mismo lote, salvo que ya esté vencido o retirado
                boolean vuelve = motivo.vuelveAlStock(estado) && loteVendible(renglon.getLote());
                item.setVuelveAlStock(vuelve);

                if (vuelve) {
                    Lote lote = renglon.getLote();
                    lote.setCantidad(lote.getCantidad() + cantidad);
                    loteRepository.save(lote);
                }

                devolucion.getItems().add(item);
                pendiente -= cantidad;
            }
        }

        double monto = devolucion.getItems().stream().mapToDouble(DevolucionItem::getReintegro).sum();
        devolucion.setMontoReintegrado(redondear(monto));

        boolean algoAceptado = devolucion.getItems().stream().anyMatch(DevolucionService::fueAceptado);
        devolucion.setEstado(algoAceptado ? EstadoDevolucion.APROBADA : EstadoDevolucion.RECHAZADA);

        Devolucion guardada = devolucionRepository.save(devolucion);

        Map<String, Integer> devueltos = new LinkedHashMap<>();
        Map<String, Integer> alStock = new LinkedHashMap<>();
        guardada.getItems().forEach(i -> {
            devueltos.merge(i.getProducto().getNombre(), i.getCantidad(), Integer::sum);
            if (Boolean.TRUE.equals(i.getVuelveAlStock())) {
                alStock.merge(i.getProducto().getNombre(), i.getCantidad(), Integer::sum);
            }
        });

        auditoria.registrarComo(empleado, ModuloAuditoria.DEVOLUCIONES, AccionAuditoria.CREAR, guardada.getId(),
                "Registró una devolución de la venta N.º " + venta.getId(),
                new Cambios()
                        .dato("Motivo", motivo.getNombre())
                        .dato("Productos", unir(devueltos))
                        .dato("Resultado", guardada.getEstado() == EstadoDevolucion.APROBADA ? "Aprobada" : "Rechazada")
                        .dato("Reintegro", AuditoriaService.pesos(guardada.getMontoReintegrado()))
                        .linea(alStock.isEmpty() ? "No vuelve nada al stock" : "Vuelve al stock: " + unir(alStock)));

        return resumen(guardada);
    }

    private static String unir(Map<String, Integer> cantidades) {
        return cantidades.entrySet().stream()
                .map(e -> e.getValue() + " × " + e.getKey())
                .collect(Collectors.joining(", "));
    }

    // ---------------------------------------------------------
    // Consultas
    // ---------------------------------------------------------

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listar() {
        return devolucionRepository.findAllByOrderByIdDesc().stream().map(this::resumen).toList();
    }

    // Plata devuelta por cada venta (para el historial y Mis compras)
    @Transactional(readOnly = true)
    public Map<Long, Double> reintegradoPorVenta() {
        return devolucionRepository.findAll().stream()
                .collect(Collectors.groupingBy(
                        d -> d.getVenta().getId(),
                        Collectors.summingDouble(Devolucion::getMontoReintegradoSeguro)));
    }

    // Unidades devueltas con reintegro, por venta y por producto (para netear los más vendidos)
    @Transactional(readOnly = true)
    public Map<Long, Map<String, Integer>> unidadesDevueltasPorVenta() {
        Map<Long, Map<String, Integer>> resultado = new HashMap<>();

        for (Devolucion devolucion : devolucionRepository.findAll()) {
            for (DevolucionItem item : devolucion.getItems()) {
                if (item.getReintegro() != null && item.getReintegro() > 0) {
                    resultado
                            .computeIfAbsent(devolucion.getVenta().getId(), id -> new HashMap<>())
                            .merge(item.getProducto().getNombre(), item.getCantidad(), Integer::sum);
                }
            }
        }
        return resultado;
    }

    // Devoluciones con plata devuelta en un período (por la fecha de la devolución)
    @Transactional(readOnly = true)
    public List<Devolucion> conReintegroEntre(LocalDate desde, LocalDate hasta) {
        List<Devolucion> lista = devolucionRepository.findByFechaBetween(desde, hasta).stream()
                .filter(d -> d.getMontoReintegradoSeguro() > 0)
                .toList();
        // Se recorren los ítems acá, dentro de la transacción
        lista.forEach(d -> d.getItems().size());
        return lista;
    }

    private Map<String, Object> resumen(Devolucion d) {

        int alStock = 0;
        int descartadas = 0;
        int rechazadas = 0;
        List<Map<String, Object>> items = new ArrayList<>();

        for (DevolucionItem item : d.getItems()) {
            if (Boolean.TRUE.equals(item.getVuelveAlStock())) alStock += item.getCantidad();
            else if (fueAceptado(item)) descartadas += item.getCantidad();
            else rechazadas += item.getCantidad();

            Map<String, Object> datos = new LinkedHashMap<>();
            datos.put("producto", item.getProducto().getNombre());
            datos.put("cantidad", item.getCantidad());
            datos.put("estadoProducto", item.getEstadoProducto().name());
            datos.put("vuelveAlStock", item.getVuelveAlStock());
            datos.put("reintegro", item.getReintegro());
            items.add(datos);
        }

        Venta venta = d.getVenta();
        Map<String, Object> datos = new LinkedHashMap<>();
        datos.put("id", d.getId());
        datos.put("fecha", d.getFecha());
        datos.put("ventaId", venta.getId());
        datos.put("cliente", nombreCliente(venta));
        datos.put("motivo", d.getMotivo().name());
        datos.put("motivoNombre", d.getMotivo().getNombre());
        datos.put("estado", d.getEstado().name());
        datos.put("montoReintegrado", d.getMontoReintegradoSeguro());
        datos.put("metodoPago", venta.getMetodoPago() != null ? venta.getMetodoPago().name() : "");
        datos.put("unidadesAlStock", alStock);
        datos.put("unidadesDescartadas", descartadas);
        datos.put("unidadesRechazadas", rechazadas);
        datos.put("empleado", d.getEmpleado() == null ? ""
                : (d.getEmpleado().getNombre() + " " + d.getEmpleado().getApellido()).trim());
        datos.put("observacion", d.getObservacion());
        datos.put("items", items);
        return datos;
    }

    private Venta buscarVenta(Long id) {
        return ventaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("No se encontró la venta N.º " + id + "."));
    }

    private static String nombreCliente(Venta venta) {
        Usuario cliente = venta.getCliente();
        return cliente == null ? "Consumidor final"
                : ((cliente.getNombre() == null ? "" : cliente.getNombre()) + " "
                        + (cliente.getApellido() == null ? "" : cliente.getApellido())).trim();
    }

    private static double redondear(double valor) {
        return Math.round(valor * 100.0) / 100.0;
    }
}
