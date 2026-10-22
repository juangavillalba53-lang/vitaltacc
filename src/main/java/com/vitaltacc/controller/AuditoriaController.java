package com.vitaltacc.controller;

import com.vitaltacc.model.AccionAuditoria;
import com.vitaltacc.model.ModuloAuditoria;
import com.vitaltacc.service.AuditoriaService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

// Auditoría: quién hizo cada cambio (solo la ve el administrador)
@RestController
@RequestMapping("/auditoria")
@CrossOrigin(origins = "*")
public class AuditoriaController {

    private final AuditoriaService auditoriaService;

    public AuditoriaController(AuditoriaService auditoriaService) {
        this.auditoriaService = auditoriaService;
    }

    // Ej.: /auditoria?desde=2026-10-01&hasta=2026-10-22&usuarioId=3&modulo=PRODUCTOS&accion=MODIFICAR&texto=fideos&pagina=1
    @GetMapping
    public Map<String, Object> buscar(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(required = false) Long usuarioId,
            @RequestParam(required = false) String modulo,
            @RequestParam(required = false) String accion,
            @RequestParam(required = false) String texto,
            @RequestParam(defaultValue = "1") int pagina) {

        return auditoriaService.buscar(desde, hasta, usuarioId,
                enumOpcional(ModuloAuditoria.class, modulo),
                enumOpcional(AccionAuditoria.class, accion),
                texto, pagina);
    }

    @GetMapping("/opciones")
    public Map<String, Object> opciones() {
        return auditoriaService.opciones();
    }

    private static <E extends Enum<E>> E enumOpcional(Class<E> tipo, String valor) {
        if (valor == null || valor.isBlank()) return null;
        try {
            return Enum.valueOf(tipo, valor.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Filtro no válido: " + valor);
        }
    }
}
