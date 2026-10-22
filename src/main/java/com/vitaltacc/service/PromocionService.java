package com.vitaltacc.service;

import com.vitaltacc.model.AccionAuditoria;
import com.vitaltacc.model.ModuloAuditoria;
import com.vitaltacc.service.AuditoriaService.Cambios;
import com.vitaltacc.model.Producto;
import com.vitaltacc.model.Promocion;
import com.vitaltacc.repository.ProductoRepository;
import com.vitaltacc.repository.PromocionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

@Service
public class PromocionService {

    @Autowired
    private PromocionRepository promocionRepository;

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private AuditoriaService auditoria;

    private static String aplicaA(Promocion promo) {
        return promo.getProducto() != null ? promo.getProducto().getNombre() : "Toda la tienda";
    }

    private static Cambios datos(Promocion promo) {
        return new Cambios()
                .dato("Aplica a", aplicaA(promo))
                .dato("Descuento", (promo.getDescuento() % 1 == 0
                        ? String.valueOf(promo.getDescuento().intValue())
                        : String.valueOf(promo.getDescuento())) + " %")
                .dato("Vigencia", AuditoriaService.fecha(promo.getFechaInicio())
                        + " al " + AuditoriaService.fecha(promo.getFechaFin()));
    }

    private static boolean activa(Promocion promo) {
        return !Boolean.FALSE.equals(promo.getActivo());
    }

    // Crear promoción (con validaciones)
    public Promocion guardarPromocion(Promocion promocion) {

        if (promocion.getDescripcion() == null || promocion.getDescripcion().isBlank()) {
            throw new RuntimeException("Escribí una descripción para la promoción");
        }

        if (promocion.getDescuento() == null
                || promocion.getDescuento() <= 0
                || promocion.getDescuento() > 100) {
            throw new RuntimeException("El descuento tiene que ser entre 1 y 100 %");
        }

        if (promocion.getFechaInicio() == null || promocion.getFechaFin() == null) {
            throw new RuntimeException("Elegí la fecha de inicio y la de fin");
        }

        if (promocion.getFechaFin().isBefore(promocion.getFechaInicio())) {
            throw new RuntimeException("La fecha de fin no puede ser anterior a la de inicio");
        }

        if (promocion.getFechaFin().isBefore(LocalDate.now())) {
            throw new RuntimeException("La promoción ya terminaría antes de hoy");
        }

        if (promocion.getProducto() != null && promocion.getProducto().getId() != null) {

            Producto producto = productoRepository.findById(promocion.getProducto().getId())
                    .orElseThrow(() -> new RuntimeException("Producto no encontrado"));

            if (Boolean.FALSE.equals(producto.getActivo())) {
                throw new RuntimeException("Ese producto fue dado de baja");
            }

            promocion.setProducto(producto);
        } else {
            promocion.setProducto(null);
        }

        promocion.setDescripcion(promocion.getDescripcion().trim());
        promocion.setActivo(true);

        Promocion guardada = promocionRepository.save(promocion);

        auditoria.registrar(ModuloAuditoria.PROMOCIONES, AccionAuditoria.CREAR, guardada.getId(),
                "Creó la promoción " + AuditoriaService.comillas(guardada.getDescripcion()), datos(guardada));

        return guardada;
    }

    // Todas las que no se dieron de baja
    public List<Promocion> obtenerPromociones() {
        return promocionRepository.findAll().stream().filter(PromocionService::activa).toList();
    }

    // Vigentes hoy
    public List<Promocion> obtenerPromocionesActivas() {

        LocalDate hoy = LocalDate.now();

        return promocionRepository
                .findByFechaInicioLessThanEqualAndFechaFinGreaterThanEqual(hoy, hoy)
                .stream()
                .filter(PromocionService::activa)
                .toList();
    }

    // Vigentes y las que todavía no empezaron (las terminadas no se muestran)
    public List<Promocion> obtenerVigentesYProximas() {

        LocalDate hoy = LocalDate.now();

        return promocionRepository.findAll()
                .stream()
                .filter(PromocionService::activa)
                .filter(promo -> !promo.getFechaFin().isBefore(hoy))
                .sorted(Comparator.comparing(Promocion::getFechaInicio))
                .toList();
    }

    // Baja lógica: deja de aplicarse, pero queda guardada
    public void eliminarPromocion(Long id) {

        Promocion promocion = promocionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Promoción no encontrada"));

        promocion.setActivo(false);
        promocionRepository.save(promocion);

        auditoria.registrar(ModuloAuditoria.PROMOCIONES, AccionAuditoria.ELIMINAR, id,
                "Dio de baja la promoción " + AuditoriaService.comillas(promocion.getDescripcion()), datos(promocion));
    }
}
