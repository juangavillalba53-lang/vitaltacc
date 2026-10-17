package com.vitaltacc.service;

import com.vitaltacc.model.DetalleVenta;
import com.vitaltacc.model.TipoVenta;
import com.vitaltacc.model.Usuario;
import com.vitaltacc.model.Venta;
import com.vitaltacc.repository.VentaRepository;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.HtmlUtils;

import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Manda por mail el comprobante en PDF de una compra.
 *
 * - Compras web: siempre, al email de la cuenta.
 * - Compras en el local: si el cliente dio un email en la caja o ya tiene
 *   uno guardado en su cuenta.
 *
 * Corre en segundo plano (@Async): la compra se confirma al instante aunque el
 * mail tarde o falle. Si el correo no está configurado (ver mail.properties),
 * simplemente no se envía y queda anotado en la consola.
 */
@Service
public class CompraEmailService {

    private static final Logger log = LoggerFactory.getLogger(CompraEmailService.class);

    private static final String TURQUESA = "#02BDB2";
    private static final String PETROLEO = "#0F3B3C";
    private static final String TINTA_2 = "#4E6362";
    private static final String LINEA = "#E1E9E7";
    private static final String FONDO = "#F3F8F7";

    private final ObjectProvider<JavaMailSender> mailSender;
    private final VentaRepository ventaRepository;
    private final VentaPdfService ventaPdfService;

    @Value("${spring.mail.username:}")
    private String usuarioMail;

    @Value("${vitaltacc.mail.remitente:VitalTacc}")
    private String nombreRemitente;

    @Value("${vitaltacc.tienda.url:http://127.0.0.1:5500}")
    private String urlTienda;

    public CompraEmailService(
            ObjectProvider<JavaMailSender> mailSender,
            VentaRepository ventaRepository,
            VentaPdfService ventaPdfService) {

        this.mailSender = mailSender;
        this.ventaRepository = ventaRepository;
        this.ventaPdfService = ventaPdfService;
    }

    /**
     * @param emailIndicado email que se cargó en la caja (solo ventas del local; puede ser null)
     */
    @Async
    @Transactional(readOnly = true)
    public void enviarComprobante(Long ventaId, String emailIndicado) {

        JavaMailSender sender = mailSender.getIfAvailable();

        if (sender == null || usuarioMail == null || usuarioMail.isBlank()) {
            log.info("Mail de la compra {} no enviado: el correo no está configurado (mail.properties).",
                    ventaId);
            return;
        }

        try {
            Venta venta = ventaRepository.findById(ventaId).orElse(null);

            if (venta == null) {
                return;
            }

            String destino = elegirDestino(venta, emailIndicado);

            if (destino == null) {
                return;
            }

            byte[] pdf = ventaPdfService.generarComprobante(ventaId);

            MimeMessage mensaje = sender.createMimeMessage();
            MimeMessageHelper ayudante = new MimeMessageHelper(mensaje, true, "UTF-8");

            ayudante.setFrom(usuarioMail, nombreRemitente);
            ayudante.setTo(destino);
            ayudante.setSubject("Tu comprobante de compra N.º " + venta.getId() + " · VitalTacc");
            ayudante.setText(textoPlano(venta), armarHtml(venta));
            ayudante.addAttachment(
                    "comprobante-vitaltacc-" + venta.getId() + ".pdf",
                    new ByteArrayResource(pdf),
                    "application/pdf");

            sender.send(mensaje);

            log.info("Comprobante de la compra {} enviado a {}", ventaId, destino);

        } catch (Exception e) {
            // Nunca rompe la compra: solo queda el aviso en la consola
            log.warn("No se pudo enviar el mail de la compra {}: {}", ventaId, e.getMessage());
        }
    }

    // En el local manda el email cargado en la caja; si no hay, el de la cuenta.
    // Los emails internos (cliente_DNI@local.com) nunca reciben nada.
    private String elegirDestino(Venta venta, String emailIndicado) {

        if (venta.getTipoVenta() == TipoVenta.LOCAL) {
            String indicado = UsuarioService.limpiarEmail(emailIndicado);
            if (indicado != null) {
                return indicado;
            }
        }

        Usuario cliente = venta.getCliente();
        String deLaCuenta = cliente != null ? UsuarioService.limpiarEmail(cliente.getEmail()) : null;

        return UsuarioService.esEmailInterno(deLaCuenta) ? null : deLaCuenta;
    }

    // -----------------------------------------------------
    // CONTENIDO DEL MAIL
    // -----------------------------------------------------

    private String armarHtml(Venta venta) {

        NumberFormat pesos = NumberFormat.getCurrencyInstance(Locale.forLanguageTag("es-AR"));

        String nombre = venta.getCliente() != null && venta.getCliente().getNombre() != null
                ? venta.getCliente().getNombre()
                : "";

        String fecha = venta.getFecha() != null
                ? venta.getFecha().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                : "";

        StringBuilder filas = new StringBuilder();

        for (Map.Entry<String, int[]> item : agrupar(venta).entrySet()) {
            String[] partes = item.getKey().split("\u0000", 2);
            double precio = Double.parseDouble(partes[1]);
            int cantidad = item.getValue()[0];

            filas.append("<tr>")
                    .append("<td style=\"padding:12px 0;border-bottom:1px solid ").append(LINEA)
                    .append(";font-size:15px;color:").append(PETROLEO).append("\">")
                    .append(esc(partes[0]))
                    .append("<br><span style=\"font-size:13px;color:").append(TINTA_2).append("\">")
                    .append(cantidad).append(" × ").append(pesos.format(precio)).append("</span></td>")
                    .append("<td align=\"right\" style=\"padding:12px 0;border-bottom:1px solid ").append(LINEA)
                    .append(";font-size:15px;font-weight:600;color:").append(PETROLEO).append(";white-space:nowrap\">")
                    .append(pesos.format(precio * cantidad))
                    .append("</td></tr>");
        }

        String total = pesos.format(venta.getTotal() != null ? venta.getTotal() : 0);
        String base = urlTienda.replaceAll("/+$", "");

        boolean enLocal = venta.getTipoVenta() == TipoVenta.LOCAL;
        boolean cuentaActiva = venta.getCliente() != null
                && !UsuarioService.esCuentaPendiente(venta.getCliente());

        String intro = enLocal
                ? "Gracias por pasar por el local. Te adjuntamos el comprobante en PDF para que lo tengas a mano."
                : "Recibimos tu pedido. Te adjuntamos el comprobante en PDF para que lo tengas a mano.";

        // Con cuenta activa: ver sus compras. Con DNI pero sin cuenta: invitarlo a crearla.
        // Consumidor final (sin DNI): solo el link a la tienda.
        String boton = venta.getCliente() == null
                ? botonMail(base + "/productos.html", "Ver la tienda online")
                : cuentaActiva
                ? botonMail(base + "/mis-compras.html", "Ver mis compras")
                : "<p style=\"margin:0 0 16px;font-size:14px;line-height:1.6;color:" + TINTA_2 + "\">"
                        + "Creá tu cuenta con tu DNI y vas a ver todas tus compras, en el local y online.</p>"
                        + botonMail(base + "/login.html#registro", "Crear mi cuenta");

        return "<!doctype html><html lang=\"es\"><head><meta charset=\"utf-8\">"
                + "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"></head>"
                + "<body style=\"margin:0;padding:0;background:" + FONDO + ";font-family:Arial,Helvetica,sans-serif\">"
                + "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:" + FONDO + ";padding:28px 12px\"><tr><td align=\"center\">"
                + "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:560px;background:#FFFFFF;border-radius:18px;overflow:hidden\">"

                // Cabecera
                + "<tr><td style=\"background:" + PETROLEO + ";padding:26px 32px\">"
                + "<span style=\"font-size:22px;font-weight:700;color:#FFFFFF;letter-spacing:.2px\">Vital<span style=\"color:" + TURQUESA + "\">Tacc</span></span>"
                + "<div style=\"font-size:13px;color:rgba(255,255,255,.72);margin-top:4px\">Alimentos libres de gluten</div>"
                + "</td></tr>"

                // Saludo
                + "<tr><td style=\"padding:32px 32px 8px\">"
                + "<div style=\"display:inline-block;background:#DDF5F2;color:#03807A;font-size:12px;font-weight:700;padding:6px 12px;border-radius:999px\">Compra confirmada</div>"
                + "<h1 style=\"margin:16px 0 8px;font-size:24px;line-height:1.25;color:" + PETROLEO + "\">¡Gracias por tu compra" + (nombre.isBlank() ? "" : ", " + esc(nombre)) + "!</h1>"
                + "<p style=\"margin:0;font-size:15px;line-height:1.6;color:" + TINTA_2 + "\">" + intro + "</p>"
                + "</td></tr>"

                // Datos
                + "<tr><td style=\"padding:20px 32px 4px\">"
                + "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:" + FONDO + ";border-radius:12px\"><tr>"
                + dato("Compra", "N.º " + venta.getId())
                + dato("Fecha", fecha)
                + dato("Pago", nombreMetodo(venta))
                + "</tr></table></td></tr>"

                // Productos
                + "<tr><td style=\"padding:16px 32px 0\">"
                + "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">" + filas + "</table>"
                + "</td></tr>"

                // Total
                + "<tr><td style=\"padding:18px 32px 8px\">"
                + "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>"
                + "<td style=\"font-size:16px;font-weight:700;color:" + PETROLEO + "\">Total</td>"
                + "<td align=\"right\" style=\"font-size:24px;font-weight:700;color:" + PETROLEO + "\">" + total + "</td>"
                + "</tr></table></td></tr>"

                // Botón
                + "<tr><td style=\"padding:20px 32px 34px\">"
                + boton
                + "</td></tr>"

                // Pie
                + "<tr><td style=\"padding:20px 32px;border-top:1px solid " + LINEA + ";font-size:12px;line-height:1.6;color:" + TINTA_2 + "\">"
                + "Si tenés alguna duda sobre tu pedido, respondé este mail o escribinos por WhatsApp."
                + "<br>El comprobante es interno y no reemplaza a una factura."
                + "</td></tr>"

                + "</table></td></tr></table></body></html>";
    }

    private String botonMail(String url, String texto) {
        return "<a href=\"" + esc(url) + "\" style=\"display:inline-block;background:" + TURQUESA
                + ";color:" + PETROLEO + ";font-size:15px;font-weight:700;text-decoration:none;"
                + "padding:14px 26px;border-radius:999px\">" + esc(texto) + "</a>";
    }

    private String textoPlano(Venta venta) {
        NumberFormat pesos = NumberFormat.getCurrencyInstance(Locale.forLanguageTag("es-AR"));
        return "¡Gracias por tu compra en VitalTacc!\n\n"
                + "Compra N.º " + venta.getId() + "\n"
                + "Pago: " + nombreMetodo(venta) + "\n"
                + "Total: " + pesos.format(venta.getTotal() != null ? venta.getTotal() : 0) + "\n\n"
                + "Te adjuntamos el comprobante en PDF.";
    }

    private String dato(String etiqueta, String valor) {
        return "<td style=\"padding:14px 16px;vertical-align:top\">"
                + "<div style=\"font-size:12px;color:" + TINTA_2 + "\">" + esc(etiqueta) + "</div>"
                + "<div style=\"font-size:14px;font-weight:700;color:" + PETROLEO + ";margin-top:3px\">" + esc(valor) + "</div>"
                + "</td>";
    }

    // Un renglón por producto y precio (una venta puede salir de varios lotes)
    private Map<String, int[]> agrupar(Venta venta) {
        Map<String, int[]> items = new LinkedHashMap<>();

        if (venta.getDetalles() == null) {
            return items;
        }

        for (DetalleVenta detalle : venta.getDetalles()) {
            String nombre = detalle.getProducto() != null && detalle.getProducto().getNombre() != null
                    ? detalle.getProducto().getNombre()
                    : "Producto";
            double precio = detalle.getPrecioUnitario() != null ? detalle.getPrecioUnitario() : 0;
            int cantidad = detalle.getCantidad() != null ? detalle.getCantidad() : 0;

            items.computeIfAbsent(nombre + "\u0000" + precio, k -> new int[1])[0] += cantidad;
        }

        return items;
    }

    private String nombreMetodo(Venta venta) {
        if (venta.getMetodoPago() == null) {
            return "-";
        }
        return switch (venta.getMetodoPago()) {
            case EFECTIVO -> "Efectivo";
            case TRANSFERENCIA -> "Transferencia";
            case TARJETA_DEBITO -> "Tarjeta de débito";
            case TARJETA_CREDITO -> "Tarjeta de crédito";
            case MERCADO_PAGO -> "Mercado Pago";
            case MODO -> "MODO";
        };
    }

    private String esc(String texto) {
        return texto == null ? "" : HtmlUtils.htmlEscape(texto);
    }
}
