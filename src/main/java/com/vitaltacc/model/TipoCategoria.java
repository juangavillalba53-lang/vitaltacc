package com.vitaltacc.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonManagedReference;

@Entity
@Table(name = "tipo_categoria")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TipoCategoria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String nombre;

    @OneToMany(mappedBy = "tipoCategoria")
    @JsonManagedReference
    private List<Categoria> categorias;
}