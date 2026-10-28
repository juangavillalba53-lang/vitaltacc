
package com.vitaltacc.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import com.vitaltacc.model.DetalleVenta;
import com.vitaltacc.model.FormaEntrega;
import com.vitaltacc.model.Venta;
import com.vitaltacc.repository.VentaRepository;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

@Service
public class VentaPdfService {

        private static final Color TURQUESA = new Color(0, 184, 174);
        private static final Color TURQUESA_OSCURO = new Color(0, 135, 130);
        private static final Color GRIS_CLARO = new Color(242, 247, 247);
        private static final Color GRIS_TEXTO = new Color(90, 100, 105);
        private static final Color VERDE_DESCUENTO = new Color(0, 135, 100);
        private static final Color GRIS_PRECIO_ANTERIOR = new Color(140, 145, 145);
        private static final Color BORDE = new Color(225, 232, 232);

        private final VentaRepository ventaRepository;

        public VentaPdfService(VentaRepository ventaRepository) {
                this.ventaRepository = ventaRepository;
        }

        @Transactional(readOnly = true)
        public byte[] generarComprobante(Long id) {

                Venta venta = ventaRepository.findById(id)
                                .orElseThrow(() -> new RuntimeException(
                                                "No se encontró la compra número " + id));

                try (ByteArrayOutputStream salida = new ByteArrayOutputStream()) {

                        Document documento = new Document(
                                        PageSize.A4, 42, 42, 38, 45);

                        PdfWriter.getInstance(documento, salida);
                        documento.open();

                        Font titulo = new Font(
                                        Font.HELVETICA, 18, Font.BOLD, TURQUESA_OSCURO);

                        Font subtitulo = new Font(
                                        Font.HELVETICA, 11, Font.BOLD, Color.DARK_GRAY);

                        Font etiqueta = new Font(
                                        Font.HELVETICA, 9, Font.BOLD, GRIS_TEXTO);

                        Font valor = new Font(
                                        Font.HELVETICA, 10, Font.NORMAL, Color.BLACK);

                        Font textoTabla = new Font(
                                        Font.HELVETICA, 9, Font.NORMAL, Color.DARK_GRAY);

                        Font textoTablaBlanco = new Font(
                                        Font.HELVETICA, 9, Font.BOLD, Color.WHITE);

                        Font totalFont = new Font(
                                        Font.HELVETICA, 15, Font.BOLD, TURQUESA_OSCURO);

                        Font ahorroFont = new Font(
                                        Font.HELVETICA, 10, Font.BOLD, VERDE_DESCUENTO);

                        NumberFormat moneda = NumberFormat.getCurrencyInstance(
                                        Locale.forLanguageTag("es-AR"));

                        // ENCABEZADO CON LOGO
                        PdfPTable encabezado = new PdfPTable(new float[] { 1.2f, 2f });
                        encabezado.setWidthPercentage(100);
                        encabezado.setSpacingAfter(18);

                        PdfPCell celdaLogo = new PdfPCell();
                        celdaLogo.setBorder(Rectangle.NO_BORDER);
                        celdaLogo.setVerticalAlignment(Element.ALIGN_MIDDLE);
                        celdaLogo.setPadding(5);

                        try (InputStream logoStream = new ClassPathResource(
                                        "static/images/vitaltacc-logo.png").getInputStream()) {

                                byte[] logoBytes = logoStream.readAllBytes();
                                Image logo = Image.getInstance(logoBytes);
                                logo.scaleToFit(210, 95);
                                celdaLogo.addElement(logo);

                        } catch (Exception e) {
                                celdaLogo.addElement(new Paragraph("VitalTacc", titulo));
                        }

                        encabezado.addCell(celdaLogo);

                        PdfPCell celdaTitulo = new PdfPCell();
                        celdaTitulo.setBorder(Rectangle.NO_BORDER);
                        celdaTitulo.setVerticalAlignment(Element.ALIGN_MIDDLE);
                        celdaTitulo.setHorizontalAlignment(Element.ALIGN_RIGHT);
                        celdaTitulo.setPadding(5);

                        Paragraph numero = new Paragraph(
                                        "COMPRA N.º " + venta.getId(), titulo);
                        numero.setAlignment(Element.ALIGN_RIGHT);
                        celdaTitulo.addElement(numero);

                        Paragraph tipo = new Paragraph(
                                        "COMPROBANTE INTERNO", subtitulo);
                        tipo.setAlignment(Element.ALIGN_RIGHT);
                        tipo.setSpacingBefore(5);
                        celdaTitulo.addElement(tipo);

                        encabezado.addCell(celdaTitulo);
                        documento.add(encabezado);

                        // LÍNEA TURQUESA
                        PdfPTable linea = new PdfPTable(1);
                        linea.setWidthPercentage(100);

                        PdfPCell celdaLinea = new PdfPCell(new Phrase(" "));
                        celdaLinea.setBorder(Rectangle.NO_BORDER);
                        celdaLinea.setBackgroundColor(TURQUESA);
                        celdaLinea.setFixedHeight(4);

                        linea.addCell(celdaLinea);
                        linea.setSpacingAfter(18);
                        documento.add(linea);

                        // DATOS DE LA COMPRA
                        Paragraph tituloDatos = new Paragraph(
                                        "DATOS DE LA COMPRA", subtitulo);
                        tituloDatos.setSpacingAfter(10);
                        documento.add(tituloDatos);

                        PdfPTable datos = new PdfPTable(new float[] { 1, 1 });
                        datos.setWidthPercentage(100);
                        datos.setSpacingAfter(18);

                        String fecha = venta.getFecha() != null
                                        ? venta.getFecha().format(
                                                        DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                                        : "-";

                        String cliente = venta.getCliente() != null
                                        ? textoSeguro(venta.getCliente().getNombre()) + " "
                                                        + textoSeguro(venta.getCliente().getApellido())
                                        : "Consumidor final";

                        agregarDato(datos, "FECHA", fecha, etiqueta, valor);
                        agregarDato(datos, "TIPO DE VENTA",
                                        venta.getTipoVenta() != null ? venta.getTipoVenta().getNombre() : "-",
                                        etiqueta, valor);
                        agregarDato(datos, "CLIENTE", cliente.trim(), etiqueta, valor);
                        agregarDato(datos, "MÉTODO DE PAGO",
                                        venta.getMetodoPago() != null ? venta.getMetodoPago().getNombre() : "-",
                                        etiqueta, valor);

                        if (venta.getCliente() != null
                                        && venta.getCliente().getDni() != null
                                        && !venta.getCliente().getDni().isBlank()) {

                                agregarDato(datos, "DNI",
                                                venta.getCliente().getDni(), etiqueta, valor);
                        }

                        // Compras online: cómo se entrega (y adónde, si es envío)
                        if (venta.esOnline()) {
                                agregarDato(datos, "ENTREGA",
                                                venta.formaEntregaActual().getNombre(), etiqueta, valor);

                                if (venta.formaEntregaActual() == FormaEntrega.ENVIO) {
                                        String direccion = textoSeguro(venta.getEnvioDireccion())
                                                        + (venta.getEnvioLocalidad() != null
                                                                        ? ", " + venta.getEnvioLocalidad()
                                                                        : "");
                                        agregarDato(datos, "DIRECCIÓN DE ENVÍO", direccion, etiqueta, valor);
                                }
                        }

                        // Si un dato quedó solo en la última fila, se completa la fila
                        // (si no, la tabla del PDF no la muestra)
                        datos.getDefaultCell().setBorder(Rectangle.NO_BORDER);
                        datos.getDefaultCell().setBackgroundColor(GRIS_CLARO);
                        datos.completeRow();

                        documento.add(datos);

                        // AGRUPAR PRODUCTOS POR ID, PRECIO FINAL Y PRECIO ORIGINAL
                        Map<String, ItemAgrupado> productosAgrupados = new LinkedHashMap<>();

                        if (venta.getDetalles() != null) {
                                for (DetalleVenta detalle : venta.getDetalles()) {

                                        String nombre = detalle.getProducto() != null
                                                        ? textoSeguro(detalle.getProducto().getNombre())
                                                        : "Producto";

                                        Long productoId = detalle.getProducto() != null
                                                        ? detalle.getProducto().getId()
                                                        : null;

                                        double precio = detalle.getPrecioUnitario() != null
                                                        ? detalle.getPrecioUnitario()
                                                        : 0.0;

                                        double precioOriginal = detalle.getProducto() != null
                                                        && detalle.getProducto().getPrecio() != null
                                                                        ? detalle.getProducto().getPrecio()
                                                                        : precio;

                                        // Evitar mostrar un descuento negativo o inexistente.
                                        if (precioOriginal < precio) {
                                                precioOriginal = precio;
                                        }

                                        int cantidad = detalle.getCantidad() != null
                                                        ? detalle.getCantidad()
                                                        : 0;

                                        String clave = productoId + "|" + precio
                                                        + "|" + precioOriginal;

                                        ItemAgrupado item = productosAgrupados.get(clave);

                                        if (item == null) {
                                                productosAgrupados.put(
                                                                clave,
                                                                new ItemAgrupado(
                                                                                nombre, precio, precioOriginal,
                                                                                cantidad));
                                        } else {
                                                item.cantidad += cantidad;
                                        }
                                }
                        }

                        // TABLA DE PRODUCTOS
                        Paragraph tituloProductos = new Paragraph(
                                        "DETALLE DE PRODUCTOS", subtitulo);
                        tituloProductos.setSpacingAfter(10);
                        documento.add(tituloProductos);

                        PdfPTable tabla = new PdfPTable(
                                        new float[] { 4f, 1f, 2f, 2f });

                        tabla.setWidthPercentage(100);
                        tabla.setHeaderRows(1);

                        agregarEncabezadoTabla(tabla, "Producto", textoTablaBlanco);
                        agregarEncabezadoTabla(tabla, "Cant.", textoTablaBlanco);
                        agregarEncabezadoTabla(tabla, "Precio unit.", textoTablaBlanco);
                        agregarEncabezadoTabla(tabla, "Subtotal", textoTablaBlanco);

                        boolean alternar = false;
                        double ahorroTotal = 0.0;

                        for (ItemAgrupado item : productosAgrupados.values()) {

                                Color fondo = alternar ? GRIS_CLARO : Color.WHITE;
                                alternar = !alternar;

                                agregarCeldaProducto(
                                                tabla, item.nombre,
                                                textoTabla, fondo, Element.ALIGN_LEFT);

                                agregarCeldaProducto(
                                                tabla, String.valueOf(item.cantidad),
                                                textoTabla, fondo, Element.ALIGN_CENTER);

                                boolean tieneDescuento = item.precio < item.precioOriginal;

                                double subtotal = item.precio * item.cantidad;

                                if (tieneDescuento) {

                                        double ahorroProducto = (item.precioOriginal - item.precio)
                                                        * item.cantidad;

                                        ahorroTotal += ahorroProducto;

                                        agregarCeldaPrecio(
                                                        tabla,
                                                        moneda.format(item.precioOriginal),
                                                        moneda.format(item.precio),
                                                        fondo,
                                                        Element.ALIGN_RIGHT);

                                        agregarCeldaPrecio(
                                                        tabla,
                                                        moneda.format(
                                                                        item.precioOriginal * item.cantidad),
                                                        moneda.format(subtotal),
                                                        fondo,
                                                        Element.ALIGN_RIGHT);

                                } else {

                                        agregarCeldaProducto(
                                                        tabla,
                                                        moneda.format(item.precio),
                                                        textoTabla,
                                                        fondo,
                                                        Element.ALIGN_RIGHT);

                                        agregarCeldaProducto(
                                                        tabla,
                                                        moneda.format(subtotal),
                                                        textoTabla,
                                                        fondo,
                                                        Element.ALIGN_RIGHT);
                                }
                        }

                        documento.add(tabla);

                        // RESUMEN DE IMPORTES
                        PdfPTable tablaTotal = new PdfPTable(new float[] { 1, 1 });
                        tablaTotal.setWidthPercentage(65);
                        tablaTotal.setHorizontalAlignment(Element.ALIGN_RIGHT);
                        tablaTotal.setSpacingBefore(18);

                        // Mostrar el ahorro solamente si hubo descuentos.
                        if (ahorroTotal > 0.005) {

                                PdfPCell etiquetaAhorro = new PdfPCell(
                                                new Phrase("AHORRO EN PROMOCIONES", ahorroFont));
                                etiquetaAhorro.setBorder(Rectangle.NO_BORDER);
                                etiquetaAhorro.setBackgroundColor(GRIS_CLARO);
                                etiquetaAhorro.setPadding(10);
                                etiquetaAhorro.setVerticalAlignment(Element.ALIGN_MIDDLE);

                                PdfPCell importeAhorro = new PdfPCell(
                                                new Phrase("- " + moneda.format(ahorroTotal),
                                                                ahorroFont));
                                importeAhorro.setBorder(Rectangle.NO_BORDER);
                                importeAhorro.setBackgroundColor(GRIS_CLARO);
                                importeAhorro.setPadding(10);
                                importeAhorro.setHorizontalAlignment(Element.ALIGN_RIGHT);
                                importeAhorro.setVerticalAlignment(Element.ALIGN_MIDDLE);

                                tablaTotal.addCell(etiquetaAhorro);
                                tablaTotal.addCell(importeAhorro);
                        }

                        PdfPCell etiquetaTotal = new PdfPCell(
                                        new Phrase("TOTAL A PAGAR", subtitulo));
                        etiquetaTotal.setBorder(Rectangle.NO_BORDER);
                        etiquetaTotal.setBackgroundColor(GRIS_CLARO);
                        etiquetaTotal.setPadding(12);
                        etiquetaTotal.setVerticalAlignment(Element.ALIGN_MIDDLE);

                        double totalVenta = venta.getTotal() != null
                                        ? venta.getTotal()
                                        : 0.0;

                        PdfPCell importeTotal = new PdfPCell(
                                        new Phrase(moneda.format(totalVenta), totalFont));
                        importeTotal.setBorder(Rectangle.NO_BORDER);
                        importeTotal.setBackgroundColor(GRIS_CLARO);
                        importeTotal.setPadding(12);
                        importeTotal.setHorizontalAlignment(Element.ALIGN_RIGHT);
                        importeTotal.setVerticalAlignment(Element.ALIGN_MIDDLE);

                        tablaTotal.addCell(etiquetaTotal);
                        tablaTotal.addCell(importeTotal);

                        documento.add(tablaTotal);

                        // PIE DE PÁGINA
                        Paragraph pie = new Paragraph(
                                        "Gracias por elegir VitalTacc",
                                        new Font(Font.HELVETICA, 10, Font.BOLD,
                                                        TURQUESA_OSCURO));

                        pie.setAlignment(Element.ALIGN_CENTER);
                        pie.setSpacingBefore(35);
                        documento.add(pie);

                        Paragraph aclaracion = new Paragraph(
                                        "Este documento es un comprobante interno de compra. "
                                                        + "No constituye una factura fiscal.",
                                        new Font(Font.HELVETICA, 8, Font.NORMAL, GRIS_TEXTO));

                        aclaracion.setAlignment(Element.ALIGN_CENTER);
                        aclaracion.setSpacingBefore(6);
                        documento.add(aclaracion);

                        documento.close();
                        return salida.toByteArray();

                } catch (Exception e) {
                        throw new RuntimeException(
                                        "No se pudo generar el comprobante PDF.", e);
                }
        }

        private void agregarDato(
                        PdfPTable tabla,
                        String titulo,
                        String contenido,
                        Font fuenteTitulo,
                        Font fuenteValor) {

                PdfPCell celda = new PdfPCell();
                celda.setBorder(Rectangle.NO_BORDER);
                celda.setBackgroundColor(GRIS_CLARO);
                celda.setPadding(9);

                Paragraph etiqueta = new Paragraph(titulo, fuenteTitulo);
                etiqueta.setSpacingAfter(4);

                Paragraph valor = new Paragraph(contenido, fuenteValor);

                celda.addElement(etiqueta);
                celda.addElement(valor);

                tabla.addCell(celda);
        }

        private void agregarEncabezadoTabla(
                        PdfPTable tabla, String texto, Font fuente) {

                PdfPCell celda = new PdfPCell(new Phrase(texto, fuente));
                celda.setBackgroundColor(TURQUESA_OSCURO);
                celda.setPadding(9);
                celda.setBorderColor(TURQUESA_OSCURO);
                celda.setVerticalAlignment(Element.ALIGN_MIDDLE);

                tabla.addCell(celda);
        }

        private void agregarCeldaProducto(
                        PdfPTable tabla,
                        String texto,
                        Font fuente,
                        Color fondo,
                        int alineacion) {

                PdfPCell celda = new PdfPCell(new Phrase(texto, fuente));
                celda.setBackgroundColor(fondo);
                celda.setPadding(9);
                celda.setHorizontalAlignment(alineacion);
                celda.setVerticalAlignment(Element.ALIGN_MIDDLE);
                celda.setBorderColor(BORDE);

                tabla.addCell(celda);
        }

        private void agregarCeldaPrecio(
                        PdfPTable tabla,
                        String precioOriginal,
                        String precioFinal,
                        Color fondo,
                        int alineacion) {

                Font fuenteOriginal = new Font(
                                Font.HELVETICA,
                                8,
                                Font.STRIKETHRU,
                                GRIS_PRECIO_ANTERIOR);

                Font fuenteFinal = new Font(
                                Font.HELVETICA,
                                9,
                                Font.BOLD,
                                VERDE_DESCUENTO);

                PdfPCell celda = new PdfPCell();
                celda.setBackgroundColor(fondo);
                celda.setPadding(7);
                celda.setHorizontalAlignment(alineacion);
                celda.setVerticalAlignment(Element.ALIGN_MIDDLE);
                celda.setBorderColor(BORDE);

                Paragraph anterior = new Paragraph(
                                precioOriginal, fuenteOriginal);
                anterior.setAlignment(alineacion);
                anterior.setSpacingAfter(3);

                Paragraph actual = new Paragraph(
                                precioFinal, fuenteFinal);
                actual.setAlignment(alineacion);

                celda.addElement(anterior);
                celda.addElement(actual);

                tabla.addCell(celda);
        }

        private String textoSeguro(Object valor) {
                return valor != null ? valor.toString() : "-";
        }

        private static class ItemAgrupado {

                private final String nombre;
                private final double precio;
                private final double precioOriginal;
                private int cantidad;

                private ItemAgrupado(
                                String nombre,
                                double precio,
                                double precioOriginal,
                                int cantidad) {

                        this.nombre = nombre;
                        this.precio = precio;
                        this.precioOriginal = precioOriginal;
                        this.cantidad = cantidad;
                }
        }
}
