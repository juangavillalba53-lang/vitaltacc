package com.vitaltacc.controller;

import com.vitaltacc.model.Categoria;
import com.vitaltacc.service.CategoriaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/categorias")
@CrossOrigin(origins = "*")
public class CategoriaController {

    @Autowired
    private CategoriaService categoriaService;

    // Crear
    @PostMapping
    public Categoria crearCategoria(@RequestBody Categoria categoria) {
        return categoriaService.guardarCategoria(categoria);
    }

    // Listar
    @GetMapping
    public List<Categoria> listarCategorias() {
        return categoriaService.obtenerCategorias();
    }

    // Buscar por ID
    @GetMapping("/{id}")
    public Categoria obtenerPorId(@PathVariable Long id) {
        return categoriaService.obtenerPorId(id);
    }

    // Buscar por Tipo
    @GetMapping("/tipo/{id}")
    public List<Categoria> obtenerPorTipo(@PathVariable Long id) {
        return categoriaService.obtenerPorTipo(id);
    }

    // Eliminar
    @DeleteMapping("/{id}")
    public void eliminar(@PathVariable Long id) {
        categoriaService.eliminarCategoria(id);
    }

}