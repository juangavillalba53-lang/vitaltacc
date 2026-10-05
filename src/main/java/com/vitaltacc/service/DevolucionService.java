package com.vitaltacc.service;

import com.vitaltacc.dto.DevolucionRequest;
import com.vitaltacc.model.*;
import com.vitaltacc.repository.DevolucionRepository;
import com.vitaltacc.repository.LoteRepository;
import com.vitaltacc.repository.UsuarioRepository;
import com.vitaltacc.repository.VentaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class DevolucionService {

        @Autowired
        private DevolucionRepository devolucionRepository;

        @Autowired
        private VentaRepository ventaRepository;

        @Autowired
        private UsuarioRepository usuarioRepository;

        @Autowired
        private LoteRepository loteRepository;

        public Devolucion registrarDevolucion(
                        DevolucionRequest request) {

                if (request.getVentaId() == null) {
                        throw new RuntimeException("Debe seleccionar una venta.");
                }

                if (request.getEmpleadoId() == null) {
                        throw new RuntimeException("Empleado inválido.");
                }

                if (request.getMotivo() == null) {
                        throw new RuntimeException("Debe seleccionar un motivo.");
                }

                Venta venta = ventaRepository.findById(request.getVentaId())
                                .orElseThrow(() -> new RuntimeException("Venta no encontrada"));

                if (devolucionRepository.existsByVentaId(venta.getId())) {

                        throw new RuntimeException(
                                        "Esta venta ya tiene una devolución registrada");
                }

                Usuario empleado = usuarioRepository.findById(
                                request.getEmpleadoId())
                                .orElseThrow(() -> new RuntimeException("Empleado no encontrado"));

                if (venta.getFecha()
                                .plusDays(2)
                                .isBefore(LocalDate.now())) {

                        throw new RuntimeException(
                                        "La devolución supera el plazo permitido de 48 horas.");
                }

                Devolucion devolucion = new Devolucion();

                devolucion.setVenta(venta);
                devolucion.setEmpleado(empleado);
                devolucion.setFecha(LocalDate.now());
                devolucion.setMotivo(request.getMotivo());
                devolucion.setObservacion(request.getObservacion());

                if (request.getMotivo() == MotivoDevolucion.ERROR_ENTREGA) {

                        devolucion.setEstado(
                                        EstadoDevolucion.APROBADA);

                        for (DetalleVenta detalle : venta.getDetalles()) {

                                Lote lote = detalle.getLote();

                                lote.setCantidad(
                                                lote.getCantidad() + detalle.getCantidad());

                                loteRepository.save(lote);
                        }

                } else if (request.getMotivo() == MotivoDevolucion.PRODUCTO_DEFECTUOSO) {

                        devolucion.setEstado(
                                        EstadoDevolucion.APROBADA);

                } else {

                        devolucion.setEstado(
                                        EstadoDevolucion.RECHAZADA);
                }

                return devolucionRepository.save(devolucion);
        }

        public List<Venta> obtenerVentasDevolvibles() {

                LocalDate limite = LocalDate.now().minusDays(2);

                return ventaRepository.findAll().stream()
                                .filter(v -> v.getFecha() != null)
                                .filter(v -> !v.getFecha().isBefore(limite))
                                .toList();
        }
}