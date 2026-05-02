package com.vitaltacc.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.List;

@Entity
@Table(name = "venta")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Venta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDate fecha;

    private Double total;

    private String metodoPago;

    @Enumerated(EnumType.STRING)
    private TipoVenta tipoVenta;

    // 🔥 NUEVO: cliente
    @ManyToOne
    @JoinColumn(name = "cliente_id")
    private Usuario cliente;

    @OneToMany(cascade = CascadeType.ALL)
    @JoinColumn(name = "venta_id")
    private List<DetalleVenta> detalles;
}