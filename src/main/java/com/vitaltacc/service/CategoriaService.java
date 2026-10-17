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

        if (categoria.getTipoCategoria() == null || categoria.getTipoCategoria().getId() == null) {
            throw new RuntimeException("Elegí el tipo de categoría");
        }

        TipoCategoria tipo = tipoCategoriaRepository.findById(categoria.getTipoCategoria().getId())
                .orElseThrow(() -> new RuntimeException("Tipo no encontrado"));

        String nombre = categoria.getNombre().trim();
        Categoria existente = categoriaRepository.findByNombre(nombre).orElse(null);

        if (existente != null) {

            if (!Boolean.FALSE.equals(existente.getActivo())) {
                throw new RuntimeException("Ya existe una categoría con ese nombre");
            }

            // Estaba dada de baja: se reactiva con el tipo elegido
            existente.setTipoCategoria(tipo);
            existente.setActivo(true);
            return categoriaRepository.save(existente);
        }

        categoria.setNombre(nombre);
        categoria.setTipoCategoria(tipo);
        categoria.setActivo(true);

        return categoriaRepository.save(categoria);
    }

    // Listar todas
    public List<Categoria> obtenerCategorias() {
        return categoriaRepository.findAll()
                .stream()
                .filter(c -> !Boolean.FALSE.equals(c.getActivo()))
                .toList();
    }

    // Buscar por tipo
    public List<Categoria> obtenerPorTipo(Long tipoId) {

        TipoCategoria tipo = tipoCategoriaRepository.findById(tipoId)
                .orElseThrow(() -> new RuntimeException("Tipo no encontrado"));

        return categoriaRepository.findByTipoCategoria(tipo)
                .stream()
                .filter(c -> !Boolean.FALSE.equals(c.getActivo()))
                .toList();
    }

    // Buscar por id
    public Categoria obtenerPorId(Long id) {
        return categoriaRepository.findById(id).orElse(null);
    }

    // Eliminar
    public void eliminarCategoria(Long id) {

        Categoria categoria = categoriaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Categoría no encontrada"));

        // Solo cuentan los productos activos (los dados de baja no bloquean)
        boolean tieneProductosActivos = categoria.getProductos() != null
                && categoria.getProductos().stream()
                        .anyMatch(p -> !Boolean.FALSE.equals(p.getActivo()));

        if (tieneProductosActivos) {
            throw new RuntimeException(
                    "No se puede eliminar una categoría que tiene productos. Cambiales la categoría primero.");
        }

        // Baja lógica: los productos viejos siguen apuntando a ella sin romperse
        categoria.setActivo(false);
        categoriaRepository.save(categoria);
    }

}