package com.vitaltacc.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;

@Configuration
public class WebConfig implements WebMvcConfigurer {

        private final ControlDeAcceso controlDeAcceso;

        public WebConfig(ControlDeAcceso controlDeAcceso) {
                this.controlDeAcceso = controlDeAcceso;
        }

        // Antes de cada pedido se revisa la sesión y los permisos
        @Override
        public void addInterceptors(InterceptorRegistry registry) {
                registry.addInterceptor(controlDeAcceso);
        }

        @Override
        public void addResourceHandlers(
                        ResourceHandlerRegistry registry) {

                registry.addResourceHandler("/uploads/**")
                                .addResourceLocations(
                                                "file:" + System.getProperty("user.dir") + "/vitaltacc/uploads/");
        }

        @Override
        public void addCorsMappings(
                        CorsRegistry registry) {

                registry.addMapping("/**")
                                .allowedOrigins("*")
                                .allowedMethods("*")
                                .allowedHeaders("*");
        }
}
