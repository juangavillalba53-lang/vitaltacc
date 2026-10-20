package com.vitaltacc.dto;

import com.vitaltacc.model.EstadoProductoDevuelto;
import com.vitaltacc.model.MotivoDevolucion;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
public class DevolucionRequest {

    private Long ventaId;
    private Long empleadoId;
    private MotivoDevolucion motivo;
    private String observacion;
    private List<Item> items = new ArrayList<>();

    // Cuántas unidades de un producto se devuelven y en qué estado
    @Getter
    @Setter
    public static class Item {
        private Long productoId;
        private Integer cantidad;
        private EstadoProductoDevuelto estado;
    }
}
