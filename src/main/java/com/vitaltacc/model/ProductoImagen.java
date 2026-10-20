package com.vitaltacc.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "producto_imagen")
@Getter
@Setter
@NoArgsConstructor
public class ProductoImagen {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String url;

    @ManyToOne
    @JoinColumn(name = "producto_id")
    @JsonIgnore
    private Producto producto;

    // Posición en la galería: la 0 es la que se ve en la tienda
    private Integer orden;

    public ProductoImagen(Long id, String url, Producto producto) {
        this.id = id;
        this.url = url;
        this.producto = producto;
    }
}