package com.vitaltacc.model;

public enum MetodoPago {

    EFECTIVO("Efectivo"),
    TRANSFERENCIA("Transferencia"),
    TARJETA_DEBITO("Tarjeta de débito"),
    TARJETA_CREDITO("Tarjeta de crédito"),
    MERCADO_PAGO("Mercado Pago"),
    MODO("MODO");

    // Cómo se muestra en el comprobante y en los mails
    private final String nombre;

    MetodoPago(String nombre) {
        this.nombre = nombre;
    }

    public String getNombre() {
        return nombre;
    }

}
