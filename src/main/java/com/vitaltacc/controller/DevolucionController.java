package com.vitaltacc.controller;

import com.vitaltacc.dto.DevolucionRequest;
import com.vitaltacc.model.Devolucion;
import com.vitaltacc.repository.DevolucionRepository;
import com.vitaltacc.service.DevolucionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/devoluciones")
@CrossOrigin(origins = "*")
public class DevolucionController {

    @Autowired
    private DevolucionService devolucionService;

    @Autowired
    private DevolucionRepository devolucionRepository;

    @PostMapping
    public Object registrarDevolucion(
            @RequestBody DevolucionRequest request) {

        try {

            return devolucionService.registrarDevolucion(request);

        } catch (RuntimeException e) {

            return e.getMessage();
        }
    }

    @GetMapping
    public List<Devolucion> listarDevoluciones() {

        return devolucionRepository.findAll();
    }

    @GetMapping("/ventas-disponibles")
    public List<com.vitaltacc.model.Venta> ventasDisponibles() {

        return devolucionService.obtenerVentasDevolvibles();
    }
}