/*
 Navicat Premium Dump SQL

 Source Server         : AndresBd
 Source Server Type    : MySQL
 Source Server Version : 100419 (10.4.19-MariaDB)
 Source Host           : localhost:3306
 Source Schema         : bdmotorhours

 Target Server Type    : MySQL
 Target Server Version : 100419 (10.4.19-MariaDB)
 File Encoding         : 65001

 Date: 06/03/2026 06:44:37
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for tbl_alistamiento_tasks
-- ----------------------------
DROP TABLE IF EXISTS `tbl_alistamiento_tasks`;
CREATE TABLE `tbl_alistamiento_tasks`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `active` tinyint(1) NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 19 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for tbl_estados
-- ----------------------------
DROP TABLE IF EXISTS `tbl_estados`;
CREATE TABLE `tbl_estados`  (
  `est_id` int NOT NULL AUTO_INCREMENT,
  `est_nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`est_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 6 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for tbl_estados_usuario
-- ----------------------------
DROP TABLE IF EXISTS `tbl_estados_usuario`;
CREATE TABLE `tbl_estados_usuario`  (
  `est_id` int NOT NULL AUTO_INCREMENT,
  `est_nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`est_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 6 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for tbl_motos
-- ----------------------------
DROP TABLE IF EXISTS `tbl_motos`;
CREATE TABLE `tbl_motos`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `pilot_id` int NOT NULL,
  `type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `fk_moto_pilot`(`pilot_id` ASC) USING BTREE,
  CONSTRAINT `fk_moto_pilot` FOREIGN KEY (`pilot_id`) REFERENCES `tbl_pilots` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 3 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for tbl_notificaciones
-- ----------------------------
DROP TABLE IF EXISTS `tbl_notificaciones`;
CREATE TABLE `tbl_notificaciones`  (
  `not_id` int NOT NULL AUTO_INCREMENT,
  `usu_id` int NOT NULL,
  `not_prioridad` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT 'media',
  `not_titulo` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `not_mensaje` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `not_tipo` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT 'informativa',
  `not_modulo` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `not_accion` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `not_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
  `not_fec_env` timestamp NOT NULL DEFAULT current_timestamp(),
  `not_visto` tinyint(1) NULL DEFAULT 0,
  `not_fec_visto` timestamp NULL DEFAULT NULL,
  `not_fec_act` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`not_id`) USING BTREE,
  INDEX `fk_not_usu`(`usu_id` ASC) USING BTREE,
  INDEX `idx_not_usuario_visto_fecha`(`usu_id` ASC, `not_visto` ASC, `not_fec_env` ASC) USING BTREE,
  INDEX `idx_not_modulo_tipo`(`not_modulo` ASC, `not_tipo` ASC) USING BTREE,
  INDEX `idx_not_mod_tipo_acc_fec`(`not_modulo` ASC, `not_tipo` ASC, `not_accion` ASC, `not_fec_env` ASC) USING BTREE,
  CONSTRAINT `fk_not_usu` FOREIGN KEY (`usu_id`) REFERENCES `tbl_usuarios` (`usu_id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 259 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for tbl_perfil
-- ----------------------------
DROP TABLE IF EXISTS `tbl_perfil`;
CREATE TABLE `tbl_perfil`  (
  `prf_id` int NOT NULL AUTO_INCREMENT,
  `prf_nombre` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `est_id` int NULL DEFAULT NULL,
  `prf_usu_reg` int NULL DEFAULT NULL,
  `prf_fec_reg` timestamp NULL DEFAULT current_timestamp(),
  `prf_usu_act` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `prf_fec_act` timestamp NULL DEFAULT current_timestamp() ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`prf_id`) USING BTREE,
  INDEX `fk_prf_estado`(`est_id` ASC) USING BTREE,
  INDEX `fk_prf_usu_reg`(`prf_usu_reg` ASC) USING BTREE,
  CONSTRAINT `fk_prf_estado` FOREIGN KEY (`est_id`) REFERENCES `tbl_estados` (`est_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_prf_usu_reg` FOREIGN KEY (`prf_usu_reg`) REFERENCES `tbl_usuarios` (`usu_id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 18 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for tbl_perfil_ventanas
-- ----------------------------
DROP TABLE IF EXISTS `tbl_perfil_ventanas`;
CREATE TABLE `tbl_perfil_ventanas`  (
  `pve_id` int NOT NULL AUTO_INCREMENT,
  `prf_id` int NOT NULL,
  `ven_id` int NOT NULL,
  PRIMARY KEY (`pve_id`) USING BTREE,
  INDEX `prf_id`(`prf_id` ASC) USING BTREE,
  INDEX `ven_id`(`ven_id` ASC) USING BTREE,
  CONSTRAINT `tbl_perfil_ventanas_ibfk_1` FOREIGN KEY (`prf_id`) REFERENCES `tbl_perfil` (`prf_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `tbl_perfil_ventanas_ibfk_2` FOREIGN KEY (`ven_id`) REFERENCES `tbl_ventanas` (`ven_id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 178 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for tbl_permisos
-- ----------------------------
DROP TABLE IF EXISTS `tbl_permisos`;
CREATE TABLE `tbl_permisos`  (
  `per_id` int NOT NULL AUTO_INCREMENT,
  `per_nombre` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NULL DEFAULT NULL,
  `ven_id` int NULL DEFAULT NULL,
  `per_orden` int NULL DEFAULT NULL,
  `per_descripcion` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  PRIMARY KEY (`per_id`) USING BTREE,
  INDEX `fk_per_ventana`(`ven_id` ASC) USING BTREE,
  CONSTRAINT `fk_per_ventana` FOREIGN KEY (`ven_id`) REFERENCES `tbl_ventanas` (`ven_id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 99 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for tbl_permisos_perfil
-- ----------------------------
DROP TABLE IF EXISTS `tbl_permisos_perfil`;
CREATE TABLE `tbl_permisos_perfil`  (
  `pep_id` int NOT NULL AUTO_INCREMENT,
  `per_id` int NOT NULL,
  `prf_id` int NOT NULL,
  PRIMARY KEY (`pep_id`) USING BTREE,
  INDEX `fk_pep_permiso`(`per_id` ASC) USING BTREE,
  INDEX `fk_pep_perfil`(`prf_id` ASC) USING BTREE,
  CONSTRAINT `fk_pep_perfil` FOREIGN KEY (`prf_id`) REFERENCES `tbl_perfil` (`prf_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_pep_permiso` FOREIGN KEY (`per_id`) REFERENCES `tbl_permisos` (`per_id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 225 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for tbl_permisos_usuarios
-- ----------------------------
DROP TABLE IF EXISTS `tbl_permisos_usuarios`;
CREATE TABLE `tbl_permisos_usuarios`  (
  `peu_id` int NOT NULL AUTO_INCREMENT,
  `per_id` int NOT NULL,
  `usu_id` int NOT NULL,
  PRIMARY KEY (`peu_id`) USING BTREE,
  INDEX `fk_peu_permiso`(`per_id` ASC) USING BTREE,
  INDEX `fk_peu_usuario`(`usu_id` ASC) USING BTREE,
  CONSTRAINT `fk_peu_permiso` FOREIGN KEY (`per_id`) REFERENCES `tbl_permisos` (`per_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_peu_usuario` FOREIGN KEY (`usu_id`) REFERENCES `tbl_usuarios` (`usu_id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 935 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for tbl_permisos_ventana
-- ----------------------------
DROP TABLE IF EXISTS `tbl_permisos_ventana`;
CREATE TABLE `tbl_permisos_ventana`  (
  `pev_id` int NOT NULL AUTO_INCREMENT,
  `prf_id` int NULL DEFAULT NULL,
  `ven_id` int NULL DEFAULT NULL,
  PRIMARY KEY (`pev_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 25 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for tbl_pilots
-- ----------------------------
DROP TABLE IF EXISTS `tbl_pilots`;
CREATE TABLE `tbl_pilots`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 3 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for tbl_prioridad
-- ----------------------------
DROP TABLE IF EXISTS `tbl_prioridad`;
CREATE TABLE `tbl_prioridad`  (
  `pri_id` int NOT NULL AUTO_INCREMENT,
  `pri_nombre` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  PRIMARY KEY (`pri_id`) USING BTREE,
  INDEX `idx_pri_id`(`pri_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 4 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for tbl_reglas
-- ----------------------------
DROP TABLE IF EXISTS `tbl_reglas`;
CREATE TABLE `tbl_reglas`  (
  `reg_id` int NOT NULL AUTO_INCREMENT,
  `reg_ipc` double NULL DEFAULT NULL,
  `reg_margen` double NULL DEFAULT NULL,
  `reg_const` double NULL DEFAULT NULL,
  `reg_tenant_id` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `reg_client_id` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `reg_client_secret` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `reg_usuario` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT '0',
  `reg_biblioteca` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `reg_sitio` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT 'sitio',
  `reg_ruta` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT 'ruta',
  `reg_carpeta` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `reg_dias_ven_cotizacion` int NULL DEFAULT NULL,
  `reg_usu_act` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `reg_fec_act` timestamp NULL DEFAULT current_timestamp() ON UPDATE CURRENT_TIMESTAMP,
  `reg_horario_inicio` time NULL DEFAULT NULL,
  `reg_horario_fin` time NULL DEFAULT NULL,
  `reg_anticipacion_minima_reagendar` int NULL DEFAULT NULL,
  `reg_permitir_cancelar_mismo_dia` tinyint(1) NULL DEFAULT NULL,
  `reg_notificar_antes_minutos` int NULL DEFAULT NULL,
  `reg_metodos_notificacion` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `reg_max_sesiones_dia` int NULL DEFAULT NULL,
  `reg_habilitar_whatsapp` tinyint(1) NULL DEFAULT NULL,
  `reg_whatsapp_token` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `reg_whatsapp_numero` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `reg_habilitar_sms` tinyint(1) NULL DEFAULT NULL,
  `reg_sms_apikey` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `reg_numero_principal` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT 'Número principal de contacto para el paciente, servicio al cliente.',
  `reg_otro_numero` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `reg_anticipacion_minima_cancelar` int NULL DEFAULT NULL,
  `reg_habilitar_cron_recordatorio` tinyint(1) NULL DEFAULT 0,
  `reg_recordar_n_dias_antes` tinyint(1) NULL DEFAULT 0,
  `reg_cron_dias_anticipacion` int NULL DEFAULT NULL,
  `reg_recordar_mismo_dia` tinyint(1) NULL DEFAULT 0,
  `reg_cron_horas_anticipacion` int NULL DEFAULT NULL,
  `reg_habilitar_correo` tinyint NULL DEFAULT NULL,
  PRIMARY KEY (`reg_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for tbl_service_alistamiento_tasks
-- ----------------------------
DROP TABLE IF EXISTS `tbl_service_alistamiento_tasks`;
CREATE TABLE `tbl_service_alistamiento_tasks`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `service_id` int NOT NULL,
  `alistamiento_task_id` int NOT NULL,
  `is_done` tinyint(1) NOT NULL,
  `observations` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `fk_sat_service`(`service_id` ASC) USING BTREE,
  INDEX `fk_sat_task`(`alistamiento_task_id` ASC) USING BTREE,
  CONSTRAINT `fk_sat_service` FOREIGN KEY (`service_id`) REFERENCES `tbl_services` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_sat_task` FOREIGN KEY (`alistamiento_task_id`) REFERENCES `tbl_alistamiento_tasks` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 17 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for tbl_service_repairs
-- ----------------------------
DROP TABLE IF EXISTS `tbl_service_repairs`;
CREATE TABLE `tbl_service_repairs`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `service_id` int NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `cost` decimal(10, 2) NULL DEFAULT NULL,
  `status` enum('PENDIENTE','EN_PROCESO','FINALIZADO') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT 'PENDIENTE',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `fk_repair_service`(`service_id` ASC) USING BTREE,
  CONSTRAINT `fk_repair_service` FOREIGN KEY (`service_id`) REFERENCES `tbl_services` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for tbl_services
-- ----------------------------
DROP TABLE IF EXISTS `tbl_services`;
CREATE TABLE `tbl_services`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `moto_id` int NOT NULL,
  `service_type` enum('ALISTAMIENTO','REPARACION') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `moto_hours` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `fk_service_moto`(`moto_id` ASC) USING BTREE,
  CONSTRAINT `fk_service_moto` FOREIGN KEY (`moto_id`) REFERENCES `tbl_motos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 4 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for tbl_tipo_documento
-- ----------------------------
DROP TABLE IF EXISTS `tbl_tipo_documento`;
CREATE TABLE `tbl_tipo_documento`  (
  `tpd_id` int NOT NULL AUTO_INCREMENT,
  `tpd_nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`tpd_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for tbl_usuario_proyecto
-- ----------------------------
DROP TABLE IF EXISTS `tbl_usuario_proyecto`;
CREATE TABLE `tbl_usuario_proyecto`  (
  `upr_id` int NOT NULL AUTO_INCREMENT,
  `usu_id` int NOT NULL,
  `blo_id` int NOT NULL,
  PRIMARY KEY (`upr_id`) USING BTREE,
  UNIQUE INDEX `uq_usuario_proyecto`(`usu_id` ASC, `blo_id` ASC) USING BTREE,
  INDEX `fk_upr_proyecto`(`blo_id` ASC) USING BTREE,
  CONSTRAINT `fk_upr_proyecto` FOREIGN KEY (`blo_id`) REFERENCES `tbl_bloques` (`blo_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_upr_usuario` FOREIGN KEY (`usu_id`) REFERENCES `tbl_usuarios` (`usu_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 3085 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for tbl_usuario_tipo_reembolso
-- ----------------------------
DROP TABLE IF EXISTS `tbl_usuario_tipo_reembolso`;
CREATE TABLE `tbl_usuario_tipo_reembolso`  (
  `utr_id` int NOT NULL AUTO_INCREMENT,
  `usu_id` int NOT NULL,
  `tir_id` int NOT NULL,
  PRIMARY KEY (`utr_id`) USING BTREE,
  UNIQUE INDEX `uq_usuario_proyecto`(`usu_id` ASC, `tir_id` ASC) USING BTREE,
  INDEX `fk_upr_proyecto`(`tir_id` ASC) USING BTREE,
  CONSTRAINT `tbl_usuario_tipo_reembolso_ibfk_1` FOREIGN KEY (`tir_id`) REFERENCES `tbl_tipo_reembolsable` (`tir_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `tbl_usuario_tipo_reembolso_ibfk_2` FOREIGN KEY (`usu_id`) REFERENCES `tbl_usuarios` (`usu_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 450 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for tbl_usuarios
-- ----------------------------
DROP TABLE IF EXISTS `tbl_usuarios`;
CREATE TABLE `tbl_usuarios`  (
  `usu_id` int NOT NULL AUTO_INCREMENT,
  `tpd_id` int NULL DEFAULT 1,
  `usu_documento` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `usu_nombre` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `usu_apellido` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `usu_fec_nacimiento` date NULL DEFAULT NULL,
  `usu_telefono` varchar(11) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `usu_direccion` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT 'Dirección cliente',
  `gen_id` int NULL DEFAULT NULL,
  `pai_id` int NULL DEFAULT NULL,
  `ciu_id` int NULL DEFAULT NULL,
  `usu_usuario` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `usu_correo` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `usu_clave` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `prf_id` int NULL DEFAULT NULL,
  `usu_valor_hora` double NULL DEFAULT NULL,
  `usu_acceso` smallint NULL DEFAULT 1 COMMENT 'acceso al sistema 1: SI, 0: NO',
  `usu_cambio` smallint NULL DEFAULT 1,
  `est_id` int NULL DEFAULT 1,
  `usu_reg` int NULL DEFAULT NULL,
  `usu_fec_reg` timestamp NULL DEFAULT current_timestamp(),
  `usu_usu_act` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `usu_fec_act` timestamp NULL DEFAULT current_timestamp() ON UPDATE CURRENT_TIMESTAMP,
  `usu_verificado` smallint NULL DEFAULT 0,
  `usu_foto` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL,
  `usu_areas` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT 'Lista de areas separadas por una coma',
  `car_id` int NULL DEFAULT NULL COMMENT 'Cargo',
  `cco_id` int NULL DEFAULT NULL COMMENT 'Centro de costos',
  `usu_agenda` smallint NULL DEFAULT 0 COMMENT 'Agenda 1: SI, 0: NO',
  `usu_requiere_confirmacion` int NULL DEFAULT NULL,
  `usu_instructor` smallint NULL DEFAULT 0 COMMENT 'Es instructor 1: SI, 0: NO',
  `emp_id` int NULL DEFAULT NULL COMMENT 'Empleado id que viene de la importacion.',
  `ins_id` int NULL DEFAULT NULL COMMENT 'Relacion con instituto',
  PRIMARY KEY (`usu_id`) USING BTREE,
  UNIQUE INDEX `uniq_usu_usuario`(`usu_usuario` ASC) USING BTREE,
  INDEX `fk_usu_perfil`(`prf_id` ASC) USING BTREE,
  INDEX `fk_usu_estado`(`est_id` ASC) USING BTREE,
  INDEX `fk_usu_reg`(`usu_reg` ASC) USING BTREE,
  INDEX `tpd_id`(`tpd_id` ASC) USING BTREE,
  INDEX `gen_id`(`gen_id` ASC) USING BTREE,
  INDEX `pai_id`(`pai_id` ASC) USING BTREE,
  INDEX `ciu_id`(`ciu_id` ASC) USING BTREE,
  INDEX `idx_usu_perfil_estado`(`prf_id` ASC, `est_id` ASC) USING BTREE,
  INDEX `idx_usu_pais_ciudad`(`pai_id` ASC, `ciu_id` ASC) USING BTREE,
  INDEX `fk_usu_cargo`(`car_id` ASC) USING BTREE,
  INDEX `fk_usu_cco`(`cco_id` ASC) USING BTREE,
  FULLTEXT INDEX `ftx_usu_nombre_busq`(`usu_nombre`, `usu_apellido`, `usu_usuario`, `usu_correo`),
  CONSTRAINT `fk_usu_cargo` FOREIGN KEY (`car_id`) REFERENCES `tbl_cargos` (`car_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_usu_cco` FOREIGN KEY (`cco_id`) REFERENCES `tbl_centro_costos` (`cco_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_usu_estado` FOREIGN KEY (`est_id`) REFERENCES `tbl_estados_usuario` (`est_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_usu_perfil` FOREIGN KEY (`prf_id`) REFERENCES `tbl_perfil` (`prf_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_usu_reg` FOREIGN KEY (`usu_reg`) REFERENCES `tbl_usuarios` (`usu_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `tbl_usuarios_ibfk_1` FOREIGN KEY (`tpd_id`) REFERENCES `tbl_tipo_documento` (`tpd_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `tbl_usuarios_ibfk_2` FOREIGN KEY (`gen_id`) REFERENCES `tbl_genero` (`gen_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `tbl_usuarios_ibfk_3` FOREIGN KEY (`pai_id`) REFERENCES `tbl_pais` (`pai_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `tbl_usuarios_ibfk_4` FOREIGN KEY (`ciu_id`) REFERENCES `tbl_ciudad` (`ciu_id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 7842 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for tbl_usuarios_copy1
-- ----------------------------
DROP TABLE IF EXISTS `tbl_usuarios_copy1`;
CREATE TABLE `tbl_usuarios_copy1`  (
  `usu_id` int NOT NULL AUTO_INCREMENT,
  `tpd_id` int NULL DEFAULT 1,
  `usu_documento` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `usu_nombre` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `usu_apellido` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `usu_fec_nacimiento` date NULL DEFAULT NULL,
  `usu_telefono` varchar(11) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `gen_id` int NULL DEFAULT NULL,
  `pai_id` int NULL DEFAULT NULL,
  `ciu_id` int NULL DEFAULT NULL,
  `usu_usuario` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `usu_correo` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `usu_clave` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `prf_id` int NULL DEFAULT NULL,
  `usu_valor_hora` double NULL DEFAULT NULL,
  `usu_acceso` smallint NULL DEFAULT 1 COMMENT 'acceso al sistema 1: SI, 0: NO',
  `usu_cambio` smallint NULL DEFAULT 1,
  `est_id` int NULL DEFAULT 1,
  `usu_reg` int NULL DEFAULT NULL,
  `usu_fec_reg` timestamp NULL DEFAULT current_timestamp(),
  `usu_usu_act` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `usu_fec_act` timestamp NULL DEFAULT current_timestamp() ON UPDATE CURRENT_TIMESTAMP,
  `usu_verificado` smallint NULL DEFAULT 0,
  `usu_foto` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL,
  `usu_areas` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT 'Lista de areas separadas por una coma',
  `car_id` int NULL DEFAULT NULL COMMENT 'Cargo',
  `cco_id` int NULL DEFAULT NULL COMMENT 'Centro de costos',
  `usu_agenda` smallint NULL DEFAULT 0 COMMENT 'Agenda 1: SI, 0: NO',
  `usu_requiere_confirmacion` int NULL DEFAULT NULL,
  `usu_instructor` smallint NULL DEFAULT 0 COMMENT 'Es instructor 1: SI, 0: NO',
  `emp_id` int NULL DEFAULT NULL COMMENT 'Empleado id que viene de la importacion.',
  `ins_id` int NULL DEFAULT NULL COMMENT 'Relacion con instituto',
  PRIMARY KEY (`usu_id`) USING BTREE,
  UNIQUE INDEX `uniq_usu_usuario`(`usu_usuario` ASC) USING BTREE,
  INDEX `fk_usu_perfil`(`prf_id` ASC) USING BTREE,
  INDEX `fk_usu_estado`(`est_id` ASC) USING BTREE,
  INDEX `fk_usu_reg`(`usu_reg` ASC) USING BTREE,
  INDEX `tpd_id`(`tpd_id` ASC) USING BTREE,
  INDEX `gen_id`(`gen_id` ASC) USING BTREE,
  INDEX `pai_id`(`pai_id` ASC) USING BTREE,
  INDEX `ciu_id`(`ciu_id` ASC) USING BTREE,
  INDEX `idx_usu_perfil_estado`(`prf_id` ASC, `est_id` ASC) USING BTREE,
  INDEX `idx_usu_pais_ciudad`(`pai_id` ASC, `ciu_id` ASC) USING BTREE,
  INDEX `fk_usu_cargo`(`car_id` ASC) USING BTREE,
  INDEX `fk_usu_cco`(`cco_id` ASC) USING BTREE,
  FULLTEXT INDEX `ftx_usu_nombre_busq`(`usu_nombre`, `usu_apellido`, `usu_usuario`, `usu_correo`),
  CONSTRAINT `tbl_usuarios_copy1_ibfk_1` FOREIGN KEY (`car_id`) REFERENCES `tbl_cargos` (`car_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `tbl_usuarios_copy1_ibfk_2` FOREIGN KEY (`cco_id`) REFERENCES `tbl_centro_costos` (`cco_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `tbl_usuarios_copy1_ibfk_3` FOREIGN KEY (`est_id`) REFERENCES `tbl_estados_usuario` (`est_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `tbl_usuarios_copy1_ibfk_4` FOREIGN KEY (`prf_id`) REFERENCES `tbl_perfil` (`prf_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `tbl_usuarios_copy1_ibfk_5` FOREIGN KEY (`usu_reg`) REFERENCES `tbl_usuarios` (`usu_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `tbl_usuarios_copy1_ibfk_6` FOREIGN KEY (`tpd_id`) REFERENCES `tbl_tipo_documento` (`tpd_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `tbl_usuarios_copy1_ibfk_7` FOREIGN KEY (`gen_id`) REFERENCES `tbl_genero` (`gen_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `tbl_usuarios_copy1_ibfk_8` FOREIGN KEY (`pai_id`) REFERENCES `tbl_pais` (`pai_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `tbl_usuarios_copy1_ibfk_9` FOREIGN KEY (`ciu_id`) REFERENCES `tbl_ciudad` (`ciu_id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 7026 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for tbl_usuarios_ventanas
-- ----------------------------
DROP TABLE IF EXISTS `tbl_usuarios_ventanas`;
CREATE TABLE `tbl_usuarios_ventanas`  (
  `uve_id` int NOT NULL AUTO_INCREMENT,
  `usu_id` int NOT NULL,
  `ven_id` int NOT NULL,
  PRIMARY KEY (`uve_id`) USING BTREE,
  INDEX `usu_id`(`usu_id` ASC) USING BTREE,
  INDEX `ven_id`(`ven_id` ASC) USING BTREE,
  CONSTRAINT `tbl_usuarios_ventanas_ibfk_1` FOREIGN KEY (`usu_id`) REFERENCES `tbl_usuarios` (`usu_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `tbl_usuarios_ventanas_ibfk_2` FOREIGN KEY (`ven_id`) REFERENCES `tbl_ventanas` (`ven_id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 1952 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for tbl_ventanas
-- ----------------------------
DROP TABLE IF EXISTS `tbl_ventanas`;
CREATE TABLE `tbl_ventanas`  (
  `ven_id` int NOT NULL AUTO_INCREMENT,
  `ven_descripcion` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `ven_padre` int NULL DEFAULT NULL,
  `ven_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `ven_icono` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `ven_orden` int NULL DEFAULT NULL,
  `ven_nombre` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `ven_tipo` int NULL DEFAULT NULL COMMENT '1 PADRE,  2 HIJO',
  PRIMARY KEY (`ven_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 38 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

SET FOREIGN_KEY_CHECKS = 1;
