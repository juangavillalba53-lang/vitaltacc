
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
        Double total) {
}
