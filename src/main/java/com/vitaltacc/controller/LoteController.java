package com.vitaltacc.controller;

import com.vitaltacc.model.Lote;
import com.vitaltacc.service.LoteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/lotes")
@CrossOrigin(origins = "*")
public class LoteController {

    @Autowired
    private LoteService loteService;

    // Arma la respuesta de un lote con los días que le quedan y su nivel de alerta
    private Map<String, Object> aMapa(Lote lote) {

        long dias = LoteService.diasRestantes(lote);

        Map<String, Object> data = new HashMap<>();
        data.put("id", lote.getId());
        data.put("productoId", lote.getProducto().getId());
        data.put("producto", lote.getProducto().getNombre());
        data.put("numeroLote", lote.getNumeroLote());
        data.put("cantidad", lote.getCantidad());
        data.put("fechaVencimiento", lote.getFechaVencimiento());
        data.put("diasRestantes", dias);
        data.put("alerta", LoteService.nivelAlerta(dias));
        return data;
    }

    // Crear lote
    @PostMapping
    public Lote crearLote(@RequestBody Lote lote) {
        return loteService.guardarLote(lote);
    }

    // Listar todos (de productos activos)
    @GetMapping
    public List<Lote> listarLotes() {
        return loteService.obtenerLotes();
    }

    // Lotes con stock de un producto
    @GetMapping("/producto/{productoId}")
    public List<Map<String, Object>> obtenerPorProducto(@PathVariable Long productoId) {
        return loteService.obtenerPorProducto(productoId).stream().map(this::aMapa).toList();
    }

    // Lotes que vencen en los próximos 2 meses
    @GetMapping("/por-vencer")
    public List<Map<String, Object>> obtenerLotesPorVencer() {
        return loteService.obtenerLotesPorVencer().stream().map(this::aMapa).toList();
    }

    // Lotes vencidos con unidades: para retirar del local
    @GetMapping("/vencidos")
    public List<Map<String, Object>> obtenerLotesVencidos() {
        return loteService.obtenerLotesVencidos().stream().map(this::aMapa).toList();
    }

    // Retirar un lote vencido (queda en 0 unidades)
    @PutMapping("/{id}/retirar")
    public Map<String, Object> retirarLote(@PathVariable Long id) {
        return aMapa(loteService.retirarLote(id));
    }

    // Eliminar (solo si nunca se vendió)
    @DeleteMapping("/{id}")
    public void eliminarLote(@PathVariable Long id) {
        loteService.eliminarLote(id);
    }
}
