
package com.vitaltacc.controller;

import com.vitaltacc.model.ConfiguracionNegocio;
import com.vitaltacc.service.ConfiguracionNegocioService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/configuracion")
@CrossOrigin(origins = "*")
public class ConfiguracionNegocioController {

    private final ConfiguracionNegocioService configuracionService;

    public ConfiguracionNegocioController(
            ConfiguracionNegocioService configuracionService) {
        this.configuracionService = configuracionService;
    }

    @GetMapping
    public ResponseEntity<ConfiguracionNegocio> obtenerConfiguracion() {
        return ResponseEntity.ok(
                configuracionService.obtenerConfiguracion());
    }

    @PutMapping
    public ResponseEntity<ConfiguracionNegocio> guardarConfiguracion(
            @RequestBody ConfiguracionNegocio datos) {

        return ResponseEntity.ok(
                configuracionService.guardarConfiguracion(datos));
    }
}
