package com.vitaltacc.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * Habilita tareas en segundo plano (@Async), por ejemplo
 * el envío del mail con el comprobante de una compra online.
 */
@Configuration
@EnableAsync
public class AsyncConfig {
}
