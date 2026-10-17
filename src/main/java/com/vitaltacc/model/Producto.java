
package com.vitaltacc.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "producto")
@Getter
@Setter
@NoArgsConstructor
public class Producto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nombre;

    private String descripcion;

    @Column(nullable = false)
    private Double precio;

    // Ya no se usa en el panel (el stock real está en los lotes); se deja por compatibilidad
    @Column(name = "stock_minimo", nullable = false)
    private Integer stockMinimo = 0;

    // Baja lógica: al "eliminar" se marca como inactivo y el historial queda intacto
    @Column(nullable = false, columnDefinition = "BOOLEAN DEFAULT TRUE")
    private Boolean activo = true;

    // Relación con categoría
    @ManyToOne
    @JoinColumn(name = "categoria_id")
    private Categoria categoria;

    @OneToMany(mappedBy = "producto", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ProductoImagen> imagenes;

    @OneToMany(mappedBy = "producto", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<Lote> lotes;

    public Producto(
            Long id,
            String nombre,
            String descripcion,
            Double precio,
            Integer stockMinimo,
            Categoria categoria,
            List<ProductoImagen> imagenes,
            List<Lote> lotes) {
        this.id = id;
        this.nombre = nombre;
        this.descripcion = descripcion;
        this.precio = precio;
        this.stockMinimo = stockMinimo;
        this.categoria = categoria;
        this.imagenes = imagenes;
        this.lotes = lotes;
    }
}
