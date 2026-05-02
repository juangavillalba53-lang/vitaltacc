package com.vitaltacc.model;

import jakarta.persistence.*;
import lombok.*;

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

    private Integer cantidad;

    @Column(name = "precio_unitario")
    private Double precioUnitario;

    // Relación con producto
    @ManyToOne
    @JoinColumn(name = "producto_id")
    private Producto producto;
}