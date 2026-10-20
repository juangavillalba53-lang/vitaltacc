package com.vitaltacc.dto;

import java.time.LocalDate;

public record VentaHistorialDTO(
        Long id,
        LocalDate fecha,
        String cliente,
        String tipoVenta,
        String empleado,
        String rolEmpleado,
        String metodoPago,
        Double total,
        // Plata devuelta por devoluciones de esta venta
        Double devuelto,
        // Si todavía se puede registrar una devolución
        Boolean devolvible,
        // Solo compras online: en qué estado está el pedido
        String estadoPedido) {
}
