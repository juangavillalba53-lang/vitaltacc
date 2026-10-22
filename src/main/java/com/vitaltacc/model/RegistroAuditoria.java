package com.vitaltacc.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

// Un renglón de la auditoría: quién hizo qué, cuándo y qué cambió.
// El nombre y el rol se copian en el momento, así se siguen leyendo
// aunque después el usuario cambie de rol o se dé de baja.
@Entity
@Table(name = "registro_auditoria", indexes = @Index(name = "idx_auditoria_fecha", columnList = "fecha_hora"))
@Getter
@Setter
@NoArgsConstructor
public class RegistroAuditoria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "fecha_hora", nullable = false)
    private LocalDateTime fechaHora;

    // Puede quedar vacío, por ejemplo en un intento de ingreso con un email que no existe
    @ManyToOne
    @JoinColumn(name = "usuario_id")
    @JsonIgnore
    private Usuario usuario;

    @Column(name = "usuario_nombre", length = 120)
    private String usuarioNombre;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "usuario_rol", length = 20)
    private Rol usuarioRol;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 20)
    private ModuloAuditoria modulo;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 20)
    private AccionAuditoria accion;

    // Id de lo que se tocó (producto, lote, venta...)
    @Column(name = "entidad_id")
    private Long entidadId;

    // Resumen en una línea, por ejemplo: Editó el producto «Fideos»
    @Column(nullable = false, length = 300)
    private String descripcion;

    // Lo que cambió, un dato por línea: «Precio: $ 2.500,00 → $ 2.800,00»
    @Column(length = 4000)
    private String detalle;
}
