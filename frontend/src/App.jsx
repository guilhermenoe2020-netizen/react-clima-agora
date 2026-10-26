
import { useCallback, useEffect, useState } from 'react'
import {
  Sun,
  Moon,
  Cloud,
  CloudRain,
  CloudFog,
  CloudLightning,
  Snowflake,
  Wind,
  Droplets,
  Search,
  MapPin,
  ArrowRight,
} from 'lucide-react'
import './App.css'

const GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search'
const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast'

function obterCondicao(codigo) {
  if (codigo === 0) return 'Céu limpo'
  if (codigo === 1) return 'Predominantemente limpo'
  if (codigo === 2) return 'Parcialmente nublado'
  if (codigo === 3) return 'Nublado'
  if ([45, 48].includes(codigo)) return 'Neblina'
  if ([51, 53, 55, 56, 57].includes(codigo)) return 'Garoa'
  if ([61, 63, 65, 66, 67].includes(codigo)) return 'Chuva'
  if ([71, 73, 75, 77].includes(codigo)) return 'Neve'
  if ([80, 81, 82].includes(codigo)) return 'Pancadas de chuva'
  if ([85, 86].includes(codigo)) return 'Pancadas de neve'
  if ([95, 96, 99].includes(codigo)) return 'Trovoadas'
  return 'Condição desconhecida'
}

function obterSimbolo(codigo, dia = true, tamanho = 28) {
  const props = {
    size: tamanho,
    strokeWidth: 1.7,
    'aria-hidden': true,
  }

  if ([0, 1].includes(codigo)) {
    return dia ? <Sun {...props} /> : <Moon {...props} />
  }

  if ([2, 3].includes(codigo)) {
    return <Cloud {...props} />
  }

  if ([45, 48].includes(codigo)) {
    return <CloudFog {...props} />
  }

  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(codigo)) {
    return <CloudRain {...props} />
  }

  if ([95, 96, 99].includes(codigo)) {
    return <CloudLightning {...props} />
  }

  if ([71, 73, 75, 77, 85, 86].includes(codigo)) {
    return <Snowflake {...props} />
  }

  return <Cloud {...props} />
}

function formatarHora(valor) {
  if (!valor) return '--'
  return valor.slice(11, 16)
}

function formatarDia(valor, indice) {
  if (indice === 0) return 'Hoje'
  if (indice === 1) return 'Amanhã'

  return new Date(`${valor}T12:00:00`)
    .toLocaleDateString('pt-BR', {
      weekday: 'short',
      timeZone: 'UTC',
    })
    .replace('.', '')
}

function App() {
  const [cidadeBusca, setCidadeBusca] = useState('')
  const [cidades, setCidades] = useState([])
  const [clima, setClima] = useState(null)
  const [localSelecionado, setLocalSelecionado] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [buscandoCidades, setBuscandoCidades] = useState(false)
  const [erro, setErro] = useState('')

  const [tema, setTema] = useState(() => {
    try {
      return localStorage.getItem('clima-agora-tema') || 'claro'
    } catch {
      return 'claro'
    }
  })

  useEffect(() => {
    document.documentElement.dataset.theme = tema

    try {
      localStorage.setItem('clima-agora-tema', tema)
    } catch {
      // A aplicação funciona mesmo sem armazenamento local.
    }
  }, [tema])

  const carregarClima = useCallback(async (local) => {
    setCarregando(true)
    setErro('')
    setCidades([])
    setLocalSelecionado(local)

    try {
      const parametros = new URLSearchParams({
        latitude: local.latitude,
        longitude: local.longitude,
        current: [
          'temperature_2m',
          'relative_humidity_2m',
          'apparent_temperature',
          'is_day',
          'precipitation',
          'weather_code',
          'wind_speed_10m',
        ].join(','),
        hourly: [
          'temperature_2m',
          'precipitation_probability',
          'weather_code',
          'is_day',
        ].join(','),
        daily: [
          'weather_code',
          'temperature_2m_max',
          'temperature_2m_min',
          'precipitation_probability_max',
        ].join(','),
        timezone: 'auto',
        forecast_days: '7',
      })

      const resposta = await fetch(`${WEATHER_URL}?${parametros}`)

      if (!resposta.ok) {
        throw new Error('Não foi possível consultar a previsão do tempo.')
      }

      const dados = await resposta.json()
      setClima(dados)
    } catch (erroConsulta) {
      setErro(
        erroConsulta.message ||
          'Não foi possível carregar o clima. Verifique sua conexão e tente novamente.',
      )
      setClima(null)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregarClima({
      name: 'Manaus',
      admin1: 'Amazonas',
      country: 'Brasil',
      latitude: -3.119,
      longitude: -60.021,
    })
  }, [carregarClima])

  async function pesquisarCidade(evento) {
    evento.preventDefault()

    const consulta = cidadeBusca.trim()

    if (!consulta) {
      setErro('Digite o nome de uma cidade.')
      return
    }

    setBuscandoCidades(true)
    setErro('')
    setCidades([])

    try {
      const parametros = new URLSearchParams({
        name: consulta,
        count: '8',
        language: 'pt',
        format: 'json',
      })

      const resposta = await fetch(`${GEO_URL}?${parametros}`)

      if (!resposta.ok) {
        throw new Error('Não foi possível pesquisar cidades agora.')
      }

      const dados = await resposta.json()

      if (!dados.results?.length) {
        setErro('Nenhuma cidade encontrada. Confira o nome e tente novamente.')
        return
      }

      setCidades(dados.results)
    } catch (erroPesquisa) {
      setErro(
        erroPesquisa.message ||
          'Falha na pesquisa. Verifique sua conexão e tente novamente.',
      )
    } finally {
      setBuscandoCidades(false)
    }
  }

  function selecionarCidade(cidade) {
    setCidadeBusca(cidade.name)

    carregarClima({
      ...cidade,
      country: cidade.country || '',
    })
  }

  const atual = clima?.current
  const horarios = clima?.hourly
  const previsaoDiaria = clima?.daily

  const proximasHoras =
    horarios && atual
      ? horarios.time
          .map((hora, indice) => ({ hora, indice }))
          .filter(({ hora }) => hora >= atual.time)
          .slice(0, 8)
      : []

  return (
    <main className="app">
      <header className="topo">
        <a
          className="marca"
          href="/"
          aria-label="Clima Agora, página inicial"
        >
          <span className="marca-icone" aria-hidden="true">
            <Sun size={23} strokeWidth={1.8} />
          </span>

          <span>
            clima<span className="marca-destaque">agora</span>
          </span>
        </a>

        <button
          className="botao-tema"
          type="button"
          onClick={() => setTema(tema === 'claro' ? 'escuro' : 'claro')}
          aria-label={
            tema === 'claro' ? 'Ativar tema escuro' : 'Ativar tema claro'
          }
          title={tema === 'claro' ? 'Ativar tema escuro' : 'Ativar tema claro'}
        >
          {tema === 'claro' ? (
            <Moon size={18} aria-hidden="true" />
          ) : (
            <Sun size={18} aria-hidden="true" />
          )}

          <span>{tema === 'claro' ? 'Tema escuro' : 'Tema claro'}</span>
        </button>
      </header>

      <section className="introducao">
        <p className="sobretitulo">PREVISÃO DO TEMPO</p>
        <h1>O tempo na sua cidade.</h1>
        <p className="subtitulo">
          Consulte as condições atuais e acompanhe a previsão dos próximos dias.
        </p>
      </section>

      <section className="pesquisa-secao" aria-label="Pesquisar cidade">
        <form className="form-pesquisa" onSubmit={pesquisarCidade}>
          <span className="icone-pesquisa" aria-hidden="true">
            <Search size={19} strokeWidth={1.8} />
          </span>

          <input
            type="search"
            value={cidadeBusca}
            onChange={(evento) => setCidadeBusca(evento.target.value)}
            placeholder="Digite o nome de uma cidade..."
            aria-label="Nome da cidade"
          />

          <button type="submit" disabled={buscandoCidades}>
            {buscandoCidades ? 'Pesquisando...' : 'Pesquisar'}
          </button>
        </form>

        {cidades.length > 0 && (
          <div className="resultados-cidades">
            <p className="resultados-titulo">Selecione uma cidade</p>

            {cidades.map((cidade) => (
              <button
                className="resultado-cidade"
                key={`${cidade.id}-${cidade.latitude}-${cidade.longitude}`}
                type="button"
                onClick={() => selecionarCidade(cidade)}
              >
                <span className="resultado-pin" aria-hidden="true">
                  <MapPin size={18} strokeWidth={1.8} />
                </span>

                <span className="resultado-texto">
                  <strong>{cidade.name}</strong>
                  <small>
                    {[cidade.admin1, cidade.country]
                      .filter(Boolean)
                      .join(', ')}
                  </small>
                </span>

                <ArrowRight size={17} aria-hidden="true" />
              </button>
            ))}
          </div>
        )}
      </section>

      {erro && (
        <div className="mensagem-erro" role="alert">
          <span>{erro}</span>

          <button
            type="button"
            onClick={() => setErro('')}
            aria-label="Fechar mensagem"
          >
            ×
          </button>
        </div>
      )}

      {carregando && (
        <div className="estado-carregamento" role="status">
          <span className="indicador-carregamento" />
          <p>Consultando as condições do tempo...</p>
        </div>
      )}

      {!carregando && clima && atual && (
        <>
          <section className="clima-atual">
            <div className="clima-principal">
              <div className="local-info">
                <span className="ponto-local" />

                <span>
                  {[
                    localSelecionado?.name,
                    localSelecionado?.admin1,
                    localSelecionado?.country,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </span>
              </div>

              <p className="condicao-atual">
                {obterCondicao(atual.weather_code)}
              </p>

              <div className="temperatura-linha">
                <span className="temperatura">
                  {Math.round(atual.temperature_2m)}°
                </span>

                <span className="simbolo-clima" aria-hidden="true">
                  {obterSimbolo(
                    atual.weather_code,
                    Boolean(atual.is_day),
                    54,
                  )}
                </span>
              </div>

              <p className="sensacao">
                Sensação térmica de {Math.round(atual.apparent_temperature)}°C
              </p>
            </div>

            <div className="detalhes-clima">
              <div className="detalhe-item">
                <span className="detalhe-icone" aria-hidden="true">
                  <Wind size={21} strokeWidth={1.7} />
                </span>

                <div>
                  <span className="detalhe-label">Vento</span>
                  <strong>{Math.round(atual.wind_speed_10m)} km/h</strong>
                </div>
              </div>

              <div className="detalhe-item">
                <span className="detalhe-icone" aria-hidden="true">
                  <Droplets size={21} strokeWidth={1.7} />
                </span>

                <div>
                  <span className="detalhe-label">Umidade</span>
                  <strong>{atual.relative_humidity_2m}%</strong>
                </div>
              </div>

              <div className="detalhe-item">
                <span className="detalhe-icone" aria-hidden="true">
                  <CloudRain size={21} strokeWidth={1.7} />
                </span>

                <div>
                  <span className="detalhe-label">Precipitação</span>
                  <strong>{atual.precipitation} mm</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="secao-previsao">
            <div className="titulo-secao">
              <div>
                <h2>Próximas horas</h2>
                <p>Acompanhe a mudança do tempo ao longo do dia.</p>
              </div>
            </div>

            <div className="previsao-horas">
              {proximasHoras.map(({ hora, indice }) => (
                <article className="hora-item" key={hora}>
                  <span className="hora-label">
                    {hora === atual.time ? 'Agora' : formatarHora(hora)}
                  </span>

                  <span className="hora-simbolo" aria-hidden="true">
                    {obterSimbolo(
                      horarios.weather_code[indice],
                      horarios.is_day
                        ? Boolean(horarios.is_day[indice])
                        : true,
                      26,
                    )}
                  </span>

                  <strong>
                    {Math.round(horarios.temperature_2m[indice])}°
                  </strong>

                  <span className="chance-chuva">
                    {horarios.precipitation_probability[indice] ?? 0}% chuva
                  </span>
                </article>
              ))}
            </div>
          </section>

          <section className="secao-previsao secao-semana">
            <div className="titulo-secao">
              <div>
                <h2>Próximos 7 dias</h2>
                <p>Temperaturas mínimas, máximas e chance de chuva.</p>
              </div>
            </div>

            <div className="lista-dias">
              {previsaoDiaria.time.map((dia, indice) => (
                <article className="dia-item" key={dia}>
                  <span className="dia-nome">
                    {formatarDia(dia, indice)}
                  </span>

                  <span className="dia-condicao">
                    <span className="dia-simbolo" aria-hidden="true">
                      {obterSimbolo(
                        previsaoDiaria.weather_code[indice],
                        true,
                        24,
                      )}
                    </span>

                    <span>
                      {obterCondicao(previsaoDiaria.weather_code[indice])}
                    </span>
                  </span>

                  <span className="dia-chuva">
                    {previsaoDiaria.precipitation_probability_max[indice] ?? 0}%
                    {' '}chuva
                  </span>

                  <div className="dia-temperaturas">
                    <strong>
                      {Math.round(previsaoDiaria.temperature_2m_max[indice])}°
                    </strong>

                    <span>
                      {Math.round(previsaoDiaria.temperature_2m_min[indice])}°
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <p className="nota-dados">
            Previsão fornecida pela Open-Meteo. Os dados podem variar conforme
            a atualização dos modelos meteorológicos.
          </p>
        </>
      )}

      <footer className="rodape">
        <span>
          clima<span className="marca-destaque">agora</span>
        </span>

        <span>Informação do tempo, de forma simples.</span>
      </footer>
    </main>
  )
}

export default App
