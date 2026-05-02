package com.vitaltacc.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "lote")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Lote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Integer cantidad;

    @Column(name = "fecha_produccion")
    private LocalDate fechaProduccion;

    @Column(name = "fecha_vencimiento")
    private LocalDate fechaVencimiento;

    @Column(name = "numero_lote")
    private String numeroLote;

    // Relación con producto
    @ManyToOne
    @JoinColumn(name = "producto_id")
    private Producto producto;
}