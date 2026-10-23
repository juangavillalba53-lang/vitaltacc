package com.vitaltacc.controller;

import com.vitaltacc.service.ClienteService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

// Clientes para el panel (empleado y administrador)
@RestController
@RequestMapping("/clientes")
@CrossOrigin(origins = "*")
public class ClienteController {

    private final ClienteService clienteService;

    public ClienteController(ClienteService clienteService) {
        this.clienteService = clienteService;
    }

    // Ej.: /clientes?texto=marta&orden=recientes&pagina=1
    @GetMapping
    public Map<String, Object> listar(
            @RequestParam(required = false) String texto,
            @RequestParam(required = false) String orden,
            @RequestParam(defaultValue = "1") int pagina) {
        return clienteService.listar(texto, orden, pagina);
    }
}
