package com.vitaltacc.model;

// Cómo recibe el cliente su compra online
public enum FormaEntrega {

    RETIRO("Retiro en el local"),
    ENVIO("Envío a domicilio");

    private final String nombre;

    FormaEntrega(String nombre) {
        this.nombre = nombre;
    }

    public String getNombre() {
        return nombre;
    }
}
