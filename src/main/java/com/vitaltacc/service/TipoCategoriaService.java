package com.vitaltacc.service;

import com.vitaltacc.model.AccionAuditoria;
import com.vitaltacc.model.ModuloAuditoria;
import com.vitaltacc.service.AuditoriaService.Cambios;
import com.vitaltacc.model.TipoCategoria;
import com.vitaltacc.repository.TipoCategoriaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TipoCategoriaService {

    @Autowired
    private TipoCategoriaRepository tipoCategoriaRepository;

    @Autowired
    private AuditoriaService auditoria;

    // Crear tipo
    public TipoCategoria guardarTipoCategoria(TipoCategoria tipoCategoria) {

        if (tipoCategoria.getNombre() == null ||
                tipoCategoria.getNombre().isBlank()) {

            throw new RuntimeException("El nombre es obligatorio");
        }

        if (tipoCategoriaRepository.findByNombre(tipoCategoria.getNombre()).isPresent()) {

            throw new RuntimeException("Ya existe un tipo con ese nombre");
        }

        TipoCategoria guardado = tipoCategoriaRepository.save(tipoCategoria);

        auditoria.registrar(ModuloAuditoria.CATEGORIAS, AccionAuditoria.CREAR, guardado.getId(),
                "Creó el tipo de categoría " + AuditoriaService.comillas(guardado.getNombre()), null);

        return guardado;
    }

    // Listar
    public List<TipoCategoria> obtenerTiposCategoria() {
        return tipoCategoriaRepository.findAll();
    }

    // Buscar
    public TipoCategoria obtenerPorId(Long id) {
        return tipoCategoriaRepository.findById(id).orElse(null);
    }

    // Eliminar
    public void eliminarTipoCategoria(Long id) {

        TipoCategoria tipo = tipoCategoriaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tipo no encontrado"));

        if (tipo.getCategorias() != null && !tipo.getCategorias().isEmpty()) {

            throw new RuntimeException(
                    "No se puede eliminar un tipo que posee categorías");
        }

        tipoCategoriaRepository.delete(tipo);

        auditoria.registrar(ModuloAuditoria.CATEGORIAS, AccionAuditoria.ELIMINAR, id,
                "Eliminó el tipo de categoría " + AuditoriaService.comillas(tipo.getNombre()), null);
    }

}