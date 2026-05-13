package com.vitaltacc.controller;

import com.vitaltacc.model.Lote;
import com.vitaltacc.service.LoteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/lotes")
@CrossOrigin(origins = "*")
public class LoteController {

    @Autowired
    private LoteService loteService;

    // Crear lote
    @PostMapping
    public Lote crearLote(@RequestBody Lote lote) {
        return loteService.guardarLote(lote);
    }

    // Listar todos
    @GetMapping
    public List<Lote> listarLotes() {
        return loteService.obtenerLotes();
    }

    // Lotes por producto
    @GetMapping("/producto/{productoId}")
    public List<Map<String, Object>> obtenerPorProducto(@PathVariable Long productoId) {

        return loteService.obtenerPorProducto(productoId)
                .stream()
                .map(lote -> {

                    Map<String, Object> data = new HashMap<>();

                    long diasRestantes = ChronoUnit.DAYS.between(
                            LocalDate.now(),
                            lote.getFechaVencimiento());

                    String alerta;

                    if (diasRestantes <= 7) {
                        alerta = "URGENTE";
                    } else if (diasRestantes <= 30) {
                        alerta = "ATENCION";
                    } else {
                        alerta = "OK";
                    }

                    // 🔥 ESTO FALTABA
                    data.put("id", lote.getId());

                    data.put("numeroLote", lote.getNumeroLote());
                    data.put("cantidad", lote.getCantidad());
                    data.put("fechaVencimiento", lote.getFechaVencimiento());
                    data.put("diasRestantes", diasRestantes);
                    data.put("alerta", alerta);

                    return data;

                }).toList();
    }

    // 🔥 NUEVO: Lotes por vencer
    @GetMapping("/por-vencer")
    public List<Map<String, Object>> obtenerLotesPorVencer() {

        return loteService.obtenerLotesPorVencer().stream().map(lote -> {

            Map<String, Object> data = new HashMap<>();

            long diasRestantes = ChronoUnit.DAYS.between(
                    LocalDate.now(),
                    lote.getFechaVencimiento());

            String alerta;

            if (diasRestantes <= 7) {
                alerta = "URGENTE";
            } else if (diasRestantes <= 30) {
                alerta = "ATENCION";
            } else {
                alerta = "OK";
            }

            data.put("producto", lote.getProducto().getNombre());
            data.put("numeroLote", lote.getNumeroLote());
            data.put("fechaVencimiento", lote.getFechaVencimiento());
            data.put("diasRestantes", diasRestantes);
            data.put("alerta", alerta);

            return data;

        }).toList();
    }

    // Eliminar
    @DeleteMapping("/{id}")
    public void eliminarLote(@PathVariable Long id) {
        loteService.eliminarLote(id);
    }

}