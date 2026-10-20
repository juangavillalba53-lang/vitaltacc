package com.vitaltacc.model;

import java.util.List;

/**
 * Estados de un pedido online, en orden:
 *
 *   RECIBIDO → PREPARANDO → LISTO_PARA_RETIRAR (retiro) → ENTREGADO
 *                         → ENVIADO (envío)            → ENTREGADO
 *
 * Se puede CANCELAR mientras no salió del local (hasta "listo para retirar");
 * al cancelar, las unidades vuelven al stock.
 */
public enum EstadoPedido {

    RECIBIDO("Recibido", "Recibimos tu pedido."),
    PREPARANDO("En preparación", "Ya estamos preparando tu pedido."),
    LISTO_PARA_RETIRAR("Listo para retirar", "Tu pedido está listo: ya podés pasar a buscarlo."),
    ENVIADO("Enviado", "Tu pedido ya salió para tu domicilio."),
    ENTREGADO("Entregado", "Tu pedido fue entregado. ¡Gracias por elegirnos!"),
    CANCELADO("Cancelado", "Tu pedido fue cancelado.");

    private final String nombre;
    private final String mensaje;

    EstadoPedido(String nombre, String mensaje) {
        this.nombre = nombre;
        this.mensaje = mensaje;
    }

    public String getNombre() {
        return nombre;
    }

    // Lo que se le cuenta al cliente (en el mail y en Mis compras)
    public String getMensaje() {
        return mensaje;
    }

    public boolean esFinal() {
        return this == ENTREGADO || this == CANCELADO;
    }

    // A qué estado puede pasar (sin contar cancelar)
    public EstadoPedido siguiente(FormaEntrega entrega) {
        return switch (this) {
            case RECIBIDO -> PREPARANDO;
            case PREPARANDO -> entrega == FormaEntrega.ENVIO ? ENVIADO : LISTO_PARA_RETIRAR;
            case LISTO_PARA_RETIRAR, ENVIADO -> ENTREGADO;
            default -> null;
        };
    }

    // Una vez que el pedido salió del local ya no se cancela (si vuelve, es una devolución)
    public boolean sePuedeCancelar() {
        return this == RECIBIDO || this == PREPARANDO || this == LISTO_PARA_RETIRAR;
    }

    // Los pasos que ve el cliente según cómo lo recibe
    public static List<EstadoPedido> recorrido(FormaEntrega entrega) {
        return entrega == FormaEntrega.ENVIO
                ? List.of(RECIBIDO, PREPARANDO, ENVIADO, ENTREGADO)
                : List.of(RECIBIDO, PREPARANDO, LISTO_PARA_RETIRAR, ENTREGADO);
    }
}
