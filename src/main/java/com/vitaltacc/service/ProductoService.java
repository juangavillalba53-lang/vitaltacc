package com.vitaltacc.service;

import com.vitaltacc.model.AccionAuditoria;
import com.vitaltacc.model.Categoria;
import com.vitaltacc.model.Lote;
import com.vitaltacc.model.ModuloAuditoria;
import com.vitaltacc.model.Producto;
import com.vitaltacc.model.ProductoImagen;
import com.vitaltacc.model.Promocion;
import com.vitaltacc.repository.CategoriaRepository;
import com.vitaltacc.repository.LoteRepository;
import com.vitaltacc.repository.ProductoRepository;
import com.vitaltacc.repository.PromocionRepository;
import com.vitaltacc.service.AuditoriaService.Cambios;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

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
    private CategoriaRepository categoriaRepository;

    @Autowired
    private AuditoriaService auditoria;

    // =========================================================
    // ALTA Y EDICIÓN
    // =========================================================

    // Máximo de fotos por producto
    public static final int MAXIMO_IMAGENES = 8;

    public Producto guardarProducto(Producto producto) {
        return productoRepository.save(producto);
    }

    @Transactional
    public Producto guardarProductoConImagenes(
            Producto producto,
            Long categoriaId,
            List<MultipartFile> imagenes) {

        validarDatos(producto.getNombre(), producto.getPrecio());

        List<MultipartFile> archivos = soloConContenido(imagenes);
        validarArchivos(archivos, archivos.size());

        producto.setCategoria(buscarCategoria(categoriaId));
        producto.setActivo(true);
        producto.setImagenes(new ArrayList<>());

        // Se guardan en el orden en que llegan: la primera es la principal
        for (MultipartFile archivo : archivos) {
            agregarImagen(producto, archivo, producto.getImagenes().size());
        }

        Producto guardado = productoRepository.save(producto);

        auditoria.registrar(ModuloAuditoria.PRODUCTOS, AccionAuditoria.CREAR, guardado.getId(),
                "Agregó el producto " + AuditoriaService.comillas(guardado.getNombre()),
                new Cambios()
                        .dato("Precio", AuditoriaService.pesos(guardado.getPrecio()))
                        .dato("Categoría", nombreCategoria(guardado))
                        .dato("Descripción", guardado.getDescripcion())
                        .dato("Fotos", guardado.getImagenes().size()));

        return guardado;
    }

    private static String nombreCategoria(Producto producto) {
        return producto.getCategoria() != null ? producto.getCategoria().getNombre() : null;
    }

    // Ids de las fotos en el orden en que se muestran
    private static List<Long> idsDeFotos(Producto producto) {
        if (producto.getImagenes() == null) return List.of();
        return producto.getImagenes().stream()
                .sorted(java.util.Comparator.comparing(
                        (ProductoImagen i) -> i.getOrden() == null ? Integer.MAX_VALUE : i.getOrden())
                        .thenComparing(i -> i.getId() == null ? Long.MAX_VALUE : i.getId()))
                .map(ProductoImagen::getId)
                .toList();
    }

    /**
     * Edita los datos del producto y su galería.
     *
     * "orden" dice cómo queda la galería, separado por comas:
     *   e15 = la imagen ya guardada con id 15
     *   n0  = la primera imagen nueva que viene en "imagenes", n1 la segunda...
     * Las imágenes guardadas que no aparecen en "orden" se borran.
     * Si "orden" no viene, las imágenes no se tocan.
     */
    @Transactional
    public Producto editarProducto(
            Long id,
            String nombre,
            Double precio,
            String descripcion,
            Long categoriaId,
            List<MultipartFile> imagenes,
            String orden) {

        validarDatos(nombre, precio);

        Producto producto = obtenerPorId(id);

        // Cómo estaba antes, para la auditoría
        String nombreAntes = producto.getNombre();
        Double precioAntes = producto.getPrecio();
        String descripcionAntes = producto.getDescripcion();
        String categoriaAntes = nombreCategoria(producto);
        List<Long> fotosAntes = new ArrayList<>(idsDeFotos(producto));

        producto.setNombre(nombre.trim());
        producto.setPrecio(precio);
        producto.setDescripcion(descripcion);
        producto.setCategoria(buscarCategoria(categoriaId));

        if (orden != null) {
            acomodarImagenes(producto, orden, soloConContenido(imagenes));
        }

        Producto guardado = productoRepository.save(producto);

        Cambios cambios = new Cambios()
                .campo("Nombre", nombreAntes, guardado.getNombre())
                .pesos("Precio", precioAntes, guardado.getPrecio())
                .campo("Descripción", descripcionAntes, guardado.getDescripcion())
                .campo("Categoría", categoriaAntes, nombreCategoria(guardado));

        List<Long> fotosDespues = idsDeFotos(guardado);
        long quitadas = fotosAntes.stream().filter(f -> !fotosDespues.contains(f)).count();
        long agregadas = fotosDespues.stream().filter(f -> !fotosAntes.contains(f)).count();
        List<Long> quedaronAntes = fotosAntes.stream().filter(fotosDespues::contains).toList();
        List<Long> quedaronDespues = fotosDespues.stream().filter(fotosAntes::contains).toList();

        if (agregadas > 0) cambios.linea("Fotos: se agregó" + (agregadas == 1 ? " 1" : "ron " + agregadas));
        if (quitadas > 0) cambios.linea("Fotos: se quitó" + (quitadas == 1 ? " 1" : "ron " + quitadas));
        if (!quedaronAntes.equals(quedaronDespues)) cambios.linea("Fotos: se cambió el orden");
        if (cambios.vacio()) cambios.linea("Se guardó sin cambios");

        auditoria.registrar(ModuloAuditoria.PRODUCTOS, AccionAuditoria.MODIFICAR, guardado.getId(),
                "Editó el producto " + AuditoriaService.comillas(guardado.getNombre()), cambios);

        return guardado;
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

    private void acomodarImagenes(Producto producto, String orden, List<MultipartFile> nuevas) {

        if (producto.getImagenes() == null) {
            producto.setImagenes(new ArrayList<>());
        }

        List<ProductoImagen> actuales = producto.getImagenes();
        Map<Long, ProductoImagen> guardadas = new HashMap<>();
        actuales.forEach(imagen -> guardadas.put(imagen.getId(), imagen));

        // 1. Leer el orden pedido y validar antes de tocar nada
        List<String> pasos = Arrays.stream(orden.split(","))
                .map(String::trim)
                .filter(paso -> !paso.isEmpty())
                .distinct()
                .toList();

        if (pasos.size() > MAXIMO_IMAGENES) {
            throw new RuntimeException("Se pueden cargar hasta " + MAXIMO_IMAGENES + " imágenes por producto.");
        }

        for (String paso : pasos) {
            int numero = numeroDePaso(paso);
            boolean valido = paso.startsWith("e")
                    ? guardadas.containsKey((long) numero)
                    : paso.startsWith("n") && numero < nuevas.size();
            if (!valido) {
                throw new RuntimeException("El orden de las imágenes no es válido. Volvé a abrir el producto.");
            }
        }

        validarArchivos(nuevas, pasos.size());

        // 2. Sacar las que ya no están (el archivo se borra cuando se confirma el cambio)
        List<ProductoImagen> quitadas = actuales.stream()
                .filter(imagen -> !pasos.contains("e" + imagen.getId()))
                .toList();

        actuales.removeAll(quitadas);
        borrarArchivosAlConfirmar(quitadas);

        // 3. Numerar las que quedan y sumar las nuevas en su lugar
        for (int posicion = 0; posicion < pasos.size(); posicion++) {
            String paso = pasos.get(posicion);
            int numero = numeroDePaso(paso);

            if (paso.startsWith("e")) {
                guardadas.get((long) numero).setOrden(posicion);
            } else {
                agregarImagen(producto, nuevas.get(numero), posicion);
            }
        }
    }

    private int numeroDePaso(String paso) {
        try {
            return Integer.parseInt(paso.substring(1));
        } catch (NumberFormatException | IndexOutOfBoundsException e) {
            throw new RuntimeException("El orden de las imágenes no es válido. Volvé a abrir el producto.");
        }
    }

    private List<MultipartFile> soloConContenido(List<MultipartFile> imagenes) {
        if (imagenes == null) {
            return List.of();
        }
        return imagenes.stream().filter(imagen -> imagen != null && !imagen.isEmpty()).toList();
    }

    private void validarArchivos(List<MultipartFile> archivos, int totalFinal) {

        if (totalFinal > MAXIMO_IMAGENES) {
            throw new RuntimeException("Se pueden cargar hasta " + MAXIMO_IMAGENES + " imágenes por producto.");
        }

        for (MultipartFile archivo : archivos) {
            String tipo = archivo.getContentType();
            if (tipo == null || !tipo.startsWith("image/")) {
                throw new RuntimeException("«" + archivo.getOriginalFilename() + "» no es una imagen.");
            }
        }
    }

    // Guarda el archivo en la carpeta de uploads y lo suma a la galería del producto
    private void agregarImagen(Producto producto, MultipartFile archivo, int orden) {

        File carpeta = new File(CARPETA_UPLOADS);

        if (!carpeta.exists()) {
            carpeta.mkdirs();
        }

        String nombreArchivo = System.currentTimeMillis()
                + "_" + UUID.randomUUID().toString().substring(0, 8)
                + "_" + nombreSeguro(archivo.getOriginalFilename());

        try {
            archivo.transferTo(new File(CARPETA_UPLOADS + nombreArchivo));
        } catch (IOException | IllegalStateException e) {
            throw new RuntimeException("No se pudo guardar la imagen: " + e.getMessage());
        }

        ProductoImagen imagen = new ProductoImagen();
        imagen.setUrl("/uploads/" + nombreArchivo);
        imagen.setProducto(producto);
        imagen.setOrden(orden);

        producto.getImagenes().add(imagen);
    }

    // Deja solo letras, números, punto, guion y guion bajo en el nombre del archivo
    private String nombreSeguro(String original) {
        String nombre = original == null ? "imagen" : new File(original).getName();
        nombre = nombre.replaceAll("[^A-Za-z0-9._-]", "_");
        return nombre.isBlank() ? "imagen" : nombre;
    }

    // Los archivos se borran recién cuando el cambio quedó guardado en la base
    private void borrarArchivosAlConfirmar(List<ProductoImagen> imagenes) {

        if (imagenes.isEmpty()) {
            return;
        }

        List<File> archivos = imagenes.stream()
                .map(imagen -> new File(System.getProperty("user.dir") + "/vitaltacc" + imagen.getUrl()))
                .toList();

        Runnable borrar = () -> archivos.forEach(archivo -> {
            if (archivo.exists()) {
                archivo.delete();
            }
        });

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    borrar.run();
                }
            });
        } else {
            borrar.run();
        }
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

        List<Promocion> promociones = promocionRepository.findAll().stream()
                .filter(promo -> promo.getProducto() != null
                        && id.equals(promo.getProducto().getId())
                        && !Boolean.FALSE.equals(promo.getActivo()))
                .toList();

        promociones.forEach(promo -> {
            promo.setActivo(false);
            promocionRepository.save(promo);
        });

        auditoria.registrar(ModuloAuditoria.PRODUCTOS, AccionAuditoria.ELIMINAR, id,
                "Dio de baja el producto " + AuditoriaService.comillas(producto.getNombre()),
                new Cambios()
                        .dato("Precio", AuditoriaService.pesos(producto.getPrecio()))
                        .dato("Categoría", nombreCategoria(producto))
                        .linea(promociones.isEmpty() ? null
                                : "También se dio de baja " + (promociones.size() == 1
                                        ? "1 promoción" : promociones.size() + " promociones")));
    }

    // =========================================================
    // PRECIO Y STOCK
    // =========================================================

    public Producto actualizarPrecio(Long id, Double precio) {

        if (precio == null || precio <= 0) {
            throw new RuntimeException("El precio tiene que ser mayor a 0");
        }

        Producto producto = obtenerPorId(id);
        Double antes = producto.getPrecio();
        producto.setPrecio(precio);

        Producto guardado = productoRepository.save(producto);

        auditoria.registrar(ModuloAuditoria.PRODUCTOS, AccionAuditoria.MODIFICAR, id,
                "Cambió el precio de " + AuditoriaService.comillas(producto.getNombre()),
                new Cambios().pesos("Precio", antes, precio));

        return guardado;
    }

    public Producto actualizarDescripcion(Long id, String descripcion) {

        Producto producto = obtenerPorId(id);
        String antes = producto.getDescripcion();
        producto.setDescripcion(descripcion);

        Producto guardado = productoRepository.save(producto);

        auditoria.registrar(ModuloAuditoria.PRODUCTOS, AccionAuditoria.MODIFICAR, id,
                "Cambió la descripción de " + AuditoriaService.comillas(producto.getNombre()),
                new Cambios().campo("Descripción", antes, descripcion));

        return guardado;
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
