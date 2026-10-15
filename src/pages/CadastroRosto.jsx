import { useEffect, useRef, useState } from 'react'
import api from '../api'

export default function CadastroRosto() {
  const [escolas, setEscolas] = useState([])
  const [alunos, setAlunos] = useState([])
  const [escolaId, setEscolaId] = useState('')
  const [alunoId, setAlunoId] = useState('')
  const [modo, setModo] = useState('webcam')
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const [webcamAtiva, setWebcamAtiva] = useState(false)
  const [fotoCapturada, setFotoCapturada] = useState(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    api.get('/escolas/').then(r => {
      setEscolas(r.data)
      if (r.data.length > 0) setEscolaId(r.data[0].id)
    })
  }, [])

  useEffect(() => {
    if (!escolaId) return
    api.get(`/alunos/escola/${escolaId}`).then(r => {
      setAlunos(r.data)
      setAlunoId('')
    })
  }, [escolaId])

  async function iniciarWebcam() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      streamRef.current = stream
      videoRef.current.srcObject = stream
      setWebcamAtiva(true)
      setFotoCapturada(null)
    } catch {
      setErro('Nao foi possivel acessar a webcam.')
    }
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

  async function enviarFoto(arquivo) {
    if (!alunoId) { setErro('Selecione o aluno.'); return }
    setLoading(true)
    setErro('')
    setMensagem('')
    try {
      const form = new FormData()
      form.append('foto', arquivo, 'foto.jpg')
      const res = await api.post(`/facial/cadastrar-rosto/${alunoId}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setMensagem(res.data.mensagem + ` — confianca: ${(res.data.confianca_deteccao * 100).toFixed(1)}%`)
      setFotoCapturada(null)
    } catch (err) {
      setErro(err.response?.data?.detail || 'Erro ao cadastrar rosto.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem' }}>
        Cadastro de Rosto
      </h1>

      <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e5e7eb', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: '0.85rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Escola</label>
            <select value={escolaId} onChange={e => setEscolaId(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '0.9rem' }}>
              {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Aluno</label>
            <select value={alunoId} onChange={e => setAlunoId(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '0.9rem', minWidth: 200 }}>
              <option value="">Selecione o aluno</option>
              {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Modo</label>
            <select value={modo} onChange={e => { setModo(e.target.value); pararWebcam(); setFotoCapturada(null) }}
              style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '0.9rem' }}>
              <option value="webcam">Webcam</option>
              <option value="arquivo">Enviar foto</option>
            </select>
          </div>
        </div>
      </div>

      {mensagem && (
        <div style={{ background: '#DCFCE7', color: '#166534', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem' }}>
          {mensagem}
        </div>
      )}
      {erro && (
        <div style={{ background: '#FEE2E2', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem' }}>
          {erro}
        </div>
      )}

      {modo === 'webcam' && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e5e7eb', textAlign: 'center' }}>
          <video ref={videoRef} autoPlay playsInline
            style={{ width: '100%', maxWidth: 480, borderRadius: '8px', background: '#f3f4f6', display: webcamAtiva ? 'block' : 'none', margin: '0 auto' }} />
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {fotoCapturada && (
            <img src={URL.createObjectURL(fotoCapturada)}
              style={{ width: '100%', maxWidth: 480, borderRadius: '8px', margin: '0 auto', display: 'block' }} />
          )}

          {!webcamAtiva && !fotoCapturada && (
            <div style={{ padding: '3rem', color: '#9ca3af' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📷</div>
              <p>Clique em Ativar Webcam para comecar</p>
            </div>
          )}

          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
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
                  style={{ padding: '0.6rem 1.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}>
                  Cancelar
                </button>
              </>
            )}
            {fotoCapturada && (
              <>
                <button onClick={() => enviarFoto(fotoCapturada)} disabled={loading}
                  style={{ padding: '0.6rem 1.5rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}>
                  {loading ? 'Cadastrando...' : 'Cadastrar Rosto'}
                </button>
                <button onClick={() => { setFotoCapturada(null); iniciarWebcam() }}
                  style={{ padding: '0.6rem 1.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}>
                  Tirar Outra
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {modo === 'arquivo' && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e5e7eb', textAlign: 'center' }}>
          <div style={{ padding: '2rem', border: '2px dashed #e5e7eb', borderRadius: '8px', marginBottom: '1rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🖼️</div>
            <p style={{ color: '#6b7280', marginBottom: '1rem' }}>Selecione uma foto do aluno</p>
            <input type="file" accept="image/*"
              onChange={e => e.target.files[0] && enviarFoto(e.target.files[0])}
              style={{ display: 'none' }} id="inputFoto" />
            <label htmlFor="inputFoto"
              style={{ padding: '0.6rem 1.5rem', background: '#6366f1', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}>
              {loading ? 'Cadastrando...' : 'Escolher Foto'}
            </label>
          </div>
          <p style={{ color: '#9ca3af', fontSize: '0.8rem' }}>
            Use fotos com rosto centralizado, bem iluminado e sem oculos escuros
          </p>
        </div>
      )}
    </div>
  )
}