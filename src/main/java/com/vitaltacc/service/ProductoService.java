package com.vitaltacc.service;

import com.vitaltacc.model.Categoria;
import com.vitaltacc.model.Lote;
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
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class ProductoService {

    // Carpeta donde se guardan las fotos de los productos
    public static final String CARPETA_UPLOADS =
            System.getProperty("user.dir") + "/vitaltacc/uploads/";

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

    // =========================================================
    // ALTA Y EDICIÓN
    // =========================================================

    public Producto guardarProducto(Producto producto) {
        return productoRepository.save(producto);
    }

    @Transactional
    public Producto guardarProductoConImagenes(
            Producto producto,
            Long categoriaId,
            List<MultipartFile> imagenes) {

        validarDatos(producto.getNombre(), producto.getPrecio());

        producto.setCategoria(buscarCategoria(categoriaId));
        producto.setActivo(true);

        Producto productoGuardado = productoRepository.save(producto);

        if (imagenes != null && !imagenes.isEmpty()) {
            productoGuardado.setImagenes(guardarImagenes(productoGuardado, imagenes));
        }

        return productoGuardado;
    }

    @Transactional
    public Producto editarProducto(
            Long id,
            String nombre,
            Double precio,
            String descripcion,
            Long categoriaId,
            List<MultipartFile> imagenes) {

        validarDatos(nombre, precio);

        Producto producto = obtenerPorId(id);

        producto.setNombre(nombre.trim());
        producto.setPrecio(precio);
        producto.setDescripcion(descripcion);
        producto.setCategoria(buscarCategoria(categoriaId));

        if (imagenes != null && !imagenes.isEmpty()) {
            eliminarImagenesProducto(producto);
            guardarImagenes(producto, imagenes);
        }

        return productoRepository.save(producto);
    }

    private void validarDatos(String nombre, Double precio) {
        if (nombre == null || nombre.isBlank()) {
            throw new RuntimeException("El nombre del producto es obligatorio");
        }
        if (precio == null || precio <= 0) {
            throw new RuntimeException("El precio tiene que ser mayor a 0");
        }
    }

    private Categoria buscarCategoria(Long categoriaId) {

        if (categoriaId == null) {
            throw new RuntimeException("Elegí una categoría");
        }

        Categoria categoria = categoriaRepository.findById(categoriaId)
                .orElseThrow(() -> new RuntimeException("Categoría no encontrada"));

        if (Boolean.FALSE.equals(categoria.getActivo())) {
            throw new RuntimeException("Esa categoría fue dada de baja");
        }

        return categoria;
    }

    // =========================================================
    // IMÁGENES
    // =========================================================

    // Guarda los archivos en la carpeta de uploads y registra cada imagen
    private List<ProductoImagen> guardarImagenes(
            Producto producto,
            List<MultipartFile> imagenes) {

        File carpeta = new File(CARPETA_UPLOADS);

        if (!carpeta.exists()) {
            carpeta.mkdirs();
        }

        List<ProductoImagen> listaImagenes = new ArrayList<>();

        for (MultipartFile imagen : imagenes) {

            String nombreArchivo = System.currentTimeMillis()
                    + "_"
                    + nombreSeguro(imagen.getOriginalFilename());

            try {
                imagen.transferTo(new File(CARPETA_UPLOADS + nombreArchivo));
            } catch (IOException | IllegalStateException e) {
                throw new RuntimeException("No se pudo guardar la imagen: " + e.getMessage());
            }

            ProductoImagen productoImagen = new ProductoImagen();
            productoImagen.setUrl("/uploads/" + nombreArchivo);
            productoImagen.setProducto(producto);

            listaImagenes.add(productoImagen);
        }

        return productoImagenRepository.saveAll(listaImagenes);
    }

    // Deja solo letras, números, punto, guion y guion bajo en el nombre del archivo
    private String nombreSeguro(String original) {
        String nombre = original == null ? "imagen" : new File(original).getName();
        nombre = nombre.replaceAll("[^A-Za-z0-9._-]", "_");
        return nombre.isBlank() ? "imagen" : nombre;
    }

    // Borra las imágenes anteriores (archivo y registro)
    private void eliminarImagenesProducto(Producto producto) {

        List<ProductoImagen> imagenes = productoImagenRepository.findByProductoId(producto.getId());

        if (imagenes.isEmpty()) {
            return;
        }

        for (ProductoImagen imagen : imagenes) {
            File archivo = new File(System.getProperty("user.dir") + "/vitaltacc" + imagen.getUrl());
            if (archivo.exists()) {
                archivo.delete();
            }
        }

        productoImagenRepository.deleteAll(imagenes);
    }

    // =========================================================
    // CONSULTAS
    // =========================================================

    // Productos activos (los dados de baja no se muestran en ningún lado)
    public List<Producto> obtenerProductos() {
        return productoRepository.findAll()
                .stream()
                .filter(p -> !Boolean.FALSE.equals(p.getActivo()))
                .toList();
    }

    public Producto obtenerPorId(Long id) {
        return productoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado"));
    }

    // =========================================================
    // BAJA
    // =========================================================

    // Baja lógica: el producto deja de verse, pero sus ventas y lotes quedan guardados.
    // Sus promociones también se dan de baja.
    @Transactional
    public void eliminarProducto(Long id) {

        Producto producto = obtenerPorId(id);

        producto.setActivo(false);
        productoRepository.save(producto);

        promocionRepository.findAll().stream()
                .filter(promo -> promo.getProducto() != null
                        && id.equals(promo.getProducto().getId())
                        && !Boolean.FALSE.equals(promo.getActivo()))
                .forEach(promo -> {
                    promo.setActivo(false);
                    promocionRepository.save(promo);
                });
    }

    // =========================================================
    // PRECIO Y STOCK
    // =========================================================

    public Producto actualizarPrecio(Long id, Double precio) {

        if (precio == null || precio <= 0) {
            throw new RuntimeException("El precio tiene que ser mayor a 0");
        }

        Producto producto = obtenerPorId(id);
        producto.setPrecio(precio);

        return productoRepository.save(producto);
    }

    public Producto actualizarDescripcion(Long id, String descripcion) {

        Producto producto = obtenerPorId(id);
        producto.setDescripcion(descripcion);

        return productoRepository.save(producto);
    }

    // Promociones vigentes hoy (sin las dadas de baja)
    public List<Promocion> promocionesVigentesHoy() {

        LocalDate hoy = LocalDate.now();

        return promocionRepository
                .findByFechaInicioLessThanEqualAndFechaFinGreaterThanEqual(hoy, hoy)
                .stream()
                .filter(promo -> !Boolean.FALSE.equals(promo.getActivo()))
                .toList();
    }

    // Precio con la promoción que corresponda (null si no hay promoción)
    public Double calcularPrecioConDescuento(Producto producto) {
        return calcularPrecioConDescuento(producto, promocionesVigentesHoy());
    }

    // Igual que el anterior, pero con las promociones ya cargadas
    // (para no consultar la base una vez por cada producto del listado)
    public Double calcularPrecioConDescuento(Producto producto, List<Promocion> promociones) {

        Double precioOriginal = producto.getPrecio();

        if (precioOriginal == null || precioOriginal <= 0) {
            return null;
        }

        // Primero una promoción específica del producto; si no hay, una global
        Promocion promocionAplicable = promociones.stream()
                .filter(promo -> promo.getProducto() != null
                        && promo.getProducto().getId().equals(producto.getId()))
                .findFirst()
                .orElseGet(() -> promociones.stream()
                        .filter(promo -> promo.getProducto() == null)
                        .findFirst()
                        .orElse(null));

        if (promocionAplicable == null || promocionAplicable.getDescuento() == null) {
            return null;
        }

        double descuento = promocionAplicable.getDescuento();

        return precioOriginal - (precioOriginal * descuento / 100);
    }

    // Stock = unidades de los lotes que no están vencidos
    public Integer calcularStock(Producto producto) {

        LocalDate hoy = LocalDate.now();

        return loteRepository.findByProductoId(producto.getId())
                .stream()
                .filter(lote -> !lote.getFechaVencimiento().isBefore(hoy))
                .mapToInt(Lote::getCantidad)
                .sum();
    }
}
