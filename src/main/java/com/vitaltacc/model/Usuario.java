package com.vitaltacc.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "usuario")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nombre;

    @Column(unique = true)
    private String email;

    private String contrasena;

    @Column(unique = true)
    private String dni;

    private String telefono;

    @Enumerated(EnumType.STRING)
    private Rol rol;
}
