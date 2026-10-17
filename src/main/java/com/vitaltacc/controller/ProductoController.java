package com.vitaltacc.controller;

import com.vitaltacc.model.Producto;
import com.vitaltacc.model.Promocion;
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

            @RequestParam("descripcion") String descripcion,

            // Ya no se carga desde el panel: el stock real está en los lotes
            @RequestParam(value = "stockMinimo", required = false, defaultValue = "0") Integer stockMinimo,

            @RequestParam("categoriaId") Long categoriaId,

            @RequestPart(value = "imagenes", required = false) List<MultipartFile> imagenes

    ) {

        Producto producto = new Producto();

        producto.setNombre(nombre);
        producto.setPrecio(precio);
        producto.setDescripcion(descripcion);
        producto.setStockMinimo(stockMinimo);

        return productoService.guardarProductoConImagenes(
                producto,
                categoriaId,
                imagenes);
    }

    // 🔥 Listar productos (con precio final + stock)
    @GetMapping
    public List<Map<String, Object>> listarProductos() {

        // Las promociones se buscan una sola vez para todo el listado
        List<Promocion> promociones = productoService.promocionesVigentesHoy();

        return productoService.obtenerProductos().stream().map(producto -> {

            Map<String, Object> data = new HashMap<>();
            data.put("id", producto.getId());
            data.put("nombre", producto.getNombre());
            data.put("descripcion", producto.getDescripcion());
            data.put("precio", producto.getPrecio());
            data.put("precioFinal", productoService.calcularPrecioConDescuento(producto, promociones));
            data.put("stock", productoService.calcularStock(producto));
            data.put("imagenes", producto.getImagenes());

            // Categoría para los filtros de la tienda
            data.put("categoria",
                    producto.getCategoria() != null
                            ? producto.getCategoria().getNombre()
                            : null);
            data.put("tipoCategoria",
                    producto.getCategoria() != null
                            && producto.getCategoria().getTipoCategoria() != null
                                    ? producto.getCategoria().getTipoCategoria().getNombre()
                                    : null);

            return data;

        }).toList();
    }

    // 🔥 Obtener producto por ID
    @GetMapping("/{id}")
    public Map<String, Object> obtenerProducto(@PathVariable Long id) {

        Producto producto = productoService.obtenerPorId(id);

        Map<String, Object> data = new HashMap<>();

        data.put("id", producto.getId());
        data.put("nombre", producto.getNombre());
        data.put("descripcion", producto.getDescripcion());
        data.put("precio", producto.getPrecio());
        data.put("stockMinimo", producto.getStockMinimo());
        data.put("imagenes", producto.getImagenes());
        data.put("categoria", producto.getCategoria());

        data.put(
                "tipoCategoria",
                producto.getCategoria().getTipoCategoria());

        return data;
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

            @RequestParam("nombre") String nombre,

            @RequestParam("precio") Double precio,

            @RequestParam("descripcion") String descripcion,

            @RequestParam("categoriaId") Long categoriaId,

            @RequestPart(value = "imagenes", required = false) List<MultipartFile> imagenes) {

        return productoService.editarProducto(
                id,
                nombre,
                precio,
                descripcion,
                categoriaId,
                imagenes);
    }

    // Dar de baja un producto (deja de verse, pero sus ventas quedan guardadas)
    @DeleteMapping("/{id}")
    public void eliminarProducto(@PathVariable Long id) {
        productoService.eliminarProducto(id);
    }
}