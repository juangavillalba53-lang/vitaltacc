
package com.vitaltacc.service;

import com.vitaltacc.model.AccionAuditoria;
import com.vitaltacc.model.ConfiguracionNegocio;
import com.vitaltacc.model.ModuloAuditoria;
import com.vitaltacc.service.AuditoriaService.Cambios;
import com.vitaltacc.repository.ConfiguracionNegocioRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ConfiguracionNegocioService {

    private final ConfiguracionNegocioRepository configuracionRepository;
    private final AuditoriaService auditoria;

    public ConfiguracionNegocioService(
            ConfiguracionNegocioRepository configuracionRepository,
            AuditoriaService auditoria) {
        this.configuracionRepository = configuracionRepository;
        this.auditoria = auditoria;
    }

    @Transactional(readOnly = true)
    public ConfiguracionNegocio obtenerConfiguracion() {
        return configuracionRepository.findAll()
                .stream()
                .findFirst()
                .orElseGet(ConfiguracionNegocio::new);
    }

    @Transactional
    public ConfiguracionNegocio guardarConfiguracion(
            ConfiguracionNegocio datos) {

        if (datos == null) {
            throw new IllegalArgumentException(
                    "Los datos de configuración son obligatorios.");
        }

        if (datos.getNombreNegocio() == null
                || datos.getNombreNegocio().isBlank()) {
            throw new IllegalArgumentException(
                    "El nombre del negocio es obligatorio.");
        }

        ConfiguracionNegocio configuracion = configuracionRepository
                .findAll()
                .stream()
                .findFirst()
                .orElseGet(ConfiguracionNegocio::new);

        // Lo que cambia, para la auditoría (se arma antes de pisar los valores)
        Cambios cambios = new Cambios()
                .campo("Nombre del negocio", configuracion.getNombreNegocio(), datos.getNombreNegocio().trim())
                .campo("Dirección", configuracion.getDireccion(), datos.getDireccion())
                .campo("Teléfono", configuracion.getTelefono(), datos.getTelefono())
                .campo("Email", configuracion.getEmail(), datos.getEmail())
                .campo("Horario lunes", configuracion.getHorarioLunes(), datos.getHorarioLunes())
                .campo("Horario martes", configuracion.getHorarioMartes(), datos.getHorarioMartes())
                .campo("Horario miércoles", configuracion.getHorarioMiercoles(), datos.getHorarioMiercoles())
                .campo("Horario jueves", configuracion.getHorarioJueves(), datos.getHorarioJueves())
                .campo("Horario viernes", configuracion.getHorarioViernes(), datos.getHorarioViernes())
                .campo("Horario sábado", configuracion.getHorarioSabado(), datos.getHorarioSabado())
                .campo("Horario domingo", configuracion.getHorarioDomingo(), datos.getHorarioDomingo())
                .campo("Instagram", configuracion.getInstagram(), datos.getInstagram())
                .campo("WhatsApp", configuracion.getWhatsapp(), datos.getWhatsapp())
                .campo("Google Maps", configuracion.getUbicacionMaps(), datos.getUbicacionMaps());

        if (datos.getStockBajo() != null && datos.getStockBajo() >= 0) {
            cambios.campo("Aviso de stock bajo",
                    configuracion.getStockBajo() + " u.", datos.getStockBajo() + " u.");
        }

        configuracion.setNombreNegocio(
                datos.getNombreNegocio().trim());

        configuracion.setDireccion(datos.getDireccion());
        configuracion.setTelefono(datos.getTelefono());
        configuracion.setEmail(datos.getEmail());

        configuracion.setHorarioLunes(datos.getHorarioLunes());
        configuracion.setHorarioMartes(datos.getHorarioMartes());
        configuracion.setHorarioMiercoles(datos.getHorarioMiercoles());
        configuracion.setHorarioJueves(datos.getHorarioJueves());
        configuracion.setHorarioViernes(datos.getHorarioViernes());
        configuracion.setHorarioSabado(datos.getHorarioSabado());
        configuracion.setHorarioDomingo(datos.getHorarioDomingo());

        configuracion.setInstagram(datos.getInstagram());
        configuracion.setWhatsapp(datos.getWhatsapp());
        configuracion.setUbicacionMaps(datos.getUbicacionMaps());

        if (datos.getStockBajo() != null && datos.getStockBajo() >= 0) {
            configuracion.setStockBajo(datos.getStockBajo());
        }

        ConfiguracionNegocio guardada = configuracionRepository.save(configuracion);

        auditoria.registrar(ModuloAuditoria.CONFIGURACION, AccionAuditoria.MODIFICAR, guardada.getId(),
                "Modificó los datos del negocio", cambios.vacio() ? cambios.linea("Se guardó sin cambios") : cambios);

        return guardada;
    }
}
