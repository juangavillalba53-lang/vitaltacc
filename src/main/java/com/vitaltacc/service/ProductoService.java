package com.vitaltacc.service;

import com.vitaltacc.model.Categoria;
import com.vitaltacc.model.Producto;
import com.vitaltacc.model.ProductoImagen;
import com.vitaltacc.model.Promocion;
import com.vitaltacc.repository.CategoriaRepository;
import com.vitaltacc.repository.LoteRepository;
import com.vitaltacc.repository.ProductoImagenRepository;
import com.vitaltacc.repository.ProductoRepository;
import com.vitaltacc.repository.PromocionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class ProductoService {

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private PromocionRepository promocionRepository;

    @Autowired
    private LoteRepository loteRepository;

    @Autowired
    private ProductoImagenRepository productoImagenRepository;

    @Autowired
    private CategoriaRepository categoriaRepository;

    // 🔥 Guardar producto
    public Producto guardarProducto(Producto producto) {
        return productoRepository.save(producto);
    }

    // 🔥 Guardar producto con imágenes y categoría
    public Producto guardarProductoConImagenes(

            Producto producto,

            Long categoriaId,

            List<MultipartFile> imagenes

    ) {

        Categoria categoria = categoriaRepository.findById(categoriaId)
                .orElseThrow(() -> new RuntimeException("Categoría no encontrada"));

        producto.setCategoria(categoria);

        Producto productoGuardado = productoRepository.save(producto);

        List<ProductoImagen> listaImagenes = new ArrayList<>();

        if (imagenes != null) {

            for (MultipartFile imagen : imagenes) {

                System.out.println("Imagen recibida: " + imagen.getOriginalFilename());

                try {

                    String nombreArchivo = System.currentTimeMillis()
                            + "_"
                            + imagen.getOriginalFilename();

                    String carpetaUploads = System.getProperty("user.dir") + "/vitaltacc/uploads/";

                    File carpeta = new File(carpetaUploads);

                    if (!carpeta.exists()) {
                        carpeta.mkdirs();
                    }

                    String ruta = carpetaUploads + nombreArchivo;

                    File destino = new File(ruta);

                    imagen.transferTo(destino);

                    ProductoImagen productoImagen = new ProductoImagen();

                    productoImagen.setUrl("/uploads/" + nombreArchivo);

                    productoImagen.setProducto(productoGuardado);

                    listaImagenes.add(productoImagen);

                } catch (Exception e) {

                    throw new RuntimeException(
                            "Error al guardar imagen: " + e.getMessage());
                }
            }

            productoImagenRepository.saveAll(listaImagenes);

            productoGuardado.setImagenes(listaImagenes);
        }

        return productoGuardado;
    }

    // 🔥 GUARDAR IMÁGENES
    private void guardarImagenes(

            Producto producto,

            List<MultipartFile> imagenes) {

        List<ProductoImagen> listaImagenes = new ArrayList<>();

        for (MultipartFile imagen : imagenes) {

            try {

                String nombreArchivo = System.currentTimeMillis()
                        + "_"
                        + imagen.getOriginalFilename();

                String carpetaUploads = System.getProperty("user.dir") + "/vitaltacc/uploads/";

                File carpeta = new File(carpetaUploads);

                if (!carpeta.exists()) {
                    carpeta.mkdirs();
                }

                String ruta = carpetaUploads + nombreArchivo;

                File destino = new File(ruta);

                imagen.transferTo(destino);

                ProductoImagen productoImagen = new ProductoImagen();

                productoImagen.setUrl("/uploads/" + nombreArchivo);

                productoImagen.setProducto(producto);

                listaImagenes.add(productoImagen);

            } catch (IOException e) {

                throw new RuntimeException("Error guardando imagen");
            }
        }

        productoImagenRepository.saveAll(listaImagenes);
    }

    // 🔥 Eliminar imágenes anteriores del producto
    private void eliminarImagenesProducto(Producto producto) {

        List<ProductoImagen> imagenes = productoImagenRepository.findByProductoId(producto.getId());

        if (imagenes.isEmpty()) {
            return;
        }

        for (ProductoImagen imagen : imagenes) {

            String rutaArchivo = System.getProperty("user.dir")
                    + "/vitaltacc"
                    + imagen.getUrl();

            File archivo = new File(rutaArchivo);

            if (archivo.exists()) {
                archivo.delete();
            }
        }

        productoImagenRepository.deleteAll(imagenes);
    }

    // 🔥 Listar productos
    public List<Producto> obtenerProductos() {
        return productoRepository.findAll();
    }

    // 🔥 Buscar por ID
    public Producto obtenerPorId(Long id) {

        return productoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado"));
    }

    // 🔥 Eliminar producto
    public void eliminarProducto(Long id) {
        productoRepository.deleteById(id);
    }

    // 🔥 Actualizar precio
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

            if (promo.getProducto() == null) {
                precio = precio - (precio * promo.getDescuento() / 100);
            } else if (promo.getProducto().getId().equals(producto.getId())) {
                precio = precio - (precio * promo.getDescuento() / 100);
            }
        }

        if (precio.equals(precioOriginal)) {
            return null;
        }

        return precio;
    }

    // 🔥 Calcular stock
    public Integer calcularStock(Producto producto) {

        return loteRepository.findByProductoId(producto.getId())
                .stream()
                .mapToInt(lote -> lote.getCantidad())
                .sum();
    }

    // 🔥 Actualizar descripción
    public Producto actualizarDescripcion(

            Long id,

            String descripcion) {

        Producto producto = productoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado"));

        producto.setDescripcion(descripcion);

        return productoRepository.save(producto);
    }

    // 🔥 Editar producto
    public Producto editarProducto(

            Long id,

            String nombre,

            Double precio,

            String descripcion,

            Long categoriaId,

            List<MultipartFile> imagenes) {

        Producto producto = productoRepository
                .findById(id)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado"));

        Categoria categoria = categoriaRepository
                .findById(categoriaId)
                .orElseThrow(() -> new RuntimeException("Categoría no encontrada"));

        producto.setNombre(nombre);
        producto.setPrecio(precio);
        producto.setDescripcion(descripcion);
        producto.setCategoria(categoria);

        if (imagenes != null && !imagenes.isEmpty()) {

            eliminarImagenesProducto(producto);

            guardarImagenes(producto, imagenes);
        }

        return productoRepository.save(producto);
    }
}