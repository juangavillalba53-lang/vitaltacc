package com.vitaltacc.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "promocion")
@Getter
@Setter
@NoArgsConstructor
public class Promocion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String descripcion;

    @Column(nullable = false)
    private Double descuento;

    @Column(name = "fecha_inicio", nullable = false)
    private LocalDate fechaInicio;

    @Column(name = "fecha_fin", nullable = false)
    private LocalDate fechaFin;

    // Opcional: promoción sobre producto
    @ManyToOne
    @JoinColumn(name = "producto_id")
    private Producto producto;

    // Baja lógica: al "eliminar" se marca como inactivo y el historial queda intacto
    @Column(nullable = false, columnDefinition = "BOOLEAN DEFAULT TRUE")
    private Boolean activo = true;

    public Promocion(
            Long id,
            String descripcion,
            Double descuento,
            LocalDate fechaInicio,
            LocalDate fechaFin,
            Producto producto) {
        this.id = id;
        this.descripcion = descripcion;
        this.descuento = descuento;
        this.fechaInicio = fechaInicio;
        this.fechaFin = fechaFin;
        this.producto = producto;
    }
}