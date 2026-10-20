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

/**
 * La tabla "devolucion" se creó con las columnas motivo y estado como ENUM de MySQL,
 * con los valores de ese momento. Así no se pueden guardar motivos nuevos
 * (por ejemplo ARREPENTIMIENTO).
 *
 * Al arrancar, si esas columnas siguen siendo ENUM, se pasan a texto (VARCHAR).
 * Los datos que ya estaban no cambian. Si ya son texto, no hace nada.
 */
@Component
public class MigracionDevoluciones implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(MigracionDevoluciones.class);

    private final DataSource dataSource;

    public MigracionDevoluciones(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(ApplicationArguments args) {
        pasarATexto("motivo", 30);
        pasarATexto("estado", 20);
    }

    private void pasarATexto(String columna, int largo) {

        try (Connection conexion = dataSource.getConnection()) {

            if (!esEnum(conexion, columna)) {
                return;
            }

            boolean esMySQL = conexion.getMetaData().getDatabaseProductName()
                    .toLowerCase().contains("mysql");

            String sql = esMySQL
                    ? "ALTER TABLE devolucion MODIFY COLUMN " + columna + " VARCHAR(" + largo + ") NOT NULL"
                    : "ALTER TABLE devolucion ALTER COLUMN " + columna + " SET DATA TYPE VARCHAR(" + largo + ")";

            try (Statement sentencia = conexion.createStatement()) {
                sentencia.execute(sql);
            }

            log.info("Devoluciones: la columna {} pasó de ENUM a texto.", columna);

        } catch (Exception e) {
            log.warn("Devoluciones: no se pudo revisar la columna {}: {}", columna, e.getMessage());
        }
    }

    // Mira el tipo de la columna en la base actual (MySQL guarda la base en TABLE_SCHEMA)
    private boolean esEnum(Connection conexion, String columna) throws Exception {

        String sql = "SELECT DATA_TYPE FROM information_schema.COLUMNS"
                + " WHERE LOWER(TABLE_NAME) = 'devolucion' AND LOWER(COLUMN_NAME) = ?"
                + " AND (LOWER(TABLE_SCHEMA) = LOWER(DATABASE()) OR LOWER(TABLE_CATALOG) = LOWER(DATABASE()))";

        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setString(1, columna);

            try (ResultSet fila = consulta.executeQuery()) {
                return fila.next() && "enum".equalsIgnoreCase(fila.getString(1));
            }
        }
    }
}
