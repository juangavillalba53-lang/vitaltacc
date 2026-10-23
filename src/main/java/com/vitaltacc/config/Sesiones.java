package com.vitaltacc.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;

/**
 * SESIONES: al iniciar sesión el servidor entrega un "token" firmado.
 * El navegador lo manda en cada pedido (cabecera Authorization: Bearer ...)
 * y así el servidor sabe quién es, sin que se pueda inventar: la firma
 * se hace con una clave secreta que solo tiene el servidor (HMAC-SHA256).
 *
 * Token = base64(idUsuario.vencimiento) + "." + base64(firma)
 *
 * La clave se guarda fuera del proyecto (carpeta .vitaltacc del usuario de
 * Windows) para que no se suba a GitHub y no se pierda al reiniciar.
 */
@Component
public class Sesiones {

    private static final Logger log = LoggerFactory.getLogger(Sesiones.class);

    public static final long HORAS_DE_SESION = 24;

    private final byte[] clave;

    public Sesiones() {
        this.clave = cargarOCrearClave();
    }

    public String crear(Long usuarioId) {
        long vence = Instant.now().plusSeconds(HORAS_DE_SESION * 3600).getEpochSecond();
        String datos = usuarioId + "." + vence;
        String cuerpo = b64(datos.getBytes(StandardCharsets.UTF_8));
        return cuerpo + "." + b64(firmar(cuerpo));
    }

    // Devuelve el id del usuario si el token es válido y no venció; si no, null
    public Long usuarioDe(String token) {
        if (token == null || !token.contains(".")) return null;
        String[] partes = token.split("\\.");
        if (partes.length != 2) return null;
        try {
            byte[] firma = Base64.getUrlDecoder().decode(partes[1]);
            if (!MessageDigest.isEqual(firma, firmar(partes[0]))) return null;

            String[] datos = new String(Base64.getUrlDecoder().decode(partes[0]), StandardCharsets.UTF_8).split("\\.");
            if (datos.length != 2) return null;
            if (Instant.now().getEpochSecond() > Long.parseLong(datos[1])) return null;
            return Long.parseLong(datos[0]);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private byte[] firmar(String texto) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(clave, "HmacSHA256"));
            return mac.doFinal(texto.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo firmar la sesión", e);
        }
    }

    private static String b64(byte[] bytes) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static byte[] cargarOCrearClave() {
        Path archivo = Path.of(System.getProperty("user.home"), ".vitaltacc", "clave-sesiones");
        try {
            if (Files.exists(archivo)) {
                byte[] guardada = Base64.getDecoder().decode(Files.readString(archivo).trim());
                if (guardada.length >= 32) return guardada;
            }
            byte[] nueva = new byte[32];
            new SecureRandom().nextBytes(nueva);
            Files.createDirectories(archivo.getParent());
            Files.writeString(archivo, Base64.getEncoder().encodeToString(nueva));
            return nueva;
        } catch (IOException | IllegalArgumentException e) {
            // Si no se puede guardar, se usa una clave temporal: al reiniciar hay que volver a entrar
            log.warn("No se pudo leer ni guardar la clave de sesiones ({}). Se usa una temporal.", e.getMessage());
            byte[] temporal = new byte[32];
            new SecureRandom().nextBytes(temporal);
            return temporal;
        }
    }
}
