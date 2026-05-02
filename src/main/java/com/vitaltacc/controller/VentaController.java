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

    // 🔥 Crear venta
    @PostMapping
    public Venta crearVenta(@RequestBody Venta venta) {
        return ventaService.crearVenta(venta);
    }

    // 🔥 Listar ventas
    @GetMapping
    public List<Venta> listarVentas() {
        return ventaService.obtenerVentas();
    }

    // 🔥 Total facturado
    @GetMapping("/total")
    public Double obtenerTotalFacturado() {
        return ventaService.obtenerTotalFacturado();
    }

    // 🔥 Productos más vendidos (SIN filtro)
    @GetMapping("/mas-vendidos")
    public List<Map<String, Object>> obtenerProductosMasVendidos() {
        return ventaService.obtenerProductosMasVendidos();
    }

    // 🔥 Productos más vendidos por mes
    @GetMapping("/mas-vendidos/por-mes")
    public List<Map<String, Object>> obtenerProductosMasVendidosPorMes(
            @RequestParam int mes,
            @RequestParam int anio) {

        return ventaService.obtenerProductosMasVendidosPorMes(mes, anio);
    }

    // 🔥 Total por mes
    @GetMapping("/total-por-mes")
    public Double obtenerTotalPorMes(
            @RequestParam int mes,
            @RequestParam int anio) {

        return ventaService.obtenerTotalPorMes(mes, anio);
    }

    // 🔥 Total por año (mes a mes)
    @GetMapping("/total-por-anio")
    public List<Map<String, Object>> obtenerTotalPorAnio(
            @RequestParam int anio) {

        return ventaService.obtenerTotalPorAnio(anio);
    }

    // 🔥 Top clientes
    @GetMapping("/top-clientes")
    public List<Map<String, Object>> obtenerTopClientes() {
        return ventaService.obtenerTopClientes();
    }
}