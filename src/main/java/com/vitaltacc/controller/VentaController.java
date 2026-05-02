package com.vitaltacc.controller;

import com.vitaltacc.model.Venta;
import com.vitaltacc.service.VentaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.List;

@RestController
@RequestMapping("/ventas")
@CrossOrigin(origins = "*")
public class VentaController {

    @Autowired
    private VentaService ventaService;

    // Crear venta
    @PostMapping
    public Venta crearVenta(@RequestBody Venta venta) {
        return ventaService.crearVenta(venta);
    }

    // Listar ventas
    @GetMapping
    public List<Venta> listarVentas() {
        return ventaService.obtenerVentas();
    }

    // Total facturado
    @GetMapping("/total")
    public Double obtenerTotalFacturado() {
        return ventaService.obtenerTotalFacturado();
    }

    // 🔥 NUEVO: productos más vendidos por mes
    @GetMapping("/mas-vendidos")
    public List<Map<String, Object>> obtenerProductosMasVendidos(
            @RequestParam int mes,
            @RequestParam int anio) {

        return ventaService.obtenerProductosMasVendidosPorMes(mes, anio);
    }

    // 🔥 NUEVO: total por mes
    @GetMapping("/total-por-mes")
    public Double obtenerTotalPorMes(
            @RequestParam int mes,
            @RequestParam int anio) {

        return ventaService.obtenerTotalPorMes(mes, anio);
    }

    // 🔥 NUEVO: total por año
    @GetMapping("/total-por-anio")
    public List<Map<String, Object>> obtenerTotalPorAnio(
            @RequestParam int anio) {

        return ventaService.obtenerTotalPorAnio(anio);
    }

    // 🔥 NUEVO: top clientes
    @GetMapping("/top-clientes")
    public List<Map<String, Object>> obtenerTopClientes() {
        return ventaService.obtenerTopClientes();
    }
}