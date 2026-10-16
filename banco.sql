-- =====================================================================
-- banco.sql — Sistema Escolar Facial / Escola Inteligente
-- =====================================================================
-- Schema MySQL completo do sistema. O projeto nao usa ORM/migrations
-- (SQLAlchemy Core com sa.text() cru em app/api/v1/endpoints/*.py),
-- entao este arquivo e a fonte de verdade do banco.
--
-- Extraido via "mysqldump --no-data" do banco MySQL local ja em uso
-- pela aplicacao (escola_db) e organizado/documentado aqui, em vez de
-- reconstruido apenas por inspecao do codigo — garante fidelidade total
-- com o schema que a API realmente espera (inclui colunas e ENUMs que
-- ja existem no banco mas ainda nao sao todos usados pelos endpoints
-- atuais, ex.: foto_url, endereco, admitido_em, notificacao_enviada).
--
-- Convencoes:
--   - IDs em UUID texto (CHAR/VARCHAR(36)), com DEFAULT (uuid()) no
--     MySQL 8+ — a API tambem envia o uuid explicitamente no INSERT.
--   - "Exclusao" e sempre logica (UPDATE ... SET ativo = 0); nao ha
--     nenhum DELETE FROM no codigo-fonte da API.
--   - ATENCAO: este script usa "DROP TABLE IF EXISTS" antes de cada
--     CREATE TABLE (padrao de dump de schema). E seguro rodar contra
--     um banco NOVO/vazio (deploy). NAO rode contra um escola_db que
--     ja tenha dados em producao sem fazer backup antes.
--
-- Uso:
--   mysql -u escola_user -p escola_db < banco.sql
-- =====================================================================

CREATE DATABASE IF NOT EXISTS escola_db
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE escola_db;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================================
-- escola  (app/api/v1/endpoints/escolas.py)
-- =====================================================================
DROP TABLE IF EXISTS `escola`;
CREATE TABLE `escola` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `nome` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cnpj` varchar(18) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `endereco` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cidade` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` char(2) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `logo_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `criado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cnpj` (`cnpj`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- escola_config  (app/api/v1/endpoints/emergencia.py — numeros de
-- WhatsApp da guarda/diretor usados no acionamento de emergencia)
-- =====================================================================
DROP TABLE IF EXISTS `escola_config`;
CREATE TABLE `escola_config` (
  `escola_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `numero_guarda` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `numero_diretor` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `atualizado_em` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`escola_id`),
  CONSTRAINT `escola_config_ibfk_1` FOREIGN KEY (`escola_id`) REFERENCES `escola` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- usuario  (app/api/v1/endpoints/usuarios.py, auth.py, professores.py)
-- perfil: admin_rede, diretor, professor, operador, responsavel
-- (criado automaticamente ao cadastrar um responsavel, em responsaveis.py)
-- =====================================================================
DROP TABLE IF EXISTS `usuario`;
CREATE TABLE `usuario` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `escola_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nome` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `senha_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `perfil` enum('admin_rede','diretor','professor','operador','responsavel') COLLATE utf8mb4_unicode_ci NOT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `ultimo_acesso` datetime DEFAULT NULL,
  `criado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_usuario_email` (`email`),
  KEY `idx_usuario_escola` (`escola_id`,`perfil`,`ativo`),
  CONSTRAINT `fk_usuario_escola` FOREIGN KEY (`escola_id`) REFERENCES `escola` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_usuario_escola_perfil` CHECK (((`perfil` = _utf8mb4'admin_rede') or (`escola_id` is not null)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- turma  (app/api/v1/endpoints/turmas.py)
-- =====================================================================
DROP TABLE IF EXISTS `turma`;
CREATE TABLE `turma` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `escola_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `professor_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nome` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `serie` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `turno` enum('manha','tarde','noite','integral') COLLATE utf8mb4_unicode_ci NOT NULL,
  `ano_letivo` smallint NOT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `criado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_turma_professor` (`professor_id`),
  KEY `idx_turma_escola` (`escola_id`,`ano_letivo`),
  CONSTRAINT `fk_turma_escola` FOREIGN KEY (`escola_id`) REFERENCES `escola` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_turma_professor` FOREIGN KEY (`professor_id`) REFERENCES `usuario` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- aluno  (app/api/v1/endpoints/alunos.py)
-- matricula gerada automaticamente (ano + codigo da escola + sequencial)
-- =====================================================================
DROP TABLE IF EXISTS `aluno`;
CREATE TABLE `aluno` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `escola_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `turma_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nome` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `matricula` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `data_nascimento` date DEFAULT NULL,
  `foto_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `criado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_aluno_matricula` (`escola_id`,`matricula`),
  KEY `idx_aluno_escola` (`escola_id`,`ativo`),
  KEY `idx_aluno_turma` (`turma_id`),
  CONSTRAINT `fk_aluno_escola` FOREIGN KEY (`escola_id`) REFERENCES `escola` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_aluno_turma` FOREIGN KEY (`turma_id`) REFERENCES `turma` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- disciplina  (app/api/v1/endpoints/boletim.py — disciplinas formais de
-- uma turma, usadas no boletim/notas; nao confundir com o campo de
-- texto livre "aula.disciplina" usado no controle de presenca)
-- =====================================================================
DROP TABLE IF EXISTS `disciplina`;
CREATE TABLE `disciplina` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `turma_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `escola_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nome` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `professor_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `carga_horaria` int DEFAULT '40',
  `ativo` tinyint DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `turma_id` (`turma_id`),
  KEY `escola_id` (`escola_id`),
  CONSTRAINT `disciplina_ibfk_1` FOREIGN KEY (`turma_id`) REFERENCES `turma` (`id`),
  CONSTRAINT `disciplina_ibfk_2` FOREIGN KEY (`escola_id`) REFERENCES `escola` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- professor_disciplina_turma  (app/api/v1/endpoints/professores.py)
-- vincula um professor a uma disciplina dentro de uma turma
-- =====================================================================
DROP TABLE IF EXISTS `professor_disciplina_turma`;
CREATE TABLE `professor_disciplina_turma` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `usuario_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `disciplina_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `turma_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `escola_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ativo` tinyint DEFAULT '1',
  `criado_em` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unico_vinculo` (`usuario_id`,`disciplina_id`,`turma_id`),
  KEY `disciplina_id` (`disciplina_id`),
  KEY `turma_id` (`turma_id`),
  KEY `escola_id` (`escola_id`),
  CONSTRAINT `professor_disciplina_turma_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuario` (`id`),
  CONSTRAINT `professor_disciplina_turma_ibfk_2` FOREIGN KEY (`disciplina_id`) REFERENCES `disciplina` (`id`),
  CONSTRAINT `professor_disciplina_turma_ibfk_3` FOREIGN KEY (`turma_id`) REFERENCES `turma` (`id`),
  CONSTRAINT `professor_disciplina_turma_ibfk_4` FOREIGN KEY (`escola_id`) REFERENCES `escola` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- aula  (app/api/v1/endpoints/aulas.py — registro de uma aula ministrada,
-- usado para gerar a lista de presenca da turma)
-- =====================================================================
DROP TABLE IF EXISTS `aula`;
CREATE TABLE `aula` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `turma_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `professor_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `disciplina` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'texto livre informado na criacao da aula',
  `inicio` datetime NOT NULL,
  `fim` datetime DEFAULT NULL,
  `presenca_gerada` tinyint(1) NOT NULL DEFAULT '0',
  `observacoes` text COLLATE utf8mb4_unicode_ci,
  `criado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_aula_professor` (`professor_id`),
  KEY `idx_aula_turma_inicio` (`turma_id`,`inicio` DESC),
  CONSTRAINT `fk_aula_professor` FOREIGN KEY (`professor_id`) REFERENCES `usuario` (`id`),
  CONSTRAINT `fk_aula_turma` FOREIGN KEY (`turma_id`) REFERENCES `turma` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- dispositivo  (terminais Hikvision/catracas/cameras de sala. A busca em
-- app/api/v1/endpoints/isup.py usa "SELECT id FROM dispositivo WHERE
-- nome LIKE :nome", entao "nome" deve bater com os rotulos usados em
-- TERMINAIS_MAP, ex.: "Entrada 1", "Sala 2", "Saida 1")
-- =====================================================================
DROP TABLE IF EXISTS `dispositivo`;
CREATE TABLE `dispositivo` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `escola_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nome` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` enum('catraca_entrada','camera_sala','catraca_saida') COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip_endereco` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mac_address` varchar(17) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `localizacao` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `token_acesso` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `ultimo_ping` datetime DEFAULT NULL,
  `criado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_dispositivo_escola` (`escola_id`,`tipo`,`ativo`),
  CONSTRAINT `fk_dispositivo_escola` FOREIGN KEY (`escola_id`) REFERENCES `escola` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- presenca  (app/api/v1/endpoints/aulas.py, relatorios.py, boletim.py)
-- status: presente, ausente, justificado, atrasado
-- =====================================================================
DROP TABLE IF EXISTS `presenca`;
CREATE TABLE `presenca` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `aluno_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `turma_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `aula_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dispositivo_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `data_aula` date NOT NULL,
  `status` enum('presente','ausente','justificado','atrasado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ausente',
  `confianca` decimal(5,4) DEFAULT NULL,
  `justificativa` text COLLATE utf8mb4_unicode_ci,
  `registrado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_presenca_aluno_aula` (`aluno_id`,`aula_id`),
  KEY `fk_presenca_dispositivo` (`dispositivo_id`),
  KEY `idx_presenca_aula` (`aula_id`),
  KEY `idx_presenca_aluno_data` (`aluno_id`,`data_aula` DESC),
  KEY `idx_presenca_turma_data` (`turma_id`,`data_aula` DESC),
  CONSTRAINT `fk_presenca_aluno` FOREIGN KEY (`aluno_id`) REFERENCES `aluno` (`id`),
  CONSTRAINT `fk_presenca_aula` FOREIGN KEY (`aula_id`) REFERENCES `aula` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_presenca_dispositivo` FOREIGN KEY (`dispositivo_id`) REFERENCES `dispositivo` (`id`),
  CONSTRAINT `fk_presenca_turma` FOREIGN KEY (`turma_id`) REFERENCES `turma` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- nota  (app/api/v1/endpoints/boletim.py)
-- tipo default 'prova'; bimestre 1-4; valor 0-10 (validado na API)
-- =====================================================================
DROP TABLE IF EXISTS `nota`;
CREATE TABLE `nota` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `aluno_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `disciplina_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bimestre` int DEFAULT NULL,
  `valor` decimal(4,2) DEFAULT NULL,
  `tipo` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'prova',
  `observacao` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lancado_em` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `aluno_id` (`aluno_id`),
  KEY `disciplina_id` (`disciplina_id`),
  CONSTRAINT `nota_ibfk_1` FOREIGN KEY (`aluno_id`) REFERENCES `aluno` (`id`),
  CONSTRAINT `nota_ibfk_2` FOREIGN KEY (`disciplina_id`) REFERENCES `disciplina` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- responsavel  (app/api/v1/endpoints/responsaveis.py)
-- ao criar, a API tambem cria um login em "usuario" (perfil='responsavel',
-- email = numero@escola.app, senha = 6 ultimos digitos do telefone)
-- =====================================================================
DROP TABLE IF EXISTS `responsavel`;
CREATE TABLE `responsavel` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `aluno_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nome` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefone_whatsapp` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `parentesco` enum('pai','mae','avo','tio','responsavel_legal','outro') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'responsavel_legal',
  `notificacoes_ativas` tinyint(1) NOT NULL DEFAULT '1',
  `criado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_responsavel_aluno` (`aluno_id`),
  CONSTRAINT `fk_responsavel_aluno` FOREIGN KEY (`aluno_id`) REFERENCES `aluno` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- funcionario  (app/api/v1/endpoints/funcionarios.py)
-- =====================================================================
DROP TABLE IF EXISTS `funcionario`;
CREATE TABLE `funcionario` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `escola_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nome` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cpf` varchar(14) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cargo` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `departamento` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `foto_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `admitido_em` date DEFAULT NULL,
  `criado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cpf` (`cpf`),
  KEY `idx_funcionario_escola` (`escola_id`,`ativo`),
  CONSTRAINT `fk_funcionario_escola` FOREIGN KEY (`escola_id`) REFERENCES `escola` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- registro_acesso  (app/api/v1/endpoints/catraca.py, isup.py, acessos.py,
-- relatorios.py — entradas/saidas de alunos na catraca facial)
-- tipo_evento: entrada, saida, acesso_negado, presenca_sala
-- =====================================================================
DROP TABLE IF EXISTS `registro_acesso`;
CREATE TABLE `registro_acesso` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `aluno_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dispositivo_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `escola_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo_evento` enum('entrada','saida','acesso_negado','presenca_sala') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'entrada',
  `confianca` decimal(5,4) NOT NULL,
  `foto_captura_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notificacao_enviada` tinyint(1) NOT NULL DEFAULT '0',
  `ocorrido_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_acesso_dispositivo` (`dispositivo_id`),
  KEY `idx_acesso_aluno_tempo` (`aluno_id`,`ocorrido_em` DESC),
  KEY `idx_acesso_escola_tempo` (`escola_id`,`ocorrido_em` DESC),
  KEY `idx_acesso_notif` (`notificacao_enviada`),
  CONSTRAINT `fk_acesso_aluno` FOREIGN KEY (`aluno_id`) REFERENCES `aluno` (`id`),
  CONSTRAINT `fk_acesso_dispositivo` FOREIGN KEY (`dispositivo_id`) REFERENCES `dispositivo` (`id`),
  CONSTRAINT `fk_acesso_escola` FOREIGN KEY (`escola_id`) REFERENCES `escola` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- registro_ponto  (app/api/v1/endpoints/funcionarios.py — ponto
-- eletronico facial dos funcionarios)
-- tipo: entrada, saida, intervalo_inicio, intervalo_fim
-- =====================================================================
DROP TABLE IF EXISTS `registro_ponto`;
CREATE TABLE `registro_ponto` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `funcionario_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dispositivo_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` enum('entrada','saida','intervalo_inicio','intervalo_fim') COLLATE utf8mb4_unicode_ci NOT NULL,
  `confianca` decimal(5,4) NOT NULL,
  `foto_captura_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ocorrido_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_ponto_dispositivo` (`dispositivo_id`),
  KEY `idx_ponto_func_tempo` (`funcionario_id`,`ocorrido_em` DESC),
  CONSTRAINT `fk_ponto_dispositivo` FOREIGN KEY (`dispositivo_id`) REFERENCES `dispositivo` (`id`),
  CONSTRAINT `fk_ponto_funcionario` FOREIGN KEY (`funcionario_id`) REFERENCES `funcionario` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- emergencia_log  (app/api/v1/endpoints/emergencia.py — historico de
-- acionamentos do botao de panico/emergencia)
-- =====================================================================
DROP TABLE IF EXISTS `emergencia_log`;
CREATE TABLE `emergencia_log` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `escola_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `local` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `descricao` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `acionado_por` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `acionado_em` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `escola_id` (`escola_id`),
  CONSTRAINT `emergencia_log_ibfk_1` FOREIGN KEY (`escola_id`) REFERENCES `escola` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- camera  (app/api/v1/endpoints/cameras.py — cameras RTSP convertidas
-- para HLS e vinculadas a uma turma/sala)
-- =====================================================================
DROP TABLE IF EXISTS `camera`;
CREATE TABLE `camera` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `turma_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `escola_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nome` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rtsp_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `usuario` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'admin',
  `senha` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ativa` tinyint DEFAULT '1',
  `criado_em` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `turma_id` (`turma_id`),
  KEY `escola_id` (`escola_id`),
  CONSTRAINT `camera_ibfk_1` FOREIGN KEY (`turma_id`) REFERENCES `turma` (`id`),
  CONSTRAINT `camera_ibfk_2` FOREIGN KEY (`escola_id`) REFERENCES `escola` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- embedding_ref  (app/api/v1/endpoints/facial.py, funcionarios.py)
-- liga um registro local (aluno OU funcionario) ao ponto vetorial salvo
-- no Qdrant (collections "rostos_alunos"/"rostos_funcionarios").
-- entidade_id e polimorfico (aluno.id ou funcionario.id conforme
-- tipo_entidade), por isso nao ha FK direta nessa coluna.
-- =====================================================================
DROP TABLE IF EXISTS `embedding_ref`;
CREATE TABLE `embedding_ref` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `entidade_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo_entidade` enum('aluno','funcionario') COLLATE utf8mb4_unicode_ci NOT NULL,
  `qdrant_point_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `criado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_qdrant_point` (`qdrant_point_id`),
  KEY `idx_embedding_entidade` (`entidade_id`,`tipo_entidade`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- notificacao_log  (fila/historico de notificacoes de WhatsApp — alimenta
-- a view vw_notificacoes_pendentes; nao ha endpoint atual que grave aqui
-- diretamente, o envio de WhatsApp hoje e feito on-the-fly em aulas.py/
-- isup.py/emergencia.py, mas a tabela ja existe no schema para uma fila
-- com retentativa/confirmacao de entrega)
-- =====================================================================
DROP TABLE IF EXISTS `notificacao_log`;
CREATE TABLE `notificacao_log` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `registro_acesso_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `responsavel_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `canal` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'whatsapp',
  `mensagem` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('pendente','enviado','entregue','falhou') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendente',
  `tentativas` tinyint NOT NULL DEFAULT '0',
  `wamid` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `enviado_em` datetime DEFAULT NULL,
  `entregue_em` datetime DEFAULT NULL,
  `erro_detalhe` text COLLATE utf8mb4_unicode_ci,
  `criado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_notif_acesso` (`registro_acesso_id`),
  KEY `fk_notif_responsavel` (`responsavel_id`),
  KEY `idx_notif_status` (`status`,`criado_em`),
  CONSTRAINT `fk_notif_acesso` FOREIGN KEY (`registro_acesso_id`) REFERENCES `registro_acesso` (`id`),
  CONSTRAINT `fk_notif_responsavel` FOREIGN KEY (`responsavel_id`) REFERENCES `responsavel` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
-- VIEWS de apoio (dashboards/relatorios)
-- =====================================================================

DROP VIEW IF EXISTS `vw_acessos_hoje`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `vw_acessos_hoje` AS
SELECT
    a.id         AS aluno_id,
    a.nome       AS aluno_nome,
    t.nome       AS turma,
    e.nome       AS escola,
    ra.tipo_evento,
    ra.confianca,
    ra.ocorrido_em,
    ra.notificacao_enviada
FROM registro_acesso ra
JOIN aluno a ON a.id = ra.aluno_id
LEFT JOIN turma t ON t.id = a.turma_id
JOIN escola e ON e.id = ra.escola_id
WHERE CAST(ra.ocorrido_em AS date) = CURDATE()
ORDER BY ra.ocorrido_em DESC;

DROP VIEW IF EXISTS `vw_notificacoes_pendentes`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `vw_notificacoes_pendentes` AS
SELECT
    nl.id,
    r.nome AS responsavel,
    r.telefone_whatsapp,
    nl.mensagem,
    nl.tentativas,
    nl.status,
    nl.criado_em
FROM notificacao_log nl
JOIN responsavel r ON r.id = nl.responsavel_id
WHERE nl.status IN ('pendente', 'falhou') AND nl.tentativas < 3
ORDER BY nl.criado_em;

DROP VIEW IF EXISTS `vw_presenca_turma`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `vw_presenca_turma` AS
SELECT
    t.nome AS turma,
    e.nome AS escola,
    au.disciplina,
    CAST(au.inicio AS date) AS data_aula,
    SUM(p.status = 'presente') AS presentes,
    SUM(p.status = 'ausente')  AS ausentes,
    SUM(p.status = 'atrasado') AS atrasados,
    COUNT(*) AS total_alunos
FROM presenca p
JOIN aula au ON au.id = p.aula_id
JOIN turma t ON t.id = p.turma_id
JOIN escola e ON e.id = t.escola_id
GROUP BY t.nome, e.nome, au.disciplina, CAST(au.inicio AS date)
ORDER BY data_aula DESC;
