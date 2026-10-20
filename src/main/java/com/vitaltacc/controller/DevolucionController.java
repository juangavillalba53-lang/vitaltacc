package com.vitaltacc.controller;

import com.vitaltacc.dto.DevolucionRequest;
import com.vitaltacc.service.DevolucionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

// Si algo no corresponde, el servicio lanza un error y
// GlobalExceptionHandler responde 400 con {"error": "mensaje"}
@RestController
@RequestMapping("/devoluciones")
@CrossOrigin(origins = "*")
public class DevolucionController {

    @Autowired
    private DevolucionService devolucionService;

    // Todas las devoluciones, de la más nueva a la más vieja
    @GetMapping
    public List<Map<String, Object>> listarDevoluciones() {
        return devolucionService.listar();
    }

    // Motivos con sus reglas (si se devuelve la plata y si vuelve al stock)
    @GetMapping("/motivos")
    public List<Map<String, Object>> motivos() {
        return devolucionService.motivos();
    }

    // Lo que se puede devolver de una venta: productos, unidades y plazo
    @GetMapping("/venta/{ventaId}")
    public Map<String, Object> prepararDevolucion(@PathVariable Long ventaId) {
        return devolucionService.prepararDevolucion(ventaId);
    }

    @PostMapping
    public Map<String, Object> registrarDevolucion(@RequestBody DevolucionRequest request) {
        return devolucionService.registrarDevolucion(request);
    }
}
