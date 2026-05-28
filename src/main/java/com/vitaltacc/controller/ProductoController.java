package com.vitaltacc.controller;

import com.vitaltacc.model.Producto;
import com.vitaltacc.service.ProductoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/productos")
@CrossOrigin(origins = "*")
public class ProductoController {

    @Autowired
    private ProductoService productoService;

    // 🔥 Crear producto
    @PostMapping(consumes = "multipart/form-data")
    public Producto crearProducto(

            @RequestParam("nombre") String nombre,

            @RequestParam("precio") Double precio,

            @RequestPart(value = "imagenes", required = false) List<MultipartFile> imagenes

    ) {

        Producto producto = new Producto();

        producto.setNombre(nombre);

        producto.setPrecio(precio);

        productoService.guardarProductoConImagenes(
                producto,
                imagenes);

        return producto;
    }

    // 🔥 Listar productos (con precio final + stock)
    @GetMapping
    public List<Map<String, Object>> listarProductos() {

        return productoService.obtenerProductos().stream().map(producto -> {

            Map<String, Object> data = new HashMap<>();
            data.put("id", producto.getId());
            data.put("nombre", producto.getNombre());
            data.put("descripcion", producto.getDescripcion());
            data.put("precio", producto.getPrecio());
            data.put("precioFinal", productoService.calcularPrecioConDescuento(producto));
            data.put("stock", productoService.calcularStock(producto));
            data.put("imagenes", producto.getImagenes());

            return data;

        }).toList();
    }

    // 🔥 Obtener producto por ID
    @GetMapping("/{id}")
    public Producto obtenerProducto(@PathVariable Long id) {
        return productoService.obtenerPorId(id);
    }

    // 🔥 ACTUALIZAR PRECIO
    @PutMapping("/{id}")
    public Producto actualizarPrecio(

            @PathVariable Long id,

            @RequestBody Map<String, Object> datos) {

        Double nuevoPrecio = Double.valueOf(
                datos.get("precioOriginal").toString());

        return productoService.actualizarPrecio(
                id,
                nuevoPrecio);
    }

    // 🔥 EDITAR PRODUCTO
    @PutMapping(value = "/{id}/editar", consumes = "multipart/form-data")
    public Producto editarProducto(

            @PathVariable Long id,

            @RequestParam("descripcion") String descripcion,

            @RequestPart(value = "imagenes", required = false) List<MultipartFile> imagenes) {

        return productoService.editarProducto(
                id,
                descripcion,
                imagenes);
    }

    // 🔥 Eliminar producto
    @DeleteMapping("/{id}")
    public void eliminarProducto(@PathVariable Long id) {
        productoService.eliminarProducto(id);
    }
}