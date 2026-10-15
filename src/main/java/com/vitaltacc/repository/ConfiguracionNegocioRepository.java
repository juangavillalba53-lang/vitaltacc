
package com.vitaltacc.repository;

import com.vitaltacc.model.ConfiguracionNegocio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ConfiguracionNegocioRepository
        extends JpaRepository<ConfiguracionNegocio, Long> {
}
