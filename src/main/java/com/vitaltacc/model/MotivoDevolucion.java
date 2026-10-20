package com.vitaltacc.model;

/**
 * Motivos de devolución y lo que corresponde en cada caso:
 * - si se le devuelve la plata al cliente
 * - si el producto puede volver a la venta (solo si está cerrado y sano)
 */
public enum MotivoDevolucion {

    ERROR_ENTREGA(
            "Error en la entrega",
            "Se le dio o se le envió otro producto, o de más.",
            false, true),

    PRODUCTO_DEFECTUOSO(
            "Producto fallado",
            "Envase roto, mal cerrado o con algún defecto.",
            false, false),

    PRODUCTO_EN_MAL_ESTADO(
            "Vencido o en mal estado",
            "El producto llegó vencido o no estaba en condiciones.",
            false, false),

    ARREPENTIMIENTO(
            "El cliente se arrepintió",
            "Solo se acepta si el producto está cerrado y sano.",
            true, true);

    private final String nombre;
    private final String descripcion;

    // true: la plata se devuelve solo si el producto vuelve cerrado
    private final boolean reintegroSoloSiCerrado;

    // true: si vuelve cerrado, se puede vender de nuevo
    private final boolean puedeVolverAlStock;

    MotivoDevolucion(String nombre, String descripcion,
            boolean reintegroSoloSiCerrado, boolean puedeVolverAlStock) {
        this.nombre = nombre;
        this.descripcion = descripcion;
        this.reintegroSoloSiCerrado = reintegroSoloSiCerrado;
        this.puedeVolverAlStock = puedeVolverAlStock;
    }

    public String getNombre() {
        return nombre;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public boolean isReintegroSoloSiCerrado() {
        return reintegroSoloSiCerrado;
    }

    public boolean isPuedeVolverAlStock() {
        return puedeVolverAlStock;
    }

    public boolean correspondeReintegro(EstadoProductoDevuelto estado) {
        return !reintegroSoloSiCerrado || estado == EstadoProductoDevuelto.CERRADO;
    }

    public boolean vuelveAlStock(EstadoProductoDevuelto estado) {
        return puedeVolverAlStock && estado == EstadoProductoDevuelto.CERRADO;
    }
}
