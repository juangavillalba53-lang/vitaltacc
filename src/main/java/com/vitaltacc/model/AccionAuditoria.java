package com.vitaltacc.model;

// Qué tipo de acción se hizo
public enum AccionAuditoria {
    CREAR("Alta"),
    MODIFICAR("Modificación"),
    ELIMINAR("Baja"),
    RETIRAR("Retiro"),
    CAMBIO_ESTADO("Cambio de estado"),
    CANCELAR("Cancelación"),
    INGRESO("Ingreso"),
    INGRESO_FALLIDO("Ingreso fallido"),
    SALIDA("Cierre de sesión"),
    DESCARGA("Descarga");

    private final String nombre;

    AccionAuditoria(String nombre) {
        this.nombre = nombre;
    }

    public String getNombre() {
        return nombre;
    }
}
