
package com.vitaltacc.repository;

import com.vitaltacc.model.Venta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VentaRepository extends JpaRepository<Venta, Long> {

    // Compras de un cliente (en el local y online), de la más nueva a la más vieja
    List<Venta> findByClienteIdOrderByIdDesc(Long clienteId);

    @Query("""
            SELECT v
            FROM Venta v
            LEFT JOIN v.cliente c
            WHERE (
                :busqueda IS NULL
                OR LOWER(CONCAT(COALESCE(c.nombre, ''), ' ', COALESCE(c.apellido, '')))
                    LIKE LOWER(CONCAT('%', :busqueda, '%'))
                OR LOWER(COALESCE(c.nombre, ''))
                    LIKE LOWER(CONCAT('%', :busqueda, '%'))
                OR LOWER(COALESCE(c.apellido, ''))
                    LIKE LOWER(CONCAT('%', :busqueda, '%'))
                OR CAST(v.id AS string) = :numeroCompra
            )
            ORDER BY v.id DESC
            """)
    List<Venta> buscarHistorial(
            @Param("busqueda") String busqueda,
            @Param("numeroCompra") String numeroCompra);
}
