-- Estados de nómina (flujo simple)
CREATE TABLE IF NOT EXISTS tbl_nomina_estados (
  est_id INT AUTO_INCREMENT PRIMARY KEY,
  est_nombre VARCHAR(50) NOT NULL  -- borrador | importada | validada | cerrada | anulada
) ENGINE=InnoDB;

-- Encabezado por periodo (año/mes) y versión
CREATE TABLE IF NOT EXISTS tbl_nomina (
  nom_id INT AUTO_INCREMENT PRIMARY KEY,
  nom_anio SMALLINT NOT NULL,
  nom_mes  TINYINT  NOT NULL,
  nom_version INT NOT NULL DEFAULT 1,
  est_id INT NOT NULL,
  nom_total DECIMAL(18,2) DEFAULT 0,
  nom_archivo VARCHAR(500) NULL,        -- path al archivo original cargado
  nom_nota TEXT NULL,
  nom_usu_reg INT NULL,
  nom_fec_reg TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_nom_periodo (nom_anio, nom_mes, nom_version),
  CONSTRAINT fk_nom_estado FOREIGN KEY (est_id) REFERENCES tbl_nomina_estados(est_id)
) ENGINE=InnoDB;

-- Línea por empleado (snapshot de datos críticos para histórico)
CREATE TABLE IF NOT EXISTS tbl_nomina_empleado (
  nem_id INT AUTO_INCREMENT PRIMARY KEY,
  nom_id INT NOT NULL,
  usu_id INT NULL,
  nem_documento VARCHAR(50) NULL,       -- snapshot
  nem_nombre VARCHAR(255) NULL,         -- snapshot (nombre completo)
  car_id INT NULL,                      -- snapshot
  cco_id INT NULL,                      -- snapshot
  nem_total DECIMAL(18,2) DEFAULT 0,
  CONSTRAINT fk_nem_nom   FOREIGN KEY (nom_id) REFERENCES tbl_nomina(nom_id) ON DELETE CASCADE,
  CONSTRAINT fk_nem_usu   FOREIGN KEY (usu_id) REFERENCES tbl_usuarios(usu_id) ON DELETE SET NULL,
  CONSTRAINT fk_nem_car   FOREIGN KEY (car_id) REFERENCES tbl_cargos(car_id) ON DELETE SET NULL,
  CONSTRAINT fk_nem_cco   FOREIGN KEY (cco_id) REFERENCES tbl_centro_costos(cco_id) ON DELETE SET NULL,
  INDEX idx_nem_nom_usu (nom_id, usu_id)
) ENGINE=InnoDB;

-- Concepto por empleado (una fila por "Nombre Cuenta" del Excel)
CREATE TABLE IF NOT EXISTS tbl_nomina_empleado_concepto (
  nec_id INT AUTO_INCREMENT PRIMARY KEY,
  nem_id INT NOT NULL,
  con_id INT NULL,                      -- si logras mapear contra tu tbl_concepto_nomina
  nec_cuenta VARCHAR(50) NULL,          -- "Cuenta" del Excel
  nec_nombre_cuenta VARCHAR(255) NULL,  -- "Nombre Cuenta" (texto del Excel)
  nec_total DECIMAL(18,2) DEFAULT 0,    -- TOTAL de esa fila
  CONSTRAINT fk_nec_nem FOREIGN KEY (nem_id) REFERENCES tbl_nomina_empleado(nem_id) ON DELETE CASCADE,
  CONSTRAINT fk_nec_con FOREIGN KEY (con_id) REFERENCES tbl_concepto_nomina(con_id) ON DELETE SET NULL,
  INDEX idx_nec_nem (nem_id)
) ENGINE=InnoDB;

-- Distribución por proyecto del concepto (columnas de proyectos en el Excel)
CREATE TABLE IF NOT EXISTS tbl_nomina_concepto_proyecto (
  ncp_id INT AUTO_INCREMENT PRIMARY KEY,
  nec_id INT NOT NULL,
  pro_id INT NOT NULL,
  ncp_monto DECIMAL(18,2) NOT NULL,
  ncp_porcentaje DECIMAL(7,4) NULL,     -- ncp_monto / nec_total
  cco_id INT NULL,                      -- override si el Excel lo trae por proyecto (opcional)
  CONSTRAINT fk_ncp_nec FOREIGN KEY (nec_id) REFERENCES tbl_nomina_empleado_concepto(nec_id) ON DELETE CASCADE,
  CONSTRAINT fk_ncp_pro FOREIGN KEY (pro_id) REFERENCES tbl_bloques(pro_id) ON DELETE RESTRICT,
  CONSTRAINT fk_ncp_cco FOREIGN KEY (cco_id) REFERENCES tbl_centro_costos(cco_id) ON DELETE SET NULL,
  UNIQUE KEY uq_nec_pro (nec_id, pro_id),
  INDEX idx_ncp_pro (pro_id)
) ENGINE=InnoDB;

-- Agregado por empleado/proyecto (acelera dashboard sin GROUP BY pesados)
CREATE TABLE IF NOT EXISTS tbl_nomina_empleado_proyecto (
  nep_id INT AUTO_INCREMENT PRIMARY KEY,
  nem_id INT NOT NULL,
  pro_id INT NOT NULL,
  nep_monto DECIMAL(18,2) NOT NULL,
  nep_porcentaje DECIMAL(7,4) NULL,     -- nep_monto / nem_total
  UNIQUE KEY uq_nep (nem_id, pro_id),
  CONSTRAINT fk_nep_nem FOREIGN KEY (nem_id) REFERENCES tbl_nomina_empleado(nem_id) ON DELETE CASCADE,
  CONSTRAINT fk_nep_pro FOREIGN KEY (pro_id) REFERENCES tbl_bloques(pro_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Bitácora de cambios/estados
CREATE TABLE IF NOT EXISTS tbl_nomina_log (
  nlg_id INT AUTO_INCREMENT PRIMARY KEY,
  nom_id INT NOT NULL,
  nlg_usuario INT NULL,
  nlg_accion VARCHAR(50) NOT NULL,      -- importar | validar | cerrar | reabrir | anular
  nlg_de_est INT NULL,
  nlg_a_est INT NULL,
  nlg_comentario TEXT NULL,
  nlg_fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_nlg_nom FOREIGN KEY (nom_id) REFERENCES tbl_nomina(nom_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tbl_usuario_proyecto (
  upr_id INT NOT NULL AUTO_INCREMENT,
  usu_id INT NOT NULL,
  pro_id INT NOT NULL,
  -- Campos útiles para nómina/cobro:
  upr_porcentaje DECIMAL(5,2) NULL,  -- % del costo que se carga a ese proyecto (0–100)
  upr_fec_inicio DATE NULL,
  upr_fec_fin DATE NULL,
  upr_estado ENUM('activo','inactivo') DEFAULT 'activo',
  cco_id INT NULL,                    -- override de centro de costos si difiere del del usuario
  PRIMARY KEY (upr_id),
  UNIQUE KEY uq_usu_pro (usu_id, pro_id), -- evita duplicados
  CONSTRAINT fk_upr_usu FOREIGN KEY (usu_id) REFERENCES tbl_usuarios(usu_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_upr_pro FOREIGN KEY (pro_id) REFERENCES tbl_bloques(pro_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_upr_cco FOREIGN KEY (cco_id) REFERENCES tbl_centro_costos(cco_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;


