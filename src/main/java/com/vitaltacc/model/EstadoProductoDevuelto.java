package com.vitaltacc.model;

// Cómo vuelve el producto que trae el cliente
public enum EstadoProductoDevuelto {

    // En su envase original y sano: se puede volver a vender
    CERRADO,

    // Abierto, dañado o vencido: no se vuelve a vender
    ABIERTO
}
