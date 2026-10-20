package com.vitaltacc.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

// Cada vez que un pedido cambia de estado queda anotado: cuándo y quién lo cambió
@Entity
@Table(name = "cambio_estado_pedido")
@Getter
@Setter
@NoArgsConstructor
public class CambioEstadoPedido {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "venta_id", nullable = false)
    @JsonIgnore
    private Venta venta;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 25)
    private EstadoPedido estado;

    @Column(name = "fecha_hora", nullable = false)
    private LocalDateTime fechaHora;

    // Quién lo cambió (el cliente al comprar, o alguien del personal)
    @ManyToOne
    @JoinColumn(name = "usuario_id")
    @JsonIgnore
    private Usuario usuario;

    // Por ejemplo, el motivo de una cancelación
    @Column(length = 250)
    private String nota;

    public CambioEstadoPedido(Venta venta, EstadoPedido estado, Usuario usuario, String nota) {
        this.venta = venta;
        this.estado = estado;
        this.usuario = usuario;
        this.nota = nota;
        this.fechaHora = LocalDateTime.now();
    }
}
