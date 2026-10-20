package com.vitaltacc.controller;

import com.vitaltacc.model.EstadoPedido;
import com.vitaltacc.service.CompraEmailService;
import com.vitaltacc.service.PedidoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

// Pedidos online: lista para el panel y cambio de estado
@RestController
@RequestMapping("/pedidos")
@CrossOrigin(origins = "*")
public class PedidoController {

    @Autowired
    private PedidoService pedidoService;

    @Autowired
    private CompraEmailService compraEmailService;

    // ?filtro=activos (por defecto), todos, o un estado (RECIBIDO, PREPARANDO, ...)
    @GetMapping
    public List<Map<String, Object>> listar(@RequestParam(required = false) String filtro) {
        return pedidoService.listar(filtro);
    }

    @GetMapping("/resumen")
    public Map<String, Object> resumen() {
        return pedidoService.resumen();
    }

    // Body: { "estado": "PREPARANDO", "usuarioId": 1, "nota": "opcional" }
    @PutMapping("/{id}/estado")
    public Map<String, Object> cambiarEstado(@PathVariable Long id, @RequestBody Map<String, Object> cuerpo) {

        EstadoPedido estado;
        try {
            estado = EstadoPedido.valueOf(String.valueOf(cuerpo.get("estado")));
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Ese estado de pedido no existe.");
        }

        Object usuario = cuerpo.get("usuarioId");
        Long usuarioId = usuario instanceof Number n ? n.longValue() : null;
        String nota = cuerpo.get("nota") != null ? String.valueOf(cuerpo.get("nota")) : null;

        Map<String, Object> pedido = pedidoService.cambiarEstado(id, estado, usuarioId, nota);

        // Al cliente le llega un mail con el estado nuevo (en segundo plano)
        compraEmailService.enviarCambioEstado(id);

        return pedido;
    }
}
