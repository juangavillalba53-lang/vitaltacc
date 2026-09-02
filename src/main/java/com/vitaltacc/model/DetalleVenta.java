package com.vitaltacc.model;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonBackReference;

@Entity
@Table(name = "detalle_venta")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DetalleVenta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Integer cantidad;

    @Column(name = "precio_unitario", nullable = false)
    private Double precioUnitario;

    // Producto vendido
    @ManyToOne
    @JoinColumn(name = "producto_id", nullable = false)
    private Producto producto;

    // Lote utilizado (asignado automáticamente por FEFO)
    @ManyToOne
    @JoinColumn(name = "lote_id", nullable = false)
    private Lote lote;

    @ManyToOne
    @JoinColumn(name = "venta_id", nullable = false)
    @JsonBackReference
    private Venta venta;
}