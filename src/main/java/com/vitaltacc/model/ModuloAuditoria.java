package com.vitaltacc.model;

// Parte del sistema donde se hizo el cambio (para filtrar la auditoría)
public enum ModuloAuditoria {
    PRODUCTOS("Productos"),
    LOTES("Lotes"),
    CATEGORIAS("Categorías"),
    PROMOCIONES("Promociones"),
    USUARIOS("Usuarios"),
    CONFIGURACION("Configuración"),
    VENTAS("Ventas"),
    DEVOLUCIONES("Devoluciones"),
    PEDIDOS("Pedidos online"),
    SESION("Sesiones");

    private final String nombre;

    ModuloAuditoria(String nombre) {
        this.nombre = nombre;
    }

    public String getNombre() {
        return nombre;
    }
}
