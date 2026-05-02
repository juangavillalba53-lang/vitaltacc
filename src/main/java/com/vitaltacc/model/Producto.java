package com.vitaltacc.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "producto")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Producto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nombre;

    private String descripcion;

    private Double precio;

    @Column(name = "stock_minimo")
    private Integer stockMinimo;
}
