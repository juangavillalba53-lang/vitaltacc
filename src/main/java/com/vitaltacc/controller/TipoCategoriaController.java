package com.vitaltacc.controller;

import com.vitaltacc.model.TipoCategoria;
import com.vitaltacc.service.TipoCategoriaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/tipos-categoria")
@CrossOrigin(origins = "*")
public class TipoCategoriaController {

    @Autowired
    private TipoCategoriaService tipoCategoriaService;

    // Crear
    @PostMapping
    public TipoCategoria crearTipoCategoria(@RequestBody TipoCategoria tipoCategoria) {
        return tipoCategoriaService.guardarTipoCategoria(tipoCategoria);
    }

    // Listar
    @GetMapping
    public List<TipoCategoria> listarTiposCategoria() {
        return tipoCategoriaService.obtenerTiposCategoria();
    }

    // Buscar por ID
    @GetMapping("/{id}")
    public TipoCategoria obtenerPorId(@PathVariable Long id) {
        return tipoCategoriaService.obtenerPorId(id);
    }

    // Eliminar
    @DeleteMapping("/{id}")
    public void eliminar(@PathVariable Long id) {
        tipoCategoriaService.eliminarTipoCategoria(id);
    }

}