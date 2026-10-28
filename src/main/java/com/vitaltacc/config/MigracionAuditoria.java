package com.vitaltacc.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

/**
 * La tabla "registro_auditoria" se creó con restricciones CHECK que solo aceptan
 * las acciones y secciones de ese momento (accion IN ('CREAR', ...)).
 * Así no se pueden guardar las nuevas, por ejemplo DESCARGA o SALIDA,
 * y falla lo que se estaba haciendo (descargar el PDF, cerrar sesión...).
 *
 * Al arrancar, si esas restricciones siguen, se quitan. Los valores los sigue
 * controlando Java (ModuloAuditoria y AccionAuditoria). Los datos no cambian.
 */
@Component
public class MigracionAuditoria implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(MigracionAuditoria.class);

    private final DataSource dataSource;

    public MigracionAuditoria(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(ApplicationArguments args) {
        try (Connection conexion = dataSource.getConnection()) {

            // Solo hace falta en MySQL (es donde Hibernate dejó estas restricciones)
            if (!conexion.getMetaData().getDatabaseProductName().toLowerCase().contains("mysql")) {
                return;
            }

            for (String restriccion : restriccionesViejas(conexion)) {
                try (Statement sentencia = conexion.createStatement()) {
                    sentencia.execute("ALTER TABLE registro_auditoria DROP CHECK `" + restriccion + "`");
                }
                log.info("Auditoría: se quitó la restricción {} para poder guardar acciones nuevas.", restriccion);
            }
        } catch (Exception e) {
            log.warn("Auditoría: no se pudieron revisar las restricciones de la tabla: {}", e.getMessage());
        }
    }

    // Restricciones CHECK de la tabla que limitan las columnas accion o modulo
    private List<String> restriccionesViejas(Connection conexion) throws Exception {
        String sql = "SELECT tc.CONSTRAINT_NAME, cc.CHECK_CLAUSE"
                + " FROM information_schema.TABLE_CONSTRAINTS tc"
                + " JOIN information_schema.CHECK_CONSTRAINTS cc"
                + "   ON cc.CONSTRAINT_SCHEMA = tc.CONSTRAINT_SCHEMA AND cc.CONSTRAINT_NAME = tc.CONSTRAINT_NAME"
                + " WHERE tc.CONSTRAINT_TYPE = 'CHECK'"
                + "   AND LOWER(tc.TABLE_NAME) = 'registro_auditoria'"
                + "   AND LOWER(tc.TABLE_SCHEMA) = LOWER(DATABASE())";

        List<String> nombres = new ArrayList<>();
        try (PreparedStatement consulta = conexion.prepareStatement(sql);
             ResultSet fila = consulta.executeQuery()) {
            while (fila.next()) {
                String clausula = fila.getString(2).toLowerCase();
                if (clausula.contains("`accion`") || clausula.contains("`modulo`")) {
                    nombres.add(fila.getString(1));
                }
            }
        }
        return nombres;
    }
}
