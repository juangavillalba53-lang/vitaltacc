package com.vitaltacc.controller;

import com.vitaltacc.model.Producto;
import com.vitaltacc.service.ProductoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/productos")
@CrossOrigin(origins = "*")
public class ProductoController {

    @Autowired
    private ProductoService productoService;

    // Crear producto
    @PostMapping
    public Producto crearProducto(@RequestBody Producto producto) {
        return productoService.guardarProducto(producto);
    }

    // 🔥 Listar productos con precio con descuento + stock
    @GetMapping
    public List<Map<String, Object>> listarProductos() {

        return productoService.obtenerProductos().stream().map(producto -> {

            Map<String, Object> data = new HashMap<>();
            data.put("id", producto.getId());
            data.put("nombre", producto.getNombre());
            data.put("descripcion", producto.getDescripcion());
            data.put("precioOriginal", producto.getPrecio());
            data.put("precioFinal", productoService.calcularPrecioConDescuento(producto));
            data.put("stock", productoService.calcularStock(producto));

            return data;

        }).toList();
    }

    // Buscar por ID
    @GetMapping("/{id}")
    public Producto obtenerProducto(@PathVariable Long id) {
        return productoService.obtenerPorId(id);
    }

    // Eliminar producto
    @DeleteMapping("/{id}")
    public void eliminarProducto(@PathVariable Long id) {
        productoService.eliminarProducto(id);
    }
}