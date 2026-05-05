package com.vitaltacc.service;

import com.vitaltacc.model.Producto;
import com.vitaltacc.model.Promocion;
import com.vitaltacc.repository.ProductoRepository;
import com.vitaltacc.repository.PromocionRepository;
import com.vitaltacc.repository.LoteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class ProductoService {

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private PromocionRepository promocionRepository;

    @Autowired
    private LoteRepository loteRepository;

    // 🔥 Guardar producto
    public Producto guardarProducto(Producto producto) {
        return productoRepository.save(producto);
    }

    // 🔥 Listar productos
    public List<Producto> obtenerProductos() {
        return productoRepository.findAll();
    }

    // 🔥 Buscar por ID
    public Producto obtenerPorId(Long id) {
        return productoRepository.findById(id).orElse(null);
    }

    // 🔥 Eliminar producto
    public void eliminarProducto(Long id) {
        productoRepository.deleteById(id);
    }

    // 🔥 ACTUALIZAR PRECIO (🔥 ESTE ES EL NUEVO)
    public Producto actualizarPrecio(Long id, Double precio) {

        Producto producto = productoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado"));

        producto.setPrecio(precio);

        return productoRepository.save(producto);
    }

    // 🔥 Calcular precio con descuento
    public Double calcularPrecioConDescuento(Producto producto) {

        Double precioOriginal = producto.getPrecio();
        Double precio = precioOriginal;

        LocalDate hoy = LocalDate.now();

        List<Promocion> promociones = promocionRepository
                .findByFechaInicioLessThanEqualAndFechaFinGreaterThanEqual(hoy, hoy);

        for (Promocion promo : promociones) {

            // Promoción global
            if (promo.getProducto() == null) {
                precio = precio - (precio * promo.getDescuento() / 100);
            }

            // Promoción por producto
            else if (promo.getProducto().getId().equals(producto.getId())) {
                precio = precio - (precio * promo.getDescuento() / 100);
            }
        }

        // 🔥 Si no cambió el precio → no hay descuento
        if (precio.equals(precioOriginal)) {
            return null;
        }

        return precio;
    }

    // 🔥 Calcular stock total del producto
    public Integer calcularStock(Producto producto) {

        return loteRepository.findByProductoId(producto.getId())
                .stream()
                .mapToInt(lote -> lote.getCantidad())
                .sum();
    }
}