
package com.vitaltacc.service;

import com.vitaltacc.model.ConfiguracionNegocio;
import com.vitaltacc.repository.ConfiguracionNegocioRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ConfiguracionNegocioService {

    private final ConfiguracionNegocioRepository configuracionRepository;

    public ConfiguracionNegocioService(
            ConfiguracionNegocioRepository configuracionRepository) {
        this.configuracionRepository = configuracionRepository;
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

        return configuracionRepository.save(configuracion);
    }
}
