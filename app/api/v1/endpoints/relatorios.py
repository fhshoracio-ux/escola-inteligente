from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.units import cm
from datetime import datetime
import sqlalchemy as sa
from app.db.database import SessionLocal
import io

router = APIRouter(prefix="/relatorios", tags=["Relatorios"])

# ─── UTILITARIOS ────────────────────────────────────────────────────────────

def build_pdf(elementos):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
        rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    doc.build(elementos)
    buffer.seek(0)
    return buffer

def estilos():
    s = getSampleStyleSheet()
    titulo  = ParagraphStyle('titulo', parent=s['Title'],   fontSize=16, spaceAfter=6)
    sub     = ParagraphStyle('sub',    parent=s['Normal'],  fontSize=10, textColor=colors.grey)
    heading = s['Heading2']
    normal  = s['Normal']
    return s, titulo, sub, heading, normal

def tabela_padrao(dados, col_widths):
    t = Table(dados, colWidths=col_widths)
    t.setStyle(TableStyle([
        ('BACKGROUND',   (0,0), (-1,0), colors.HexColor('#6366f1')),
        ('TEXTCOLOR',    (0,0), (-1,0), colors.white),
        ('FONTNAME',     (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE',     (0,0), (-1,-1), 9),
        ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#f9fafb'), colors.white]),
        ('GRID',         (0,0), (-1,-1), 0.5, colors.HexColor('#e5e7eb')),
        ('TOPPADDING',   (0,0), (-1,-1), 6),
        ('BOTTOMPADDING',(0,0), (-1,-1), 6),
    ]))
    return t

# ─── 1. PRESENCA POR AULA ────────────────────────────────────────────────────

@router.get("/presenca/{aula_id}")
async def relatorio_presenca(aula_id: str):
    async with SessionLocal() as db:
        result = await db.execute(sa.text("""
            SELECT
                p.status, p.registrado_em,
                a.nome as aluno_nome, a.matricula,
                au.disciplina, au.inicio as aula_inicio,
                t.nome as turma, t.serie,
                e.nome as escola
            FROM presenca p
            JOIN aluno a ON a.id = p.aluno_id
            JOIN aula au ON au.id = p.aula_id
            JOIN turma t ON t.id = p.turma_id
            JOIN escola e ON e.id = t.escola_id
            WHERE p.aula_id = :aula_id
            ORDER BY a.nome
        """), {"aula_id": aula_id})
        rows = result.fetchall()

    if not rows:
        raise HTTPException(status_code=404, detail="Aula nao encontrada")

    info = rows[0]
    s, titulo_style, sub_style, heading, normal = estilos()
    elementos = []

    elementos.append(Paragraph(str(info.escola), titulo_style))
    elementos.append(Paragraph(f"Lista de Presenca — {info.disciplina}", heading))
    elementos.append(Paragraph(f"Turma: {info.turma} ({info.serie})", sub_style))
    data_aula = datetime.fromisoformat(str(info.aula_inicio)).strftime("%d/%m/%Y %H:%M")
    elementos.append(Paragraph(f"Data: {data_aula}", sub_style))
    elementos.append(Paragraph(f"Gerado em: {datetime.now().strftime('%d/%m/%Y %H:%M')}", sub_style))
    elementos.append(Spacer(1, 0.5*cm))

    presentes = sum(1 for r in rows if r.status == 'presente')
    ausentes  = sum(1 for r in rows if r.status == 'ausente')
    atrasados = sum(1 for r in rows if r.status == 'atrasado')
    total = len(rows)

    resumo = Table(
        [['Total','Presentes','Ausentes','Atrasados'],[str(total),str(presentes),str(ausentes),str(atrasados)]],
        colWidths=[4*cm,4*cm,4*cm,4*cm]
    )
    resumo.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0),colors.HexColor('#1e1b4b')),
        ('TEXTCOLOR',(0,0),(-1,0),colors.white),
        ('ALIGN',(0,0),(-1,-1),'CENTER'),
        ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),
        ('FONTSIZE',(0,0),(-1,-1),11),
        ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#f9fafb'),colors.white]),
        ('GRID',(0,0),(-1,-1),0.5,colors.HexColor('#e5e7eb')),
        ('TOPPADDING',(0,0),(-1,-1),8),
        ('BOTTOMPADDING',(0,0),(-1,-1),8),
    ]))
    elementos.append(resumo)
    elementos.append(Spacer(1, 0.5*cm))

    status_map = {'presente':'Presente','ausente':'Falta','atrasado':'Atrasado','justificado':'Justificado'}
    dados = [['#','Nome do Aluno','Matricula','Status']]
    for i, r in enumerate(rows, 1):
        dados.append([str(i), str(r.aluno_nome), str(r.matricula), status_map.get(r.status, r.status)])

    tabela = tabela_padrao(dados, [1*cm, 9*cm, 4*cm, 3*cm])
    cor_map = {'presente':colors.HexColor('#DCFCE7'),'ausente':colors.HexColor('#FEE2E2'),
               'atrasado':colors.HexColor('#FEF9C3'),'justificado':colors.HexColor('#DBEAFE')}
    for i, r in enumerate(rows, 1):
        tabela.setStyle(TableStyle([('BACKGROUND',(3,i),(3,i),cor_map.get(r.status,colors.white))]))

    elementos.append(tabela)
    elementos.append(Spacer(1, 1*cm))
    elementos.append(Paragraph("_" * 50, normal))
    elementos.append(Paragraph("Assinatura do Professor", sub_style))

    buffer = build_pdf(elementos)
    nome = f"presenca_{info.turma}_{datetime.now().strftime('%d%m%Y')}.pdf"
    return StreamingResponse(buffer, media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={nome}"})

# ─── 2. FREQUENCIA MENSAL POR ALUNO ─────────────────────────────────────────

@router.get("/frequencia/aluno/{aluno_id}")
async def relatorio_frequencia_aluno(
    aluno_id: str,
    mes: int = Query(default=datetime.now().month),
    ano: int = Query(default=datetime.now().year),
):
    async with SessionLocal() as db:
        result = await db.execute(sa.text("""
            SELECT
                p.status, p.data_aula,
                au.disciplina,
                t.nome as turma,
                e.nome as escola,
                a.nome as aluno_nome, a.matricula
            FROM presenca p
            JOIN aluno a ON a.id = p.aluno_id
            JOIN aula au ON au.id = p.aula_id
            JOIN turma t ON t.id = p.turma_id
            JOIN escola e ON e.id = t.escola_id
            WHERE p.aluno_id = :aluno_id
              AND MONTH(p.data_aula) = :mes
              AND YEAR(p.data_aula) = :ano
            ORDER BY p.data_aula, au.disciplina
        """), {"aluno_id": aluno_id, "mes": mes, "ano": ano})
        rows = result.fetchall()

    if not rows:
        raise HTTPException(status_code=404, detail="Nenhuma presenca encontrada")

    info = rows[0]
    s, titulo_style, sub_style, heading, normal = estilos()
    elementos = []

    meses = ['','Janeiro','Fevereiro','Março','Abril','Maio','Junho',
             'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

    elementos.append(Paragraph(str(info.escola), titulo_style))
    elementos.append(Paragraph(f"Frequência Mensal — {info.aluno_nome}", heading))
    elementos.append(Paragraph(f"Matrícula: {info.matricula} | Turma: {info.turma}", sub_style))
    elementos.append(Paragraph(f"Período: {meses[mes]}/{ano}", sub_style))
    elementos.append(Paragraph(f"Gerado em: {datetime.now().strftime('%d/%m/%Y %H:%M')}", sub_style))
    elementos.append(Spacer(1, 0.5*cm))

    total     = len(rows)
    presentes = sum(1 for r in rows if r.status == 'presente')
    ausentes  = sum(1 for r in rows if r.status == 'ausente')
    frequencia = (presentes / total * 100) if total > 0 else 0

    resumo = Table(
        [['Total Aulas','Presenças','Faltas','Frequência'],
         [str(total), str(presentes), str(ausentes), f"{frequencia:.1f}%"]],
        colWidths=[4*cm,4*cm,4*cm,4*cm]
    )
    resumo.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0),colors.HexColor('#1e1b4b')),
        ('TEXTCOLOR',(0,0),(-1,0),colors.white),
        ('ALIGN',(0,0),(-1,-1),'CENTER'),
        ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),
        ('FONTSIZE',(0,0),(-1,-1),11),
        ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#f9fafb'),colors.white]),
        ('GRID',(0,0),(-1,-1),0.5,colors.HexColor('#e5e7eb')),
        ('TOPPADDING',(0,0),(-1,-1),8),
        ('BOTTOMPADDING',(0,0),(-1,-1),8),
        ('BACKGROUND',(3,1),(3,1),
            colors.HexColor('#DCFCE7') if frequencia >= 75 else colors.HexColor('#FEE2E2')),
    ]))
    elementos.append(resumo)
    elementos.append(Spacer(1, 0.5*cm))

    status_map = {'presente':'Presente','ausente':'Falta','atrasado':'Atrasado','justificado':'Justificado'}
    dados = [['Data','Disciplina','Status']]
    for r in rows:
        data_fmt = datetime.strptime(str(r.data_aula), "%Y-%m-%d").strftime("%d/%m/%Y")
        dados.append([data_fmt, str(r.disciplina), status_map.get(r.status, r.status)])

    tabela = tabela_padrao(dados, [4*cm, 9*cm, 4*cm])
    cor_map = {'presente':colors.HexColor('#DCFCE7'),'ausente':colors.HexColor('#FEE2E2'),
               'atrasado':colors.HexColor('#FEF9C3'),'justificado':colors.HexColor('#DBEAFE')}
    for i, r in enumerate(rows, 1):
        tabela.setStyle(TableStyle([('BACKGROUND',(2,i),(2,i),cor_map.get(r.status,colors.white))]))

    elementos.append(tabela)

    buffer = build_pdf(elementos)
    nome = f"frequencia_{info.aluno_nome.replace(' ','_')}_{mes:02d}{ano}.pdf"
    return StreamingResponse(buffer, media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={nome}"})

# ─── 3. RESUMO POR TURMA ─────────────────────────────────────────────────────

@router.get("/turma/{turma_id}")
async def relatorio_turma(
    turma_id: str,
    mes: int = Query(default=datetime.now().month),
    ano: int = Query(default=datetime.now().year),
    disciplina: str = Query(default=None),
):
    filtro_disciplina = "AND au.disciplina = :disciplina" if disciplina else ""

    async with SessionLocal() as db:
        result = await db.execute(sa.text(f"""
            SELECT
                a.nome as aluno_nome, a.matricula,
                COUNT(*) as total_aulas,
                SUM(p.status = 'presente') as presentes,
                SUM(p.status = 'ausente') as ausentes,
                SUM(p.status = 'atrasado') as atrasados,
                t.nome as turma, t.serie,
                e.nome as escola
            FROM presenca p
            JOIN aluno a ON a.id = p.aluno_id
            JOIN aula au ON au.id = p.aula_id
            JOIN turma t ON t.id = p.turma_id
            JOIN escola e ON e.id = t.escola_id
            WHERE p.turma_id = :turma_id
              AND MONTH(p.data_aula) = :mes
              AND YEAR(p.data_aula) = :ano
              {filtro_disciplina}
            GROUP BY a.id, a.nome, a.matricula, t.nome, t.serie, e.nome
            ORDER BY a.nome
        """), {"turma_id": turma_id, "mes": mes, "ano": ano,
               **({"disciplina": disciplina} if disciplina else {})})
        rows = result.fetchall()

    if not rows:
        raise HTTPException(status_code=404, detail="Nenhum dado encontrado")

    info = rows[0]
    s, titulo_style, sub_style, heading, normal = estilos()
    elementos = []

    meses = ['','Janeiro','Fevereiro','Março','Abril','Maio','Junho',
             'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

    elementos.append(Paragraph(str(info.escola), titulo_style))
    elementos.append(Paragraph(f"Resumo de Frequência — {info.turma}", heading))
    elementos.append(Paragraph(f"Série: {info.serie} | Período: {meses[mes]}/{ano}", sub_style))
    if disciplina:
        elementos.append(Paragraph(f"Disciplina: {disciplina}", sub_style))
    elementos.append(Paragraph(f"Gerado em: {datetime.now().strftime('%d/%m/%Y %H:%M')}", sub_style))
    elementos.append(Spacer(1, 0.5*cm))

    dados = [['#','Aluno','Matrícula','Aulas','Pres.','Faltas','Atraso','Freq.%']]
    for i, r in enumerate(rows, 1):
        total = int(r.total_aulas) or 1
        freq  = int(r.presentes) / total * 100
        dados.append([
            str(i),
            str(r.aluno_nome),
            str(r.matricula),
            str(r.total_aulas),
            str(r.presentes),
            str(r.ausentes),
            str(r.atrasados),
            f"{freq:.1f}%",
        ])

    tabela = tabela_padrao(dados, [0.8*cm, 6.5*cm, 2.5*cm, 1.5*cm, 1.5*cm, 1.5*cm, 1.5*cm, 1.7*cm])
    for i, r in enumerate(rows, 1):
        total = int(r.total_aulas) or 1
        freq  = int(r.presentes) / total * 100
        cor = colors.HexColor('#DCFCE7') if freq >= 75 else colors.HexColor('#FEE2E2')
        tabela.setStyle(TableStyle([('BACKGROUND',(7,i),(7,i),cor)]))

    elementos.append(tabela)
    elementos.append(Spacer(1, 0.5*cm))

    # Legenda
    elementos.append(Paragraph("🟢 Frequência ≥ 75% — Regular  |  🔴 Frequência < 75% — Em risco", sub_style))

    buffer = build_pdf(elementos)
    nome = f"turma_{info.turma.replace(' ','_')}_{mes:02d}{ano}.pdf"
    return StreamingResponse(buffer, media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={nome}"})

# ─── 4. ACESSOS POR DATA ─────────────────────────────────────────────────────

@router.get("/acessos/{escola_id}")
async def relatorio_acessos(escola_id: str, data: str = None):
    data_filtro = data or datetime.now().strftime("%Y-%m-%d")

    async with SessionLocal() as db:
        result = await db.execute(sa.text("""
            SELECT
                ra.confianca, ra.ocorrido_em, ra.tipo_evento,
                a.nome as aluno_nome, a.matricula,
                t.nome as turma,
                e.nome as escola
            FROM registro_acesso ra
            JOIN aluno a ON a.id = ra.aluno_id
            LEFT JOIN turma t ON t.id = a.turma_id
            JOIN escola e ON e.id = ra.escola_id
            WHERE ra.escola_id = :escola_id
              AND DATE(ra.ocorrido_em) = :data
            ORDER BY ra.ocorrido_em
        """), {"escola_id": escola_id, "data": data_filtro})
        rows = result.fetchall()

        escola = await db.execute(sa.text(
            "SELECT nome FROM escola WHERE id = :id"
        ), {"id": escola_id})
        escola = escola.fetchone()

    s, titulo_style, sub_style, heading, normal = estilos()
    elementos = []

    elementos.append(Paragraph(escola.nome if escola else "Escola", titulo_style))
    elementos.append(Paragraph("Relatório de Acessos", heading))
    data_fmt = datetime.strptime(data_filtro, "%Y-%m-%d").strftime("%d/%m/%Y")
    elementos.append(Paragraph(f"Data: {data_fmt}", sub_style))
    elementos.append(Paragraph(f"Gerado em: {datetime.now().strftime('%d/%m/%Y %H:%M')}", sub_style))
    elementos.append(Spacer(1, 0.5*cm))

    if not rows:
        elementos.append(Paragraph("Nenhum acesso registrado nesta data.", s['Normal']))
    else:
        dados = [['Horário','Aluno','Matrícula','Turma','Confiança']]
        for r in rows:
            horario = datetime.fromisoformat(str(r.ocorrido_em)).strftime("%H:%M:%S")
            dados.append([horario, str(r.aluno_nome), str(r.matricula),
                          str(r.turma or '—'), f"{float(r.confianca)*100:.1f}%"])
        elementos.append(tabela_padrao(dados, [2.5*cm, 7*cm, 3*cm, 3*cm, 2.5*cm]))

    buffer = build_pdf(elementos)
    nome = f"acessos_{data_fmt.replace('/','')}.pdf"
    return StreamingResponse(buffer, media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={nome}"})