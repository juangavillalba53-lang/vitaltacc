package com.vitaltacc.service;

import com.vitaltacc.model.*;
import com.vitaltacc.repository.LoteRepository;
import com.vitaltacc.repository.UsuarioRepository;
import com.vitaltacc.repository.VentaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;

/**
 * Pedidos online: el personal los va pasando de estado desde el panel
 * (ver EstadoPedido) y al cliente le llega un mail en cada cambio.
 */
@Service
public class PedidoService {

    @Autowired
    private VentaRepository ventaRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private LoteRepository loteRepository;

    // ---------------------------------------------------------
    // Consultas
    // ---------------------------------------------------------

    /**
     * @param filtro "activos" (los que falta terminar), "todos", o un estado (por ejemplo "PREPARANDO")
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listar(String filtro) {

        String elegido = filtro == null || filtro.isBlank() ? "activos" : filtro.trim().toUpperCase();

        return pedidosOnline().stream()
                .filter(v -> switch (elegido) {
                    case "TODOS" -> true;
                    case "ACTIVOS" -> !v.estadoActual().esFinal();
                    default -> v.estadoActual().name().equals(elegido);
                })
                .map(this::datosPedido)
                .toList();
    }

    // Cuántos pedidos hay en cada estado (para los contadores del panel)
    @Transactional(readOnly = true)
    public Map<String, Object> resumen() {

        Map<String, Integer> porEstado = new LinkedHashMap<>();
        for (EstadoPedido estado : EstadoPedido.values()) {
            porEstado.put(estado.name(), 0);
        }

        int activos = 0;
        for (Venta venta : pedidosOnline()) {
            porEstado.merge(venta.estadoActual().name(), 1, Integer::sum);
            if (!venta.estadoActual().esFinal()) activos++;
        }

        Map<String, Object> datos = new LinkedHashMap<>();
        datos.put("activos", activos);
        datos.put("porEstado", porEstado);
        return datos;
    }

    private List<Venta> pedidosOnline() {
        return ventaRepository.findAll().stream()
                .filter(Venta::esOnline)
                .sorted(Comparator.comparing(Venta::getId).reversed())
                .toList();
    }

    // ---------------------------------------------------------
    // Cambiar de estado
    // ---------------------------------------------------------

    @Transactional
    public Map<String, Object> cambiarEstado(Long ventaId, EstadoPedido nuevo, Long usuarioId, String nota) {

        Venta venta = ventaRepository.findById(ventaId)
                .orElseThrow(() -> new RuntimeException("No se encontró el pedido N.º " + ventaId + "."));

        if (!venta.esOnline()) {
            throw new RuntimeException("La compra N.º " + ventaId + " fue en el local: no tiene estados de pedido.");
        }

        Usuario usuario = usuarioId == null ? null : usuarioRepository.findById(usuarioId).orElse(null);

        if (usuario == null
                || Boolean.FALSE.equals(usuario.getActivo())
                || (usuario.getRol() != Rol.ADMIN && usuario.getRol() != Rol.EMPLEADO)) {
            throw new RuntimeException("Solo el personal del local puede cambiar el estado de un pedido.");
        }

        if (nuevo == null) {
            throw new RuntimeException("Elegí el estado nuevo del pedido.");
        }

        EstadoPedido actual = venta.estadoActual();

        if (nuevo == EstadoPedido.CANCELADO) {
            if (!actual.sePuedeCancelar()) {
                throw new RuntimeException(actual == EstadoPedido.CANCELADO
                        ? "El pedido ya estaba cancelado."
                        : "El pedido ya está " + actual.getNombre().toLowerCase()
                                + ": si el cliente lo devuelve, registralo como devolución.");
            }
            devolverAlStock(venta);

        } else if (nuevo != actual.siguiente(venta.formaEntregaActual())) {
            EstadoPedido esperado = actual.siguiente(venta.formaEntregaActual());
            throw new RuntimeException(esperado == null
                    ? "El pedido ya está " + actual.getNombre().toLowerCase() + "."
                    : "El pedido está " + actual.getNombre().toLowerCase()
                            + ": el paso siguiente es «" + esperado.getNombre() + "».");
        }

        if (nuevo == EstadoPedido.ENTREGADO) {
            venta.setFechaEntrega(LocalDate.now());
        }

        String notaLimpia = nota == null || nota.isBlank() ? null
                : nota.trim().substring(0, Math.min(nota.trim().length(), 250));

        venta.setEstadoPedido(nuevo);
        venta.getCambiosEstado().add(new CambioEstadoPedido(venta, nuevo, usuario, notaLimpia));

        return datosPedido(ventaRepository.save(venta));
    }

    // Al cancelar, lo que se había separado vuelve a los mismos lotes
    private void devolverAlStock(Venta venta) {
        for (DetalleVenta detalle : venta.getDetalles()) {
            Lote lote = detalle.getLote();
            lote.setCantidad(lote.getCantidad() + detalle.getCantidad());
            loteRepository.save(lote);
        }
    }

    // ---------------------------------------------------------
    // Datos que se muestran (panel y Mis compras)
    // ---------------------------------------------------------

    public Map<String, Object> datosPedido(Venta venta) {

        EstadoPedido estado = venta.estadoActual();
        FormaEntrega entrega = venta.formaEntregaActual();
        EstadoPedido siguiente = estado.siguiente(entrega);
        Usuario cliente = venta.getCliente();

        Map<String, Object> datos = new LinkedHashMap<>();
        datos.put("id", venta.getId());
        datos.put("fecha", venta.getFecha());
        datos.put("total", venta.getTotal());
        datos.put("metodoPago", venta.getMetodoPago() != null ? venta.getMetodoPago().name() : "");

        datos.put("cliente", cliente == null ? "" : ((cliente.getNombre() == null ? "" : cliente.getNombre())
                + " " + (cliente.getApellido() == null ? "" : cliente.getApellido())).trim());
        datos.put("clienteEmail", cliente == null || UsuarioService.esEmailInterno(cliente.getEmail())
                ? null : cliente.getEmail());
        datos.put("clienteTelefono", cliente != null ? cliente.getTelefono() : null);

        datos.put("formaEntrega", entrega.name());
        datos.put("formaEntregaNombre", entrega.getNombre());
        datos.put("envioDireccion", venta.getEnvioDireccion());
        datos.put("envioLocalidad", venta.getEnvioLocalidad());
        datos.put("envioTelefono", venta.getEnvioTelefono());
        datos.put("envioIndicaciones", venta.getEnvioIndicaciones());

        datos.put("estado", estado.name());
        datos.put("estadoNombre", estado.getNombre());
        datos.put("estadoMensaje", estado.getMensaje());
        datos.put("siguienteEstado", siguiente != null ? siguiente.name() : null);
        datos.put("siguienteNombre", siguiente != null ? siguiente.getNombre() : null);
        datos.put("sePuedeCancelar", estado.sePuedeCancelar());
        datos.put("recorrido", EstadoPedido.recorrido(entrega).stream()
                .map(e -> Map.of("estado", e.name(), "nombre", e.getNombre()))
                .toList());

        // Un renglón por producto (puede haber salido de varios lotes)
        Map<String, Map<String, Object>> items = new LinkedHashMap<>();
        for (DetalleVenta detalle : venta.getDetalles()) {
            Map<String, Object> item = items.computeIfAbsent(detalle.getProducto().getNombre(), nombre -> {
                Map<String, Object> nuevo = new LinkedHashMap<>();
                nuevo.put("producto", nombre);
                nuevo.put("cantidad", 0);
                nuevo.put("precioUnitario", detalle.getPrecioUnitario());
                return nuevo;
            });
            item.put("cantidad", (Integer) item.get("cantidad") + detalle.getCantidad());
        }
        datos.put("items", new ArrayList<>(items.values()));

        datos.put("historial", venta.getCambiosEstado().stream()
                .map(cambio -> {
                    Map<String, Object> paso = new LinkedHashMap<>();
                    paso.put("estado", cambio.getEstado().name());
                    paso.put("nombre", cambio.getEstado().getNombre());
                    paso.put("fechaHora", cambio.getFechaHora());
                    paso.put("quien", cambio.getUsuario() == null ? ""
                            : cambio.getUsuario().getRol() == Rol.CLIENTE ? "Cliente"
                            : (cambio.getUsuario().getNombre() + " " + cambio.getUsuario().getApellido()).trim());
                    paso.put("nota", cambio.getNota());
                    return paso;
                })
                .toList());

        return datos;
    }
}
