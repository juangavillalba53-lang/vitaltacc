package com.vitaltacc.controller;

import com.vitaltacc.model.Venta;
import com.vitaltacc.service.VentaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.vitaltacc.dto.VentaRequest;
import java.time.LocalDate;
import com.vitaltacc.service.VentaPdfService;
import com.vitaltacc.service.CompraEmailService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import com.vitaltacc.dto.VentaHistorialDTO;

import java.util.Map;
import java.util.List;

@RestController
@RequestMapping("/ventas")
@CrossOrigin(origins = "*")
public class VentaController {

    @Autowired
    private VentaService ventaService;

    @Autowired
    private VentaPdfService ventaPdfService;

    @Autowired
    private CompraEmailService compraEmailService;

    // Crear venta
    @PostMapping
    public Venta crearVenta(@RequestBody VentaRequest ventaRequest) {
        Venta venta = ventaService.crearVenta(ventaRequest);

        // El comprobante llega por mail: en las compras web siempre y en las
        // del local cuando el cliente dio (o ya tenía) un email.
        // Se envía en segundo plano: la respuesta no espera al correo.
        compraEmailService.enviarComprobante(venta.getId(), ventaRequest.getEmailCliente());

        return venta;
    }

    // Listar ventas
    @GetMapping
    public List<Venta> listarVentas() {
        return ventaService.obtenerVentas();
    }

    // Buscar ventas por número de compra o nombre del cliente
    @GetMapping("/historial")
    public List<VentaHistorialDTO> buscarHistorial(
            @RequestParam(required = false) String busqueda) {

        return ventaService.obtenerHistorialDTO(busqueda);
    }

    // Compras de un cliente (en el local y online)
    @GetMapping("/cliente/{clienteId}")
    public List<Map<String, Object>> obtenerComprasDeCliente(
            @PathVariable Long clienteId) {
        return ventaService.obtenerComprasDeCliente(clienteId);
    }

    // Obtener una venta específica por número de compra
    @GetMapping("/{id}")
    public Venta obtenerVentaPorId(@PathVariable Long id) {
        return ventaService.obtenerVentaPorId(id);
    }

    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> descargarComprobante(
            @PathVariable Long id) {

        byte[] pdf = ventaPdfService.generarComprobante(id);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=comprobante-venta-" + id + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    // Total facturado (general)
    @GetMapping("/total")
    public Double obtenerTotalFacturado() {
        return ventaService.obtenerTotalFacturado();
    }

    // Productos más vendidos (general)
    @GetMapping("/mas-vendidos")
    public List<Map<String, Object>> obtenerProductosMasVendidos() {
        return ventaService.obtenerProductosMasVendidos();
    }

    // Productos más vendidos por mes
    @GetMapping("/mas-vendidos/por-mes")
    public List<Map<String, Object>> obtenerProductosMasVendidosPorMes(
            @RequestParam int mes,
            @RequestParam int anio) {

        return ventaService.obtenerProductosMasVendidosPorMes(mes, anio);
    }

    // Total por mes
    @GetMapping("/total-por-mes")
    public Double obtenerTotalPorMes(
            @RequestParam int mes,
            @RequestParam int anio) {

        return ventaService.obtenerTotalPorMes(mes, anio);
    }

    // Total por año (gráfico)
    @GetMapping("/total-por-anio")
    public List<Map<String, Object>> obtenerTotalPorAnio(
            @RequestParam int anio) {

        return ventaService.obtenerTotalPorAnio(anio);
    }

    // Top clientes por mes
    @GetMapping("/top-clientes/por-mes")
    public List<Map<String, Object>> obtenerTopClientesPorMes(
            @RequestParam int mes,
            @RequestParam int anio) {

        return ventaService.obtenerTopClientesPorMes(mes, anio);
    }

    @GetMapping("/cierre-caja")
    public Map<String, Object> obtenerCierreCaja() {
        return ventaService.obtenerCierreCajaHoy();
    }

    @GetMapping("/reporte-dia")
    public Map<String, Object> obtenerReporteDia(
            @RequestParam String fecha) {

        return ventaService.obtenerReportePorDia(
                java.time.LocalDate.parse(fecha));
    }

    @GetMapping("/cantidad-ventas/mes")
    public int obtenerCantidadVentasMes(
            @RequestParam int mes,
            @RequestParam int anio) {

        return ventaService.obtenerCantidadVentasPorMes(mes, anio);
    }

    @GetMapping("/cantidad-ventas/anio")
    public int obtenerCantidadVentasAnio(
            @RequestParam int anio) {

        return ventaService.obtenerCantidadVentasPorAnio(anio);
    }

    @GetMapping("/mas-vendidos/por-dia")
    public List<Map<String, Object>> obtenerMasVendidosPorDia(
            @RequestParam String fecha) {

        return ventaService.obtenerProductosMasVendidosPorDia(
                LocalDate.parse(fecha));
    }

    @GetMapping("/top-clientes/por-dia")
    public List<Map<String, Object>> obtenerTopClientesPorDia(
            @RequestParam String fecha) {

        return ventaService.obtenerTopClientesPorDia(
                LocalDate.parse(fecha));
    }

    @GetMapping("/mas-vendidos/por-anio")
    public List<Map<String, Object>> obtenerMasVendidosPorAnio(
            @RequestParam int anio) {

        return ventaService.obtenerProductosMasVendidosPorAnio(anio);
    }

    @GetMapping("/top-clientes/por-anio")
    public List<Map<String, Object>> obtenerTopClientesPorAnio(
            @RequestParam int anio) {

        return ventaService.obtenerTopClientesPorAnio(anio);
    }
}