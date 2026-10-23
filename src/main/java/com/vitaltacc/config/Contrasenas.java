package com.vitaltacc.config;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Las contraseñas no se guardan tal cual: se guarda un "hash" (PBKDF2 con
 * SHA-256, el método que recomienda el NIST) con una sal distinta por usuario.
 * Del hash no se puede volver a la contraseña; para comprobarla se calcula
 * de nuevo con la misma sal y se comparan los resultados.
 *
 * Formato guardado: pbkdf2$iteraciones$sal$hash  (sal y hash en Base64)
 */
public final class Contrasenas {

    private static final String PREFIJO = "pbkdf2$";
    private static final int ITERACIONES = 120_000;
    private static final int LARGO_BITS = 256;
    private static final SecureRandom AZAR = new SecureRandom();

    private Contrasenas() {
    }

    public static String encriptar(String contrasena) {
        byte[] sal = new byte[16];
        AZAR.nextBytes(sal);
        byte[] hash = calcular(contrasena, sal, ITERACIONES);
        return PREFIJO + ITERACIONES + "$"
                + Base64.getEncoder().encodeToString(sal) + "$"
                + Base64.getEncoder().encodeToString(hash);
    }

    public static boolean coincide(String contrasena, String guardada) {
        if (contrasena == null || guardada == null || !estaEncriptada(guardada)) {
            return false;
        }
        String[] partes = guardada.split("\\$");
        if (partes.length != 4) {
            return false;
        }
        try {
            int iteraciones = Integer.parseInt(partes[1]);
            byte[] sal = Base64.getDecoder().decode(partes[2]);
            byte[] esperado = Base64.getDecoder().decode(partes[3]);
            // Comparación en tiempo constante (no da pistas por lo que tarda)
            return MessageDigest.isEqual(esperado, calcular(contrasena, sal, iteraciones));
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    public static boolean estaEncriptada(String guardada) {
        return guardada != null && guardada.startsWith(PREFIJO);
    }

    private static byte[] calcular(String contrasena, byte[] sal, int iteraciones) {
        try {
            PBEKeySpec spec = new PBEKeySpec(contrasena.toCharArray(), sal, iteraciones, LARGO_BITS);
            return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded();
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo procesar la contraseña", e);
        }
    }
}
