-- Tabela principal de solicitações de matrícula
CREATE TABLE IF NOT EXISTS solicitacoes_matricula (
    id                    VARCHAR(36)  PRIMARY KEY,
    escola_id             VARCHAR(36)  NOT NULL,
    nome_aluno            VARCHAR(200) NOT NULL,
    data_nascimento       DATE,
    cpf_aluno             VARCHAR(14),
    nome_responsavel      VARCHAR(200) NOT NULL,
    cpf_responsavel       VARCHAR(14)  NOT NULL,
    telefone_responsavel  VARCHAR(20)  NOT NULL,
    tipo                  VARCHAR(20)  NOT NULL DEFAULT 'matricula',   -- matricula | rematricula | transferencia
    turma_desejada        VARCHAR(100),
    observacoes           TEXT,
    status                VARCHAR(20)  NOT NULL DEFAULT 'pendente',    -- pendente | em_analise | aprovado | rejeitado | correcao
    mensagem_coordenador  TEXT,
    criado_em             DATETIME     NOT NULL DEFAULT NOW(),
    atualizado_em         DATETIME,
    INDEX idx_escola_status (escola_id, status),
    INDEX idx_criado_em (criado_em)
);

-- Tabela de documentos enviados pelo responsável
CREATE TABLE IF NOT EXISTS documentos_matricula (
    id               VARCHAR(36)  PRIMARY KEY,
    solicitacao_id   VARCHAR(36)  NOT NULL,
    tipo             VARCHAR(50)  NOT NULL,   -- foto | rg | cpf | comprovante | historico | certidao
    caminho          VARCHAR(500) NOT NULL,
    enviado_em       DATETIME     NOT NULL DEFAULT NOW(),
    FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes_matricula(id) ON DELETE CASCADE,
    INDEX idx_solicitacao (solicitacao_id)
);
