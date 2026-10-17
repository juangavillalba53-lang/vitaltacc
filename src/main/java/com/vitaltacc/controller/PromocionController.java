package com.vitaltacc.controller;

import com.vitaltacc.model.Promocion;
import com.vitaltacc.service.PromocionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/promociones")
@CrossOrigin(origins = "*")
public class PromocionController {

    @Autowired
    private PromocionService promocionService;

    // Crear promoción
    @PostMapping
    public Promocion crearPromocion(@RequestBody Promocion promocion) {
        return promocionService.guardarPromocion(promocion);
    }

    // Listar todas
    @GetMapping
    public List<Promocion> listarPromociones() {
        return promocionService.obtenerPromociones();
    }

    // Vigentes y próximas (para el panel)
    @GetMapping("/vigentes")
    public List<Promocion> promocionesVigentesYProximas() {
        return promocionService.obtenerVigentesYProximas();
    }

    // Promociones activas hoy
    @GetMapping("/activas")
    public List<Promocion> promocionesActivas() {
        return promocionService.obtenerPromocionesActivas();
    }

    @DeleteMapping("/{id}")
    public void eliminarPromocion(@PathVariable Long id) {
        promocionService.eliminarPromocion(id);
    }
}