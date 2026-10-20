package com.vitaltacc.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "devolucion")
@Getter
@Setter
@NoArgsConstructor
public class Devolucion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "venta_id", nullable = false)
    private Venta venta;

    // Quién la registró en el panel
    @ManyToOne
    @JoinColumn(name = "empleado_id", nullable = false)
    private Usuario empleado;

    @Column(nullable = false)
    private LocalDate fecha;

    // Texto (no enum de la base) para poder sumar motivos sin tocar la tabla
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 30)
    private MotivoDevolucion motivo;

    // APROBADA: se devolvió plata o mercadería. RECHAZADA: no correspondía.
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 20)
    private EstadoDevolucion estado;

    private String observacion;

    // Total que se le devolvió al cliente (por el mismo medio de pago de la venta)
    @Column(name = "monto_reintegrado", columnDefinition = "DOUBLE DEFAULT 0")
    private Double montoReintegrado = 0.0;

    @OneToMany(mappedBy = "devolucion", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<DevolucionItem> items = new ArrayList<>();

    public double getMontoReintegradoSeguro() {
        return montoReintegrado != null ? montoReintegrado : 0.0;
    }
}
