package com.vitaltacc.repository;

import com.vitaltacc.model.AccionAuditoria;
import com.vitaltacc.model.ModuloAuditoria;
import com.vitaltacc.model.RegistroAuditoria;
import com.vitaltacc.model.Rol;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface RegistroAuditoriaRepository extends JpaRepository<RegistroAuditoria, Long> {

    // Todos los filtros son opcionales (si vienen vacíos no filtran). Del más nuevo al más viejo.
    @Query("""
            SELECT r
            FROM RegistroAuditoria r
            LEFT JOIN r.usuario u
            WHERE r.fechaHora >= :desde
              AND r.fechaHora < :hasta
              AND (:usuarioId IS NULL OR u.id = :usuarioId)
              AND (:modulo IS NULL OR r.modulo = :modulo)
              AND (:accion IS NULL OR r.accion = :accion)
              AND (r.usuarioRol IS NULL OR r.usuarioRol <> :rolCliente)
              AND (
                  :texto IS NULL
                  OR LOWER(r.descripcion) LIKE LOWER(CONCAT('%', :texto, '%'))
                  OR LOWER(COALESCE(r.detalle, '')) LIKE LOWER(CONCAT('%', :texto, '%'))
                  OR LOWER(COALESCE(r.usuarioNombre, '')) LIKE LOWER(CONCAT('%', :texto, '%'))
              )
            ORDER BY r.fechaHora DESC, r.id DESC
            """)
    Page<RegistroAuditoria> buscar(
            @Param("desde") LocalDateTime desde,
            @Param("hasta") LocalDateTime hasta,
            @Param("usuarioId") Long usuarioId,
            @Param("modulo") ModuloAuditoria modulo,
            @Param("accion") AccionAuditoria accion,
            @Param("texto") String texto,
            @Param("rolCliente") Rol rolCliente,
            Pageable pagina);
}
