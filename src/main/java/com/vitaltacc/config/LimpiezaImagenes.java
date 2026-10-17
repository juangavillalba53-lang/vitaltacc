package com.vitaltacc.config;

import com.vitaltacc.model.ProductoImagen;
import com.vitaltacc.repository.ProductoImagenRepository;
import com.vitaltacc.service.ProductoService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.io.File;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Al arrancar el backend, borra de la carpeta de uploads las fotos que
 * ya no usa ningún producto (por ejemplo, de productos borrados en pruebas).
 *
 * Las fotos de productos dados de baja NO se borran: siguen guardadas
 * en la base, así que se consideran en uso.
 */
@Component
public class LimpiezaImagenes implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(LimpiezaImagenes.class);

    private final ProductoImagenRepository productoImagenRepository;

    public LimpiezaImagenes(ProductoImagenRepository productoImagenRepository) {
        this.productoImagenRepository = productoImagenRepository;
    }

    @Override
    public void run(ApplicationArguments args) {

        File carpeta = new File(ProductoService.CARPETA_UPLOADS);
        File[] archivos = carpeta.listFiles(File::isFile);

        if (archivos == null || archivos.length == 0) {
            return;
        }

        try {
            // Nombres de archivo que figuran en la base, por ejemplo "1784932561258_negro.jpg"
            Set<String> enUso = productoImagenRepository.findAll()
                    .stream()
                    .map(ProductoImagen::getUrl)
                    .filter(url -> url != null && !url.isBlank())
                    .map(url -> url.substring(url.lastIndexOf('/') + 1))
                    .collect(Collectors.toSet());

            // Por seguridad: si la base no tiene ninguna foto registrada (por ejemplo,
            // una base nueva o vacía), no se borra nada.
            if (enUso.isEmpty()) {
                return;
            }

            int borradas = 0;
            long liberado = 0;

            for (File archivo : archivos) {
                if (!enUso.contains(archivo.getName())) {
                    long tamanio = archivo.length();
                    if (archivo.delete()) {
                        borradas++;
                        liberado += tamanio;
                    }
                }
            }

            if (borradas > 0) {
                log.info("Limpieza de fotos: se borraron {} sin usar ({} KB liberados).",
                        borradas, liberado / 1024);
            }

        } catch (Exception e) {
            // Si algo falla no se borra nada y el backend arranca igual
            log.warn("No se pudo revisar la carpeta de fotos: {}", e.getMessage());
        }
    }
}
