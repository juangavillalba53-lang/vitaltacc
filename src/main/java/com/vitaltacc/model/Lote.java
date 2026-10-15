
package com.vitaltacc.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "lote")
@Getter
@Setter
@NoArgsConstructor
public class Lote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Integer cantidad;

    @Column(name = "fecha_produccion", nullable = false)
    private LocalDate fechaProduccion;

    @Column(name = "fecha_vencimiento", nullable = false)
    private LocalDate fechaVencimiento;

    @Column(name = "numero_lote", nullable = false, unique = true)
    private String numeroLote;

    // Relación con producto
    @ManyToOne
    @JoinColumn(name = "producto_id", nullable = false)
    private Producto producto;

    @Column(name = "cantidad_inicial", nullable = false)
    private Integer cantidadInicial;

    public Lote(
            Long id,
            Integer cantidad,
            LocalDate fechaProduccion,
            LocalDate fechaVencimiento,
            String numeroLote,
            Producto producto,
            Integer cantidadInicial) {
        this.id = id;
        this.cantidad = cantidad;
        this.fechaProduccion = fechaProduccion;
        this.fechaVencimiento = fechaVencimiento;
        this.numeroLote = numeroLote;
        this.producto = producto;
        this.cantidadInicial = cantidadInicial;
    }
}
