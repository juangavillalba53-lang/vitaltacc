package com.vitaltacc.service;

import com.vitaltacc.model.EstadoPedido;
import com.vitaltacc.model.Rol;
import com.vitaltacc.model.TipoVenta;
import com.vitaltacc.model.Usuario;
import com.vitaltacc.model.Venta;
import com.vitaltacc.repository.UsuarioRepository;
import com.vitaltacc.repository.VentaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * CLIENTES: listado para el panel con lo que compró cada uno.
 * Incluye a los que se registraron en la tienda y a los que se cargaron
 * por DNI en una venta del local.
 */
@Service
public class ClienteService {

    public static final int CLIENTES_POR_PAGINA = 20;

    private final UsuarioRepository usuarioRepository;
    private final VentaRepository ventaRepository;
    private final DevolucionService devolucionService;

    public ClienteService(UsuarioRepository usuarioRepository, VentaRepository ventaRepository,
                          DevolucionService devolucionService) {
        this.usuarioRepository = usuarioRepository;
        this.ventaRepository = ventaRepository;
        this.devolucionService = devolucionService;
    }

    // Lo que compró cada cliente (sin pedidos cancelados y restando lo reintegrado)
    private static class Resumen {
        int compras;
        int local;
        int online;
        double total;
        LocalDate ultima;
    }

    /**
     * @param texto  busca en nombre, apellido, DNI, email y teléfono
     * @param orden  "recientes" (última compra), "compras" (más compras), "gastado" o "nombre"
     */
    @Transactional(readOnly = true)
    public Map<String, Object> listar(String texto, String orden, int pagina) {

        Map<Long, Double> reintegros = devolucionService.reintegradoPorVenta();
        Map<Long, Resumen> resumenes = new HashMap<>();

        for (Venta venta : ventaRepository.findAll()) {
            if (venta.getCliente() == null || venta.estadoActual() == EstadoPedido.CANCELADO) {
                continue;
            }
            Resumen r = resumenes.computeIfAbsent(venta.getCliente().getId(), id -> new Resumen());
            r.compras++;
            if (venta.getTipoVenta() == TipoVenta.ONLINE) r.online++; else r.local++;
            r.total += (venta.getTotal() == null ? 0 : venta.getTotal()) - reintegros.getOrDefault(venta.getId(), 0.0);
            if (r.ultima == null || venta.getFecha().isAfter(r.ultima)) r.ultima = venta.getFecha();
        }

        String busqueda = normalizar(texto);

        List<Usuario> clientes = usuarioRepository.findAll().stream()
                .filter(u -> u.getRol() == Rol.CLIENTE && !Boolean.FALSE.equals(u.getActivo()))
                .filter(u -> busqueda.isEmpty() || coincide(u, busqueda))
                .sorted(comparador(orden, resumenes))
                .toList();

        int totalPaginas = Math.max(1, (int) Math.ceil(clientes.size() / (double) CLIENTES_POR_PAGINA));
        int actual = Math.min(Math.max(pagina, 1), totalPaginas);

        List<Map<String, Object>> filas = clientes.stream()
                .skip((long) (actual - 1) * CLIENTES_POR_PAGINA)
                .limit(CLIENTES_POR_PAGINA)
                .map(u -> aMapa(u, resumenes.get(u.getId())))
                .toList();

        Map<String, Object> respuesta = new HashMap<>();
        respuesta.put("clientes", filas);
        respuesta.put("pagina", actual);
        respuesta.put("totalPaginas", totalPaginas);
        respuesta.put("total", clientes.size());
        return respuesta;
    }

    private static Comparator<Usuario> comparador(String orden, Map<Long, Resumen> resumenes) {

        Comparator<Usuario> porNombre = Comparator
                .comparing((Usuario u) -> normalizar(u.getApellido()))
                .thenComparing(u -> normalizar(u.getNombre()));

        java.util.function.Function<Usuario, Resumen> r = u -> resumenes.getOrDefault(u.getId(), new Resumen());

        return switch (orden == null ? "" : orden) {
            case "nombre" -> porNombre;
            case "compras" -> Comparator.comparing((Usuario u) -> r.apply(u).compras).reversed().thenComparing(porNombre);
            case "gastado" -> Comparator.comparing((Usuario u) -> r.apply(u).total).reversed().thenComparing(porNombre);
            // Por defecto: los que compraron más recientemente primero; los que nunca compraron al final
            default -> Comparator.comparing((Usuario u) -> r.apply(u).ultima,
                            Comparator.nullsLast(Comparator.reverseOrder()))
                    .thenComparing(porNombre);
        };
    }

    private static boolean coincide(Usuario u, String busqueda) {
        String todo = normalizar(String.join(" ",
                valor(u.getNombre()), valor(u.getApellido()), valor(u.getDni()),
                UsuarioService.esEmailInterno(u.getEmail()) ? "" : valor(u.getEmail()),
                valor(u.getTelefono())));
        for (String palabra : busqueda.split("\\s+")) {
            if (!todo.contains(palabra)) return false;
        }
        return true;
    }

    private Map<String, Object> aMapa(Usuario u, Resumen r) {
        Map<String, Object> data = new HashMap<>();
        data.put("id", u.getId());
        data.put("nombre", u.getNombre());
        data.put("apellido", u.getApellido());
        data.put("dni", u.getDni());
        // Las cuentas creadas en el local tienen un email interno: no se muestra
        data.put("email", UsuarioService.esEmailInterno(u.getEmail()) ? null : u.getEmail());
        data.put("telefono", u.getTelefono());
        data.put("cuentaWeb", !UsuarioService.esCuentaPendiente(u));
        data.put("compras", r == null ? 0 : r.compras);
        data.put("comprasLocal", r == null ? 0 : r.local);
        data.put("comprasOnline", r == null ? 0 : r.online);
        data.put("totalGastado", r == null ? 0.0 : Math.round(r.total * 100) / 100.0);
        data.put("ultimaCompra", r == null ? null : r.ultima);
        return data;
    }

    private static String valor(String texto) {
        return texto == null ? "" : texto;
    }

    private static String normalizar(String texto) {
        if (texto == null) return "";
        return Normalizer.normalize(texto.trim().toLowerCase(), Normalizer.Form.NFD).replaceAll("\\p{M}", "");
    }
}
