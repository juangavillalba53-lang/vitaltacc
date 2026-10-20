package com.vitaltacc.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "venta")
@Getter
@Setter
@NoArgsConstructor
public class Venta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDate fecha;

    @Column(nullable = false)
    private Double total = 0.0;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private MetodoPago metodoPago;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private TipoVenta tipoVenta;

    // Cliente asociado a la venta
    @ManyToOne
    @JoinColumn(name = "cliente_id")
    private Usuario cliente;

    @ManyToOne
    @JoinColumn(name = "empleado_id", nullable = true)
    private Usuario empleado;

    @OneToMany(mappedBy = "venta", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<DetalleVenta> detalles = new ArrayList<>();

    // ---------------------------------------------------------
    // Solo para compras online
    // ---------------------------------------------------------

    // En qué etapa está el pedido (las ventas del local no tienen)
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "estado_pedido", length = 25)
    private EstadoPedido estadoPedido;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "forma_entrega", length = 10)
    private FormaEntrega formaEntrega;

    // Datos para el envío a domicilio (el costo y el horario se coordinan por WhatsApp)
    @Column(name = "envio_direccion", length = 150)
    private String envioDireccion;

    @Column(name = "envio_localidad", length = 80)
    private String envioLocalidad;

    @Column(name = "envio_telefono", length = 40)
    private String envioTelefono;

    @Column(name = "envio_indicaciones", length = 250)
    private String envioIndicaciones;

    // Día en que el cliente lo recibió (desde ahí corren los 2 días para devolver)
    @Column(name = "fecha_entrega")
    private LocalDate fechaEntrega;

    @OneToMany(mappedBy = "venta", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    @JsonIgnore
    private List<CambioEstadoPedido> cambiosEstado = new ArrayList<>();

    public boolean esOnline() {
        return tipoVenta == TipoVenta.ONLINE;
    }

    // Las compras online anteriores a los estados se toman como entregadas
    public EstadoPedido estadoActual() {
        if (!esOnline()) return null;
        return estadoPedido != null ? estadoPedido : EstadoPedido.ENTREGADO;
    }

    public FormaEntrega formaEntregaActual() {
        if (!esOnline()) return null;
        return formaEntrega != null ? formaEntrega : FormaEntrega.RETIRO;
    }

    public boolean estaCancelada() {
        return estadoActual() == EstadoPedido.CANCELADO;
    }

    public Venta(
            Long id,
            LocalDate fecha,
            Double total,
            MetodoPago metodoPago,
            TipoVenta tipoVenta,
            Usuario cliente,
            Usuario empleado,
            List<DetalleVenta> detalles) {
        this.id = id;
        this.fecha = fecha;
        this.total = total;
        this.metodoPago = metodoPago;
        this.tipoVenta = tipoVenta;
        this.cliente = cliente;
        this.empleado = empleado;
        this.detalles = detalles;
    }
}