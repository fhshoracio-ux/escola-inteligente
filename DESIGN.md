# Novo design do painel — guia para o Claude Code

Referência visual: a imagem `referencia/design.png` (painel de outro sistema do mesmo autor).
Objetivo: aplicar ESSE estilo visual ao painel da Escola Inteligente, tela por tela.

## Regras (importante)

- Mude SÓ a aparência. Não altere chamadas à API (`api.get`, `api.post`...), endpoints,
  nomes de campos, regras de negócio nem o arquivo `src/api.js`.
- Não copie os textos do sistema de referência ("Portal municipal", "Nova solicitação"...).
  Use os textos da Escola Inteligente.
- Logo: use o arquivo `src/assets/logo-traipu.webp` (seção "Logo" abaixo).
- Use os ícones da biblioteca `lucide-react`, que já está instalada. Não instale bibliotecas
  novas sem perguntar.
- Trabalhe em etapas pequenas e pare ao fim de cada etapa para eu conferir no navegador.
- Mantenha o botão de pânico (`BotaoPanico`) funcionando e visível.

## Estrutura de código

- Crie `src/theme.js` com as cores, raios, sombras e fontes abaixo (um único lugar para mudar).
- Crie componentes reutilizáveis em `src/components/ui/`:
  `Card`, `StatCard`, `HeroBanner`, `PageHeader`, `Button`, `ProgressBar`, `StatusDot`.
- As páginas passam a usar esses componentes no lugar dos estilos soltos.
- Limpe o `src/index.css`: ele ainda tem restos do modelo do Vite (`#root` com largura fixa de
  1126px, tema escuro automático, cor roxa). Deixe só o reset básico, a fonte e o fundo.

## Cores

| Uso | Cor |
|---|---|
| Fundo da página | `#F8FAFC` |
| Fundo de cards e menu lateral | `#FFFFFF` |
| Bordas | `#E5E7EB` |
| Texto principal (títulos, números) | `#0F172A` |
| Texto normal | `#334155` |
| Texto secundário (legendas, subtítulos) | `#64748B` |
| Azul principal (botões, item ativo, barras) | `#2563EB` |
| Azul do degradê do banner | `#1D4ED8` → `#3B82F6` (esquerda para a direita) |
| Trilho das barras de progresso | `#E5E7EB` |

Cores de status (ícone colorido sobre fundo claro da mesma cor):

| Status | Ícone | Fundo do ícone |
|---|---|---|
| Neutro | `#64748B` | `#F1F5F9` |
| Azul / informação | `#2563EB` | `#DBEAFE` |
| Atenção | `#F59E0B` | `#FEF3C7` |
| Laranja | `#F97316` | `#FFEDD5` |
| Sucesso / presente | `#22C55E` | `#DCFCE7` |
| Erro / ausente | `#EF4444` | `#FEE2E2` |

## Tipografia

- Fonte: `Inter`, com `'Segoe UI', system-ui, sans-serif` de reserva (pode carregar a Inter
  pelo Google Fonts no `index.html`).
- Título do banner: 28px, peso 700, branco.
- Título de card: 15px, peso 600, texto principal.
- Subtítulo de card: 12px, texto secundário.
- Número grande dos cards de resumo: 24px, peso 700.
- Legendas: 12px, texto secundário.

## Formas e espaçamento

- Cards: fundo branco, borda 1px `#E5E7EB`, cantos arredondados de 14px,
  sombra bem leve (`0 1px 2px rgba(15,23,42,0.06)`), espaçamento interno de 20px.
- Banner: cantos de 16px, espaçamento interno de 28px 24px.
- Botões e itens do menu: cantos de 10px.
- Espaço entre cards: 16px. Conteúdo centralizado com largura máxima de ~1100px e 32px de margem.

## Logo

- Arquivo: `src/assets/logo-traipu.webp`. Importe no código
  (`import logoTraipu from './assets/logo-traipu.webp'`).
- Menu lateral: logo no topo, centralizado, com ~170px de largura e altura automática
  (sem distorcer), como na imagem de referência.
- Tela de login: o mesmo logo no topo do card, com ~200px de largura.
- Hoje o App.jsx troca o logo pelo que vem de `/escolas/` (`logo_url`). Mantenha o
  `logo-traipu.webp` como logo padrão do menu; se quiser manter a troca automática,
  pergunte antes de decidir.

## Menu lateral

- Largura ~250px, fundo branco, borda à direita `#E5E7EB`.
- Topo: logo `logo-traipu.webp` centralizado e, embaixo, o subtítulo
  "Painel escolar" em cinza. Linha divisória abaixo.
- Item: ícone lucide (18px) + texto 14px, cor `#334155`, espaçamento interno 10px 12px.
- Item ativo: fundo azul `#2563EB`, texto e ícone brancos, peso 600.
- Passar o mouse num item inativo: fundo `#F1F5F9`.
- Trocar os emojis atuais por ícones, por exemplo: Painel → `LayoutDashboard`,
  Presença → `CheckCircle`, Funcionários → `Briefcase`, Histórico → `History`,
  Gráfico → `BarChart3`, Alunos → `GraduationCap`, Cadastros → `ClipboardList`,
  Cadastro de rosto → `ScanFace`, Câmeras → `Camera`, Notas → `NotebookPen`,
  Plano de aula → `BookOpen`, Relatórios → `FileText`, Usuários → `Users`,
  Configurações → `Settings`.
- Rodapé (fixo embaixo, com linha divisória acima): "Olá, {nome}" em 12px cinza e o botão
  "Sair" com ícone `LogOut` vermelho.

## Dashboard

1. **Banner de boas-vindas** (topo): degradê azul; linha pequena em maiúsculas
   "PAINEL ESCOLAR" (12px, peso 600); título "Olá, {nome}!"; frase
   "Acompanhe presença, acessos e alunos em tempo real." em branco com leve transparência.
2. **Linha de cards de resumo**: cada card tem um ícone num quadrado de 40px com cantos de 10px
   (cores de status acima), o número grande e a legenda. Use os dados que o Dashboard já tem
   (escolas, alunos presentes hoje, entradas hoje...).
3. **Cards de análise** em grade de 3 colunas: título + subtítulo; gráficos com as cores do tema
   (rosca com o total no centro e legenda com bolinhas coloridas; barras horizontais finas,
   de 6px, azuis e arredondadas sobre o trilho cinza; listas de ranking "1º, 2º..." com barra).
4. **Lista de status** (ex.: funcionários presentes/ausentes): cada item numa caixa com borda,
   bolinha verde ou vermelha, nome em negrito e o status em cinza embaixo.

## Demais telas

- Topo de cada tela: `PageHeader` com título (22px, peso 700) e subtítulo cinza; ações
  (botões) alinhadas à direita.
- Tabelas dentro de um `Card`: cabeçalho 12px em maiúsculas cinza, linhas com borda inferior
  `#F1F5F9`, linha destacada ao passar o mouse.
- Formulários: campos com borda `#E5E7EB`, cantos de 10px, altura ~40px; ao focar, borda azul.
- Botão principal azul cheio; botão secundário branco com borda; botão de perigo vermelho.

## Tela de login

- Fundo `#F8FAFC`, card branco centralizado (largura ~400px) com o logo `logo-traipu.webp`, título,
  campos e botão azul ocupando a largura toda.
