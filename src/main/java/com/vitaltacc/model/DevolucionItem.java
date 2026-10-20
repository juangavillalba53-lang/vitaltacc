package com.vitaltacc.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

// Un producto (de un lote de la venta) que el cliente devolvió
@Entity
@Table(name = "devolucion_item")
@Getter
@Setter
@NoArgsConstructor
public class DevolucionItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "devolucion_id", nullable = false)
    @JsonBackReference
    private Devolucion devolucion;

    // Renglón de la venta (producto + lote) que se devuelve
    @ManyToOne
    @JoinColumn(name = "detalle_venta_id", nullable = false)
    private DetalleVenta detalleVenta;

    @ManyToOne
    @JoinColumn(name = "producto_id", nullable = false)
    private Producto producto;

    @Column(nullable = false)
    private Integer cantidad;

    @Column(name = "precio_unitario", nullable = false)
    private Double precioUnitario;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "estado_producto", nullable = false, length = 20)
    private EstadoProductoDevuelto estadoProducto;

    // Si las unidades se sumaron otra vez al lote
    @Column(name = "vuelve_al_stock", nullable = false)
    private Boolean vuelveAlStock = false;

    // Plata que se le devuelve al cliente por este renglón (0 si no corresponde)
    @Column(nullable = false)
    private Double reintegro = 0.0;
}
