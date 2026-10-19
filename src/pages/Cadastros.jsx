import { useEffect, useRef, useState } from 'react'
import api from '../api'

const BASE_URL = api.defaults.baseURL.replace('/api/v1', '')

export default function Cadastros() {
  const [aba, setAba] = useState('escola')
  const [escolas, setEscolas] = useState([])
  const [alunos, setAlunos] = useState([])
  const [turmas, setTurmas] = useState([])
  const [escolaId, setEscolaId] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [escola, setEscola] = useState({ nome: '', cidade: '', estado: '', telefone: '', email: '' })
  const [turma, setTurma] = useState({ escola_id: '', nome: '', serie: '', turno: 'manha', ano_letivo: new Date().getFullYear().toString() })
  const [aluno, setAluno] = useState({ escola_id: '', turma_id: '', nome: '', matricula: '', data_nascimento: '' })
  const [responsavel, setResponsavel] = useState({ aluno_id: '', nome: '', telefone_whatsapp: '', email: '', parentesco: 'mae' })
  const [disciplina, setDisciplina] = useState({ escola_id: '', turma_id: '', nome: '', carga_horaria: 60 })
  const [disciplinas, setDisciplinas] = useState([])
  const [logoEscolaId, setLogoEscolaId] = useState('')
  const [logoPreview, setLogoPreview] = useState(null)
  const [logoFile, setLogoFile] = useState(null)
  const [uploadando, setUploadando] = useState(false)

  // Modal de rosto
  const [modalRosto, setModalRosto] = useState(null)
  const [modoRosto, setModoRosto] = useState('webcam')
  const [webcamAtiva, setWebcamAtiva] = useState(false)
  const [fotoCapturada, setFotoCapturada] = useState(null)
  const [loadingRosto, setLoadingRosto] = useState(false)
  const [mensagemRosto, setMensagemRosto] = useState('')
  const [etapaModal, setEtapaModal] = useState('rosto') // 'rosto' ou 'responsavel'
  const [responsavelModal, setResponsavelModal] = useState({ nome: '', telefone_whatsapp: '', email: '', parentesco: 'mae' })
  const [salvandoResp, setSalvandoResp] = useState(false)
  const [mensagemResp, setMensagemResp] = useState('')
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => { carregarEscolas() }, [])

  useEffect(() => {
    if (!escolaId) return
    api.get('/alunos/escola/' + escolaId).then(r => setAlunos(r.data))
    api.get('/turmas/escola/' + escolaId).then(r => setTurmas(r.data))
  }, [escolaId])

  useEffect(() => {
    if (!disciplina.turma_id) return
    api.get('/boletim/disciplinas/turma/' + disciplina.turma_id).then(r => setDisciplinas(r.data)).catch(() => setDisciplinas([]))
  }, [disciplina.turma_id])

  useEffect(() => {
    if (!aluno.escola_id) return
    api.get('/alunos/matricula/proxima/' + aluno.escola_id).then(r => {
      setAluno(prev => ({ ...prev, matricula: r.data.matricula }))
    }).catch(() => {})
    setEscolaId(aluno.escola_id)
  }, [aluno.escola_id])

  async function carregarEscolas() {
    const res = await api.get('/escolas/')
    setEscolas(res.data)
    if (res.data.length > 0) setEscolaId(res.data[0].id)
  }

  async function salvarEscola() {
    try {
      await api.post('/escolas/', escola)
      setMensagem('Escola cadastrada!')
      setErro('')
      setEscola({ nome: '', cidade: '', estado: '', telefone: '', email: '' })
      carregarEscolas()
    } catch { setErro('Erro ao cadastrar escola.'); setMensagem('') }
  }

  async function salvarTurma() {
    if (!turma.escola_id || !turma.nome) { setErro('Escola e nome sao obrigatorios.'); return }
    try {
      await api.post('/turmas/', turma)
      setMensagem('Turma cadastrada!')
      setErro('')
      setTurma({ escola_id: '', nome: '', serie: '', turno: 'manha', ano_letivo: new Date().getFullYear().toString() })
    } catch { setErro('Erro ao cadastrar turma.'); setMensagem('') }
  }

  async function salvarAluno() {
    if (!aluno.escola_id || !aluno.nome) { setErro('Escola e nome sao obrigatorios.'); return }
    try {
      const res = await api.post('/alunos/', aluno)
      setMensagem('Aluno cadastrado! Matricula: ' + res.data.matricula)
      setErro('')
      setModalRosto({ id: res.data.id, nome: res.data.nome })
      setEtapaModal('rosto')
      setResponsavelModal({ nome: '', telefone_whatsapp: '', email: '', parentesco: 'mae' })
      setMensagemResp('')
      setAluno({ escola_id: '', turma_id: '', nome: '', matricula: '', data_nascimento: '' })
    } catch { setErro('Erro ao cadastrar aluno.'); setMensagem('') }
  }

  async function salvarResponsavel() {
    if (!responsavel.aluno_id || !responsavel.nome || !responsavel.telefone_whatsapp) {
      setErro('Aluno, nome e telefone sao obrigatorios.'); return
    }
    try {
      await api.post('/responsaveis/', responsavel)
      setMensagem('Responsavel cadastrado!')
      setErro('')
      setResponsavel({ aluno_id: '', nome: '', telefone_whatsapp: '', email: '', parentesco: 'mae' })
    } catch { setErro('Erro ao cadastrar responsavel.'); setMensagem('') }
  }

  async function salvarResponsavelModal() {
    if (!responsavelModal.nome || !responsavelModal.telefone_whatsapp) {
      setMensagemResp('Nome e telefone sao obrigatorios.'); return
    }
    setSalvandoResp(true)
    try {
      await api.post('/responsaveis/', {
        aluno_id: modalRosto.id,
        ...responsavelModal
      })
      setMensagemResp('✅ Responsavel cadastrado com sucesso!')
    } catch {
      setMensagemResp('❌ Erro ao cadastrar responsavel.')
    } finally {
      setSalvandoResp(false)
    }
  }

  async function salvarDisciplina() {
    if (!disciplina.escola_id || !disciplina.turma_id || !disciplina.nome) {
      setErro('Escola, turma e nome sao obrigatorios.'); return
    }
    try {
      await api.post('/boletim/disciplinas', disciplina)
      setMensagem('Disciplina cadastrada!')
      setErro('')
      api.get('/boletim/disciplinas/turma/' + disciplina.turma_id).then(r => setDisciplinas(r.data))
      setDisciplina(prev => ({ ...prev, nome: '', carga_horaria: 60 }))
    } catch { setErro('Erro ao cadastrar disciplina.'); setMensagem('') }
  }

  async function enviarLogo() {
    if (!logoEscolaId || !logoFile) { setErro('Selecione escola e logo.'); return }
    setUploadando(true)
    try {
      const form = new FormData()
      form.append('logo', logoFile)
      await api.post('/escolas/' + logoEscolaId + '/logo', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      setMensagem('Logo enviada!')
      setErro('')
      setLogoFile(null)
      setLogoPreview(null)
      carregarEscolas()
    } catch { setErro('Erro ao enviar logo.'); setMensagem('') }
    finally { setUploadando(false) }
  }

  async function iniciarWebcam() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      streamRef.current = stream
      videoRef.current.srcObject = stream
      setWebcamAtiva(true)
      setFotoCapturada(null)
    } catch { setErro('Nao foi possivel acessar a webcam.') }
  }

  function pararWebcam() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setWebcamAtiva(false)
  }

  function capturarFoto() {
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob(blob => {
      setFotoCapturada(blob)
      pararWebcam()
    }, 'image/jpeg')
  }

  async function enviarRosto(arquivo) {
    if (!modalRosto) return
    setLoadingRosto(true)
    setMensagemRosto('')
    try {
      const form = new FormData()
      form.append('foto', arquivo, 'foto.jpg')
      const res = await api.post('/facial/cadastrar-rosto/' + modalRosto.id, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setMensagemRosto('✅ Rosto cadastrado! Confianca: ' + (res.data.confianca_deteccao * 100).toFixed(1) + '%')
      setFotoCapturada(null)
    } catch (err) {
      setMensagemRosto('❌ ' + (err.response?.data?.detail || 'Falha ao cadastrar rosto.'))
    } finally {
      setLoadingRosto(false)
    }
  }

  function fecharModalRosto() {
    pararWebcam()
    setModalRosto(null)
    setFotoCapturada(null)
    setMensagemRosto('')
    setWebcamAtiva(false)
    setEtapaModal('rosto')
    setResponsavelModal({ nome: '', telefone_whatsapp: '', email: '', parentesco: 'mae' })
    setMensagemResp('')
  }

  const input = {
    width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px',
    border: '1px solid #e5e7eb', fontSize: '0.9rem', marginBottom: '0.75rem', boxSizing: 'border-box'
  }
  const btn = {
    background: '#6366f1', color: 'white', border: 'none',
    padding: '0.6rem 1.5rem', borderRadius: '8px', cursor: 'pointer',
    fontSize: '0.9rem', fontWeight: 500, marginTop: '0.5rem'
  }

  const abas = [
    { id: 'escola', label: 'Nova Escola' },
    { id: 'turma', label: 'Nova Turma' },
    { id: 'disciplina', label: 'Disciplinas' },
    { id: 'professor', label: 'Professor' },
    { id: 'aluno', label: 'Novo Aluno' },
    { id: 'responsavel', label: 'Responsavel' },
    { id: 'logo', label: 'Logotipo' },
  ]

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem' }}>Cadastros</h1>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {abas.map(a => (
          <button key={a.id} onClick={() => { setAba(a.id); setMensagem(''); setErro('') }}
            style={{
              padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none',
              cursor: 'pointer', fontWeight: 500, fontSize: '0.9rem',
              background: aba === a.id ? '#6366f1' : '#f3f4f6',
              color: aba === a.id ? 'white' : '#374151',
            }}>
            {a.label}
          </button>
        ))}
      </div>

      {mensagem && <div style={{ background: '#DCFCE7', color: '#166534', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem' }}>{mensagem}</div>}
      {erro && <div style={{ background: '#FEE2E2', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem' }}>{erro}</div>}

      <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e5e7eb', maxWidth: 500 }}>

        {aba === 'escola' && (
          <>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Nova Escola</h2>
            <input style={input} placeholder="Nome *" value={escola.nome} onChange={e => setEscola({ ...escola, nome: e.target.value })} />
            <input style={input} placeholder="Cidade" value={escola.cidade} onChange={e => setEscola({ ...escola, cidade: e.target.value })} />
            <input style={input} placeholder="Estado (ex: AL)" maxLength={2} value={escola.estado} onChange={e => setEscola({ ...escola, estado: e.target.value })} />
            <input style={input} placeholder="Telefone" value={escola.telefone} onChange={e => setEscola({ ...escola, telefone: e.target.value })} />
            <input style={input} placeholder="Email" value={escola.email} onChange={e => setEscola({ ...escola, email: e.target.value })} />
            <button style={btn} onClick={salvarEscola}>Salvar Escola</button>
          </>
        )}

        {aba === 'turma' && (
          <>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Nova Turma</h2>
            <select style={input} value={turma.escola_id} onChange={e => setTurma({ ...turma, escola_id: e.target.value })}>
              <option value="">Selecione a escola *</option>
              {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
            <input style={input} placeholder="Nome da turma (ex: 6 Ano A) *" value={turma.nome} onChange={e => setTurma({ ...turma, nome: e.target.value })} />
            <input style={input} placeholder="Serie (ex: 6)" value={turma.serie} onChange={e => setTurma({ ...turma, serie: e.target.value })} />
            <select style={input} value={turma.turno} onChange={e => setTurma({ ...turma, turno: e.target.value })}>
              <option value="manha">Manha</option>
              <option value="tarde">Tarde</option>
              <option value="noite">Noite</option>
              <option value="integral">Integral</option>
            </select>
            <input style={input} placeholder="Ano letivo" value={turma.ano_letivo} onChange={e => setTurma({ ...turma, ano_letivo: e.target.value })} />
            <button style={btn} onClick={salvarTurma}>Salvar Turma</button>
          </>
        )}

        {aba === 'disciplina' && (
          <>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Cadastrar Disciplinas</h2>
            <select style={input} value={disciplina.escola_id} onChange={e => {
              setDisciplina({ ...disciplina, escola_id: e.target.value, turma_id: '' })
              setEscolaId(e.target.value)
            }}>
              <option value="">Selecione a escola *</option>
              {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
            <select style={input} value={disciplina.turma_id} onChange={e => setDisciplina({ ...disciplina, turma_id: e.target.value })}>
              <option value="">Selecione a turma *</option>
              {turmas.map(t => <option key={t.id} value={t.id}>{t.nome} — {t.serie} — {t.turno}</option>)}
            </select>
            <input style={input} placeholder="Nome da disciplina *" value={disciplina.nome} onChange={e => setDisciplina({ ...disciplina, nome: e.target.value })} />
            <input style={input} type="number" placeholder="Carga horaria" value={disciplina.carga_horaria} onChange={e => setDisciplina({ ...disciplina, carga_horaria: parseInt(e.target.value) })} />
            <button style={btn} onClick={salvarDisciplina}>Adicionar Disciplina</button>
            {disciplinas.length > 0 && (
              <div style={{ marginTop: '1.5rem' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#374151', marginBottom: '0.75rem' }}>Disciplinas ({disciplinas.length})</h3>
                {disciplinas.map((d, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: '#f9fafb', borderRadius: '6px', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.9rem' }}>📚 {d.nome}</span>
                    <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{d.carga_horaria}h</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {aba === 'professor' && (
          <div style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>
            <p>Use o menu <strong>Plano de Aula</strong> para cadastrar professores.</p>
          </div>
        )}

        {aba === 'aluno' && (
          <>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Novo Aluno</h2>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '1rem' }}>Apos salvar, voce podera cadastrar o rosto e o responsavel.</p>
            <select style={input} value={aluno.escola_id} onChange={e => setAluno({ ...aluno, escola_id: e.target.value, matricula: '', turma_id: '' })}>
              <option value="">Selecione a escola *</option>
              {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
            <select style={input} value={aluno.turma_id} onChange={e => setAluno({ ...aluno, turma_id: e.target.value })}>
              <option value="">Selecione a turma</option>
              {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
            <input style={input} placeholder="Nome completo *" value={aluno.nome} onChange={e => setAluno({ ...aluno, nome: e.target.value })} />
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ fontSize: '0.85rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Matricula (gerada automaticamente)</label>
              <input style={{ ...input, marginBottom: 0, background: '#f9fafb', color: '#6366f1', fontWeight: 600 }}
                value={aluno.matricula} onChange={e => setAluno({ ...aluno, matricula: e.target.value })} />
            </div>
            <input style={input} type="date" value={aluno.data_nascimento} onChange={e => setAluno({ ...aluno, data_nascimento: e.target.value })} />
            <button style={btn} onClick={salvarAluno}>Salvar Aluno →</button>
          </>
        )}

        {aba === 'responsavel' && (
          <>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Cadastrar Responsavel</h2>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ fontSize: '0.85rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Escola</label>
              <select style={{ ...input, marginBottom: 0 }} value={escolaId} onChange={e => setEscolaId(e.target.value)}>
                {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ fontSize: '0.85rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Aluno *</label>
              <select style={{ ...input, marginBottom: 0 }} value={responsavel.aluno_id} onChange={e => setResponsavel({ ...responsavel, aluno_id: e.target.value })}>
                <option value="">Selecione o aluno</option>
                {alunos.map(a => <option key={a.id} value={a.id}>{a.nome} — {a.matricula}</option>)}
              </select>
            </div>
            <input style={input} placeholder="Nome do responsavel *" value={responsavel.nome} onChange={e => setResponsavel({ ...responsavel, nome: e.target.value })} />
            <input style={input} placeholder="WhatsApp (ex: 5582999999999) *" value={responsavel.telefone_whatsapp} onChange={e => setResponsavel({ ...responsavel, telefone_whatsapp: e.target.value })} />
            <input style={input} placeholder="Email" value={responsavel.email} onChange={e => setResponsavel({ ...responsavel, email: e.target.value })} />
            <select style={input} value={responsavel.parentesco} onChange={e => setResponsavel({ ...responsavel, parentesco: e.target.value })}>
              <option value="mae">Mae</option>
              <option value="pai">Pai</option>
              <option value="responsavel_legal">Responsavel Legal</option>
              <option value="avo">Avo(a)</option>
              <option value="outro">Outro</option>
            </select>
            <button style={btn} onClick={salvarResponsavel}>Salvar Responsavel</button>
          </>
        )}

        {aba === 'logo' && (
          <>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Logo da Escola</h2>
            <select style={input} value={logoEscolaId} onChange={e => setLogoEscolaId(e.target.value)}>
              <option value="">Selecione a escola *</option>
              {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
            <div style={{ border: '2px dashed #e5e7eb', borderRadius: '8px', padding: '1.5rem', textAlign: 'center', marginBottom: '1rem' }}>
              {logoPreview
                ? <img src={logoPreview} style={{ maxHeight: 80, marginBottom: '0.75rem', borderRadius: '8px' }} />
                : <div style={{ color: '#9ca3af', marginBottom: '0.75rem' }}><div style={{ fontSize: '2rem' }}>🖼️</div></div>
              }
              <input type="file" accept="image/*" id="inputLogo" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files[0]; if (f) { setLogoFile(f); setLogoPreview(URL.createObjectURL(f)) } }} />
              <label htmlFor="inputLogo"
                style={{ padding: '0.5rem 1rem', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                Escolher imagem
              </label>
            </div>
            <button style={btn} onClick={enviarLogo} disabled={uploadando}>{uploadando ? 'Enviando...' : 'Salvar Logo'}</button>
          </>
        )}
      </div>

      {/* Modal Cadastro de Rosto + Responsavel */}
      {modalRosto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 2000 }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e1b4b', margin: 0 }}>
                  {etapaModal === 'rosto' ? '📷 Cadastrar Rosto' : '👤 Cadastrar Responsavel'}
                </h2>
                <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '4px 0 0' }}>Aluno: {modalRosto.nome}</p>
              </div>
              <button onClick={fecharModalRosto}
                style={{ background: '#f3f4f6', border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '0.9rem' }}>
                ✕ Fechar
              </button>
            </div>

            {/* Etapas */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', textAlign: 'center', fontSize: '0.85rem', fontWeight: 600, background: etapaModal === 'rosto' ? '#6366f1' : '#DCFCE7', color: etapaModal === 'rosto' ? 'white' : '#166534' }}>
                1. Rosto Facial
              </div>
              <div style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', textAlign: 'center', fontSize: '0.85rem', fontWeight: 600, background: etapaModal === 'responsavel' ? '#6366f1' : '#f3f4f6', color: etapaModal === 'responsavel' ? 'white' : '#9ca3af' }}>
                2. Responsavel
              </div>
            </div>

            {/* ETAPA 1 - ROSTO */}
            {etapaModal === 'rosto' && (
              <>
                {mensagemRosto && (
                  <div style={{ background: mensagemRosto.includes('❌') ? '#FEE2E2' : '#DCFCE7', color: mensagemRosto.includes('❌') ? '#991b1b' : '#166534', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
                    {mensagemRosto}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  <button onClick={() => { setModoRosto('webcam'); pararWebcam(); setFotoCapturada(null) }}
                    style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: 'none', cursor: 'pointer', background: modoRosto === 'webcam' ? '#6366f1' : '#f3f4f6', color: modoRosto === 'webcam' ? 'white' : '#374151', fontWeight: 500 }}>
                    📷 Webcam
                  </button>
                  <button onClick={() => { setModoRosto('arquivo'); pararWebcam(); setFotoCapturada(null) }}
                    style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: 'none', cursor: 'pointer', background: modoRosto === 'arquivo' ? '#6366f1' : '#f3f4f6', color: modoRosto === 'arquivo' ? 'white' : '#374151', fontWeight: 500 }}>
                    🖼️ Upload
                  </button>
                </div>

                {modoRosto === 'webcam' && (
                  <div style={{ textAlign: 'center' }}>
                    <video ref={videoRef} autoPlay playsInline
                      style={{ width: '100%', borderRadius: '8px', background: '#0f172a', display: webcamAtiva ? 'block' : 'none', maxHeight: 280 }} />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                    {fotoCapturada && (
                      <img src={URL.createObjectURL(fotoCapturada)}
                        style={{ width: '100%', borderRadius: '8px', maxHeight: 280, objectFit: 'cover' }} />
                    )}
                    {!webcamAtiva && !fotoCapturada && (
                      <div style={{ padding: '2rem', background: '#f9fafb', borderRadius: '8px', marginBottom: '1rem' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📷</div>
                        <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Clique para ativar a webcam</p>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.75rem' }}>
                      {!webcamAtiva && !fotoCapturada && (
                        <button onClick={iniciarWebcam}
                          style={{ padding: '0.6rem 1.5rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}>
                          Ativar Webcam
                        </button>
                      )}
                      {webcamAtiva && (
                        <>
                          <button onClick={capturarFoto}
                            style={{ padding: '0.6rem 1.5rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}>
                            Capturar Foto
                          </button>
                          <button onClick={pararWebcam}
                            style={{ padding: '0.6rem 1rem', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                            Cancelar
                          </button>
                        </>
                      )}
                      {fotoCapturada && (
                        <>
                          <button onClick={() => enviarRosto(fotoCapturada)} disabled={loadingRosto}
                            style={{ padding: '0.6rem 1.5rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}>
                            {loadingRosto ? 'Cadastrando...' : 'Cadastrar Rosto'}
                          </button>
                          <button onClick={() => { setFotoCapturada(null); iniciarWebcam() }}
                            style={{ padding: '0.6rem 1rem', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                            Tirar Outra
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {modoRosto === 'arquivo' && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ padding: '2rem', border: '2px dashed #e5e7eb', borderRadius: '8px', marginBottom: '1rem' }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🖼️</div>
                      <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1rem' }}>Selecione uma foto do aluno</p>
                      <input type="file" accept="image/*" id="inputFotoModal" style={{ display: 'none' }}
                        onChange={e => e.target.files[0] && enviarRosto(e.target.files[0])} />
                      <label htmlFor="inputFotoModal"
                        style={{ padding: '0.6rem 1.5rem', background: '#6366f1', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}>
                        {loadingRosto ? 'Cadastrando...' : 'Escolher Foto'}
                      </label>
                    </div>
                  </div>
                )}

                <button onClick={() => setEtapaModal('responsavel')}
                  style={{ width: '100%', marginTop: '1rem', padding: '0.65rem', background: mensagemRosto.includes('✅') ? '#10b981' : '#6366f1', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                  {mensagemRosto.includes('✅') ? '✅ Rosto Cadastrado — Próximo: Responsavel →' : 'Pular Rosto — Cadastrar Responsavel →'}
                </button>
              </>
            )}

            {/* ETAPA 2 - RESPONSAVEL */}
            {etapaModal === 'responsavel' && (
              <>
                {mensagemResp && (
                  <div style={{ background: mensagemResp.includes('❌') ? '#FEE2E2' : '#DCFCE7', color: mensagemResp.includes('❌') ? '#991b1b' : '#166534', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
                    {mensagemResp}
                  </div>
                )}

                <input style={input} placeholder="Nome do responsavel *" value={responsavelModal.nome} onChange={e => setResponsavelModal({ ...responsavelModal, nome: e.target.value })} />
                <input style={input} placeholder="WhatsApp (ex: 5582999999999) *" value={responsavelModal.telefone_whatsapp} onChange={e => setResponsavelModal({ ...responsavelModal, telefone_whatsapp: e.target.value })} />
                <input style={input} placeholder="Email" value={responsavelModal.email} onChange={e => setResponsavelModal({ ...responsavelModal, email: e.target.value })} />
                <select style={input} value={responsavelModal.parentesco} onChange={e => setResponsavelModal({ ...responsavelModal, parentesco: e.target.value })}>
                  <option value="mae">Mae</option>
                  <option value="pai">Pai</option>
                  <option value="responsavel_legal">Responsavel Legal</option>
                  <option value="avo">Avo(a)</option>
                  <option value="outro">Outro</option>
                </select>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button onClick={() => setEtapaModal('rosto')}
                    style={{ flex: 1, padding: '0.65rem', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}>
                    ← Voltar
                  </button>
                  <button onClick={salvarResponsavelModal} disabled={salvandoResp}
                    style={{ flex: 2, padding: '0.65rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                    {salvandoResp ? 'Salvando...' : '💾 Salvar Responsavel'}
                  </button>
                </div>

                {mensagemResp.includes('✅') && (
                  <button onClick={fecharModalRosto}
                    style={{ width: '100%', marginTop: '0.75rem', padding: '0.65rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                    ✅ Concluir Cadastro
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}