package com.vitaltacc.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.config.annotation.CorsRegistry;

@Configuration
public class WebConfig implements WebMvcConfigurer {

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
