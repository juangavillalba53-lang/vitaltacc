package com.vitaltacc.model;

public enum TipoVenta {

    LOCAL("Local"),
    ONLINE("Online");

    private final String nombre;

    TipoVenta(String nombre) {
        this.nombre = nombre;
    }

    public String getNombre() {
        return nombre;
    }
}
