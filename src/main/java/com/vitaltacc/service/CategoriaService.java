package com.vitaltacc.service;

import com.vitaltacc.model.Categoria;
import com.vitaltacc.model.TipoCategoria;
import com.vitaltacc.repository.CategoriaRepository;
import com.vitaltacc.repository.TipoCategoriaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CategoriaService {

    @Autowired
    private CategoriaRepository categoriaRepository;

    @Autowired
    private TipoCategoriaRepository tipoCategoriaRepository;

    // Crear categoría
    public Categoria guardarCategoria(Categoria categoria) {

        if (categoria.getNombre() == null ||
                categoria.getNombre().isBlank()) {

            throw new RuntimeException("El nombre es obligatorio");
        }

        if (categoriaRepository.findByNombre(categoria.getNombre()).isPresent()) {

            throw new RuntimeException("Ya existe una categoría con ese nombre");
        }

        Long tipoId = categoria.getTipoCategoria().getId();

        TipoCategoria tipo = tipoCategoriaRepository.findById(tipoId)
                .orElseThrow(() -> new RuntimeException("Tipo no encontrado"));

        categoria.setTipoCategoria(tipo);

        return categoriaRepository.save(categoria);
    }

    // Listar todas
    public List<Categoria> obtenerCategorias() {
        return categoriaRepository.findAll();
    }

    // Buscar por tipo
    public List<Categoria> obtenerPorTipo(Long tipoId) {

        TipoCategoria tipo = tipoCategoriaRepository.findById(tipoId)
                .orElseThrow(() -> new RuntimeException("Tipo no encontrado"));

        return categoriaRepository.findByTipoCategoria(tipo);
    }

    // Buscar por id
    public Categoria obtenerPorId(Long id) {
        return categoriaRepository.findById(id).orElse(null);
    }

    // Eliminar
    public void eliminarCategoria(Long id) {

        Categoria categoria = categoriaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Categoría no encontrada"));

        if (categoria.getProductos() != null &&
                !categoria.getProductos().isEmpty()) {

            throw new RuntimeException(
                    "No se puede eliminar una categoría con productos asociados");
        }

        categoriaRepository.delete(categoria);
    }

}