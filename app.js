/* Interface do simulador: leitura e validação dos campos, controles,
   métricas, gráfico, histórico, logs e animação. O algoritmo está em ga.js. */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const { str, reais, num, LETRAS } = GA;
  const MIN_PROJ = 4;
  const MAX_PROJ = 15;
  const MAX_POP = 500; // limites práticos para o navegador não travar
  const MAX_GER = 5000;

  const EXEMPLO = [
    { nome: 'Melhoria da iluminação', custo: '4000', beneficio: '7' },
    { nome: 'Instalação de bicicletários', custo: '3000', beneficio: '5' },
    { nome: 'Aquisição de bancos', custo: '2000', beneficio: '3' },
    { nome: 'Reforma de espaço de convivência', custo: '5000', beneficio: '8' },
  ];

  let estado = null; // estado do algoritmo (GA.criarEstado)
  let sujo = false; // dados/parâmetros alterados desde o último reinício
  let executando = false;
  let temporizador = null;
  let linhasHistorico = 0;

  /* ================= Leitura e validação ================= */
  function lerDinheiro(s) {
    s = s.trim();
    if (!/^\d+([.,]\d{1,2})?$/.test(s)) return null;
    const v = Math.round(parseFloat(s.replace(',', '.')) * 100);
    return Number.isSafeInteger(v) ? v : null;
  }
  function lerDecimal(s) {
    s = s.trim();
    if (!/^\d+([.,]\d+)?$/.test(s)) return null;
    const v = parseFloat(s.replace(',', '.'));
    return Number.isFinite(v) ? v : null;
  }
  function lerInteiro(s, aceitaNegativo) {
    s = s.trim();
    if (!(aceitaNegativo ? /^-?\d+$/ : /^\d+$/).test(s)) return null;
    const v = parseInt(s, 10);
    return Number.isSafeInteger(v) ? v : null;
  }

  // Lê todos os campos. Devolve { erros: [...], config } e marca os inválidos.
  function validar() {
    const erros = [];
    const marcar = (el, ok, msg) => {
      el.classList.toggle('invalido', !ok);
      if (!ok) erros.push(msg);
      return ok;
    };

    const projetos = [];
    document.querySelectorAll('#tabProjetos tbody tr').forEach((tr, i) => {
      const [eNome, eCusto, eBen] = tr.querySelectorAll('input');
      const L = LETRAS[i];
      const nome = eNome.value.trim();
      const custo = lerDinheiro(eCusto.value);
      const ben = lerDecimal(eBen.value);
      marcar(eNome, nome !== '', `Projeto ${L}: o nome não pode ficar vazio.`);
      marcar(eCusto, custo !== null && custo > 0, `Projeto ${L}: o custo deve ser positivo, com até duas casas decimais.`);
      marcar(eBen, ben !== null, `Projeto ${L}: o benefício deve ser um número não negativo.`);
      projetos.push({ nome, custo, beneficio: ben });
    });
    if (projetos.length < MIN_PROJ || projetos.length > MAX_PROJ) {
      erros.push(`Mantenha entre ${MIN_PROJ} e ${MAX_PROJ} projetos.`);
    }

    const orcamento = lerDinheiro($('orcamento').value);
    marcar($('orcamento'), orcamento !== null, 'Orçamento: valor não negativo, com até duas casas decimais.');

    const pop = lerInteiro($('tamPopulacao').value);
    const popOk = marcar($('tamPopulacao'), pop !== null && pop >= 2 && pop <= MAX_POP,
      `Tamanho da população: inteiro entre 2 e ${MAX_POP}.`);

    const ger = lerInteiro($('geracoes').value);
    marcar($('geracoes'), ger !== null && ger >= 1 && ger <= MAX_GER, `Número de gerações: inteiro entre 1 e ${MAX_GER}.`);

    const pc = lerDecimal($('taxaCruzamento').value);
    marcar($('taxaCruzamento'), pc !== null && pc <= 100, 'Taxa de cruzamento: percentual entre 0 e 100.');

    const pm = lerDecimal($('taxaMutacao').value);
    marcar($('taxaMutacao'), pm !== null && pm <= 100, 'Taxa de mutação: percentual entre 0 e 100.');

    const tor = lerInteiro($('tamTorneio').value);
    marcar($('tamTorneio'), tor !== null && tor >= 2 && (!popOk || tor <= pop),
      'Tamanho do torneio: inteiro entre 2 e o tamanho da população.');

    const elite = lerInteiro($('elite').value);
    marcar($('elite'), elite !== null && (!popOk || elite <= pop - 1),
      'Indivíduos de elite: inteiro entre 0 e o tamanho da população menos 1.');

    const semente = lerInteiro($('semente').value, true);
    marcar($('semente'), semente !== null, 'Semente aleatória: informe um número inteiro.');

    return {
      erros,
      config: {
        projetos,
        orcamento,
        tamPopulacao: pop,
        geracoes: ger,
        taxaCruzamento: pc / 100,
        taxaMutacao: pm / 100,
        tamTorneio: tor,
        elite,
        semente,
        maxEventos: 100,
      },
    };
  }

  function mostrarErros(erros) {
    const ul = $('erros');
    ul.innerHTML = '';
    erros.forEach((e) => {
      const li = document.createElement('li');
      li.textContent = e;
      ul.appendChild(li);
    });
  }

  /* ================= Tabela de projetos ================= */
  function criarLinhaProjeto(p) {
    const tr = document.createElement('tr');
    const campos = [
      ['Nome do projeto', p.nome, 'text', ''],
      ['Custo em reais', p.custo, 'decimal', 'Custo (R$)'],
      ['Benefício em pontos', p.beneficio, 'decimal', 'Benefício (pontos)'],
    ];
    tr.appendChild(document.createElement('td'));
    campos.forEach(([rotulo, valor, modo, visivel]) => {
      const td = document.createElement('td');
      if (visivel) td.dataset.rotulo = visivel;
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.inputMode = modo;
      inp.value = valor;
      inp.autocomplete = 'off';
      inp.setAttribute('aria-label', rotulo);
      inp.placeholder = rotulo;
      td.appendChild(inp);
      tr.appendChild(td);
    });
    const td = document.createElement('td');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'remover';
    btn.textContent = '✕';
    btn.title = 'Remover projeto';
    btn.setAttribute('aria-label', 'Remover projeto');
    btn.addEventListener('click', () => {
      tr.remove();
      renumerarProjetos();
      marcarSujo();
    });
    td.appendChild(btn);
    tr.appendChild(td);
    return tr;
  }

  function renumerarProjetos() {
    const linhas = document.querySelectorAll('#tabProjetos tbody tr');
    linhas.forEach((tr, i) => {
      tr.firstChild.textContent = LETRAS[i];
      tr.querySelector('button.remover').disabled = linhas.length <= MIN_PROJ;
    });
    $('btnAdicionar').disabled = linhas.length >= MAX_PROJ;
  }

  /* ================= Controles ================= */
  function marcarSujo() {
    pausar();
    sujo = true;
    mostrarErros(validar().erros);
    atualizarControles();
  }

  function atualizarControles() {
    const fim = estado && GA.terminou(estado);
    const pode = estado && !sujo && !fim && !executando;
    $('btnExecutar').disabled = !pode;
    $('btnAvancar').disabled = !pode;
    $('btnPausar').disabled = !executando;

    const st = $('status');
    st.className = 'status';
    if (sujo) {
      st.textContent = 'Dados ou parâmetros alterados: clique em Reiniciar para aplicá-los.';
      st.classList.add('aviso');
    } else if (!estado) {
      st.textContent = '';
    } else if (fim) {
      st.textContent = `Execução encerrada: ${estado.config.geracoes} gerações concluídas.`;
      st.classList.add('fim');
    } else if (executando) {
      st.textContent = 'Executando…';
    } else {
      st.textContent = `Pausado na geração ${estado.geracao} de ${estado.config.geracoes}.`;
    }
  }

  function reiniciar() {
    pausar();
    const { erros, config } = validar();
    mostrarErros(erros);
    if (erros.length) {
      sujo = true;
      atualizarControles();
      return;
    }
    estado = GA.criarEstado(config); // recria o gerador com a semente configurada
    sujo = false;
    linhasHistorico = 0;
    $('tabHistorico').querySelector('tbody').innerHTML = '';
    anim.ev = null;
    renderizar();
    mostrarAnimacaoDe(estado.eventos[0], 0, false);
    atualizarControles();
  }

  function umaGeracao() {
    const ev = GA.passo(estado);
    renderizar();
    return ev;
  }

  function avancar() {
    if (!estado || sujo || executando || GA.terminou(estado)) return;
    const ev = umaGeracao();
    mostrarAnimacaoDe(ev, 0, $('animar').checked);
    atualizarControles();
  }

  function executar() {
    if (!estado || sujo || executando || GA.terminou(estado)) return;
    pararAnimacao();
    executando = true;
    atualizarControles();
    ciclo();
  }

  function ciclo() {
    if (!executando) return;
    if (GA.terminou(estado)) {
      executando = false;
      atualizarControles();
      return;
    }
    const ev = umaGeracao();
    const proximo = () => {
      temporizador = setTimeout(ciclo, Number($('intervalo').value));
    };
    if ($('animar').checked) {
      const k = Number($('paresAnimados').value);
      const pares = ev.pares.map((_, i) => i).slice(0, k === 0 ? ev.pares.length : k);
      tocar(ev, pares, proximo);
    } else {
      mostrarAnimacaoDe(ev, 0, false);
      proximo();
    }
    if (GA.terminou(estado) && !$('animar').checked) {
      clearTimeout(temporizador);
      executando = false;
    }
    atualizarControles();
  }

  function pausar() {
    executando = false;
    clearTimeout(temporizador);
    pararAnimacao();
    atualizarControles();
  }

  /* ================= Renderização ================= */
  function elCrom(bits, corte) {
    // bits: [{v, c}] ; corte: nº de genes antes do tracejado (opcional)
    const span = document.createElement('span');
    span.className = 'crom';
    bits.forEach((b, i) => {
      const e = document.createElement('i');
      e.className = 'bit' + (b.v === 1 ? ' um' : '') + (b.c ? ' ' + b.c : '');
      e.textContent = b.v;
      e.title = estado ? `${LETRAS[i]}: ${estado.config.projetos[i].nome}` : '';
      span.appendChild(e);
      if (corte && i === corte - 1) {
        const c = document.createElement('span');
        c.className = 'corte';
        c.title = 'ponto de corte';
        span.appendChild(c);
      }
    });
    return span;
  }
  const simples = (genes, c) => genes.map((v) => ({ v, c }));

  function renderizar() {
    const h = estado.historico[estado.historico.length - 1];
    $('mGeracao').textContent = `${estado.geracao} / ${estado.config.geracoes}`;
    $('mMelhor').textContent = num(h.melhor);
    $('mMedia').textContent = num(h.media);
    $('mAcumulado').textContent = num(h.acumulado);
    renderMelhor();
    renderHistorico();
    renderPopulacao();
    renderGrafico();
    renderLog();
  }

  function renderMelhor() {
    const cfg = estado.config;
    const m = estado.melhorGlobal;
    const a = GA.avaliar(m.genes, cfg.projetos, cfg.orcamento);
    $('tituloMelhor').textContent = GA.terminou(estado)
      ? 'Resultado final: melhor solução de toda a execução'
      : 'Melhor solução encontrada até agora';
    const caixa = $('melhor');
    caixa.innerHTML = '';
    const dl = document.createElement('dl');
    const item = (t, conteudo) => {
      const dt = document.createElement('dt');
      dt.textContent = t;
      const dd = document.createElement('dd');
      if (typeof conteudo === 'string') dd.textContent = conteudo;
      else dd.appendChild(conteudo);
      dl.append(dt, dd);
    };
    item('Cromossomo', elCrom(simples(m.genes)));
    item('Projetos escolhidos', a.selecionados.length
      ? a.selecionados.map((i) => `${LETRAS[i]}. ${cfg.projetos[i].nome}`).join('; ')
      : 'nenhum (seleção vazia)');
    item('Custo total', reais(a.custo));
    item('Benefício total', `${num(a.beneficio)} pontos`);
    item('Saldo do orçamento', `${reais(a.saldo)} (orçamento de ${reais(cfg.orcamento)})`);
    item('Encontrada na geração', String(m.geracao));
    caixa.appendChild(dl);
  }

  function renderHistorico() {
    const tbody = $('tabHistorico').querySelector('tbody');
    for (; linhasHistorico < estado.historico.length; linhasHistorico++) {
      const r = estado.historico[linhasHistorico];
      const tr = document.createElement('tr');
      [r.geracao, num(r.melhor), num(r.media), num(r.acumulado)].forEach((v) => {
        const td = document.createElement('td');
        td.textContent = v;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    }
    const caixa = $('tabHistorico').parentElement;
    caixa.scrollTop = caixa.scrollHeight;
  }

  function renderPopulacao() {
    const tbody = $('tabPopulacao').querySelector('tbody');
    tbody.innerHTML = '';
    const melhor = estado.historico[estado.historico.length - 1].melhor;
    estado.populacao.forEach((ind, i) => {
      const tr = document.createElement('tr');
      if (ind.aptidao === melhor) tr.className = 'melhor';
      const c = [document.createElement('td'), document.createElement('td'), document.createElement('td'), document.createElement('td')];
      c[0].textContent = i;
      c[1].appendChild(elCrom(simples(ind.genes)));
      c[2].textContent = reais(ind.custo);
      c[3].textContent = num(ind.aptidao);
      tr.append(...c);
      tbody.appendChild(tr);
    });
  }

  function renderGrafico() {
    const cv = $('grafico');
    const ctx = cv.getContext && cv.getContext('2d');
    if (!ctx || !estado) return;
    const dpr = window.devicePixelRatio || 1;
    const W = cv.clientWidth || 600;
    const H = 260;
    cv.width = W * dpr;
    cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const h = estado.historico;
    const m = { e: 42, d: 12, t: 12, b: 28 };
    const maxX = Math.max(estado.config.geracoes, 1);
    const maxY = Math.max(1, ...h.map((r) => r.acumulado)) * 1.1;
    const X = (g) => m.e + (g / maxX) * (W - m.e - m.d);
    const Y = (v) => H - m.b - (v / maxY) * (H - m.t - m.b);

    const css = getComputedStyle(document.documentElement);
    const cor = (nome) => css.getPropertyValue(nome).trim();
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillStyle = cor('--suave');
    ctx.strokeStyle = cor('--grade');
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const v = (maxY * i) / 4;
      ctx.beginPath();
      ctx.moveTo(m.e, Y(v));
      ctx.lineTo(W - m.d, Y(v));
      ctx.stroke();
      ctx.textAlign = 'right';
      ctx.fillText(num(v), m.e - 6, Y(v) + 4);
    }
    ctx.textAlign = 'center';
    for (let i = 0; i <= 5; i++) {
      const g = Math.round((maxX * i) / 5);
      ctx.fillText(String(g), X(g), H - 8);
    }

    const linha = (campo, tinta, larg) => {
      ctx.strokeStyle = tinta;
      ctx.lineWidth = larg;
      ctx.beginPath();
      h.forEach((r, i) => (i ? ctx.lineTo(X(r.geracao), Y(r[campo])) : ctx.moveTo(X(r.geracao), Y(r[campo]))));
      ctx.stroke();
      const u = h[h.length - 1];
      ctx.fillStyle = tinta;
      ctx.beginPath();
      ctx.arc(X(u.geracao), Y(u[campo]), 3, 0, Math.PI * 2);
      ctx.fill();
    };
    linha('acumulado', cor('--elite'), 4);
    linha('melhor', cor('--p1'), 2);
    linha('media', cor('--p2'), 2);
  }

  function renderLog() {
    const sel = $('logGeracao');
    const seguir = $('logSeguir').checked;
    const anterior = sel.value;
    sel.innerHTML = '';
    estado.eventos.forEach((ev) => {
      const o = document.createElement('option');
      o.value = ev.geracao;
      o.textContent = ev.geracao;
      sel.appendChild(o);
    });
    const existe = estado.eventos.some((ev) => String(ev.geracao) === anterior);
    sel.value = seguir || !existe ? String(estado.geracao) : anterior;
    escreverLog();
  }

  function escreverLog() {
    const g = Number($('logGeracao').value);
    const ev = estado.eventos.find((e) => e.geracao === g);
    $('log').textContent = ev ? GA.descreverEvento(ev) : '';
  }

  /* ================= Animação =================
     Cada "quadro" é montado a partir do evento registrado pelo algoritmo;
     a animação nunca sorteia nem recalcula nada por conta própria. */
  const anim = { ev: null, par: 0, quadros: [], i: 0, timer: null };

  function quadrosElite(ev) {
    const titulo = `Geração ${ev.geracao} · Elitismo`;
    if (!ev.elite.length) {
      return [{ titulo, texto: 'Quantidade de elite igual a zero: nenhum indivíduo é copiado diretamente.', linhas: [] }];
    }
    const visiveis = ev.elite.slice(0, 6);
    return [{
      titulo,
      texto: `${ev.elite.length} indivíduo(s) de maior aptidão copiado(s) sem modificação para a nova geração` +
        (ev.elite.length > visiveis.length ? ` (mostrando os ${visiveis.length} primeiros).` : '.'),
      linhas: visiveis.map((e) => ({
        rotulo: `Elite #${e.indice}`,
        bits: simples(e.genes, 'elite'),
        info: `aptidão ${num(e.aptidao)} · custo ${reais(e.custo)}`,
      })),
    }];
  }

  function quadrosPar(ev, k) {
    const par = ev.pares[k];
    const projetos = estado.config.projetos;
    const base = `Geração ${ev.geracao} · par ${k + 1} de ${ev.pares.length} · `;
    const q = [];
    const cand = (t) => t.candidatos.map((c) => `#${c} (aptidão ${num(ev.aptidoesAnteriores[c])})`).join(', ');
    const [p1, p2] = par.pais;
    const [f1, f2] = par.filhos;
    const corte = par.cruzou ? par.corte : null;

    // 1. Seleção
    q.push({
      titulo: base + 'Seleção por torneio',
      texto: `Torneio 1: ${cand(par.t1)} → vence #${par.t1.vencedor}. Torneio 2: ${cand(par.t2)} → vence #${par.t2.vencedor}.`,
      linhas: [
        { rotulo: `Pai 1 (#${p1.indice})`, bits: simples(p1.genes, 'p1'), info: `aptidão ${num(p1.aptidao)}` },
        { rotulo: `Pai 2 (#${p2.indice})`, bits: simples(p2.genes, 'p2'), info: `aptidão ${num(p2.aptidao)}` },
      ],
    });

    // 2 e 3. Corte e troca dos segmentos
    const origem = (j) => (i) => {
      if (!par.cruzou) return j === 0 ? 'p1' : 'p2';
      return (i < par.corte) === (j === 0) ? 'p1' : 'p2';
    };
    const comOrigem = (genes, j) => genes.map((v, i) => ({ v, c: origem(j)(i) }));
    if (par.cruzou) {
      q.push({
        titulo: base + 'Ponto de corte',
        texto: `O cruzamento ocorreu (sorteio dentro da taxa). Corte sorteado após o gene ${par.corte}.`,
        linhas: [
          { rotulo: 'Pai 1', bits: simples(p1.genes, 'p1'), corte },
          { rotulo: 'Pai 2', bits: simples(p2.genes, 'p2'), corte },
        ],
      });
      q.push({
        titulo: base + 'Cruzamento: troca dos segmentos',
        texto: `Os trechos depois do corte são trocados: filhos ${str(f1.aposCruzamento)} e ${str(f2.aposCruzamento)}.`,
        linhas: [
          { rotulo: 'Filho 1', bits: comOrigem(f1.aposCruzamento, 0), corte },
          { rotulo: 'Filho 2', bits: comOrigem(f2.aposCruzamento, 1), corte },
        ],
      });
    } else {
      q.push({
        titulo: base + 'Sem cruzamento',
        texto: 'O sorteio ficou fora da taxa de cruzamento: os filhos são cópias dos pais.',
        linhas: [
          { rotulo: 'Filho 1', bits: comOrigem(f1.aposCruzamento, 0) },
          { rotulo: 'Filho 2', bits: comOrigem(f2.aposCruzamento, 1) },
        ],
      });
    }

    const descartado = (f, j) => ({
      rotulo: `Filho ${j + 1}`,
      bits: comOrigem(f.aposCruzamento, j),
      info: 'descartado: restava apenas uma vaga na população',
      classe: 'descartado',
    });

    // 4. Mutação
    const txtMut = par.filhos.map((f, j) => {
      if (!f.mantido) return `Filho ${j + 1}: descartado.`;
      return f.bitsMutados.length
        ? `Filho ${j + 1}: gene(s) ${f.bitsMutados.map((b) => b + 1).join(', ')} invertido(s) → ${str(f.aposMutacao)}.`
        : `Filho ${j + 1}: nenhum bit alterado.`;
    });
    q.push({
      titulo: base + 'Mutação por inversão de bits',
      texto: txtMut.join(' '),
      linhas: par.filhos.map((f, j) => f.mantido ? {
        rotulo: `Filho ${j + 1}`,
        bits: f.aposMutacao.map((v, i) => ({ v, c: f.bitsMutados.includes(i) ? 'mut' : origem(j)(i) })),
        corte,
      } : descartado(f, j)),
    });

    // 5. Reparação (um quadro por projeto removido)
    const atual = par.filhos.map((f) => (f.mantido ? f.aposMutacao : f.aposCruzamento));
    let houve = false;
    par.filhos.forEach((f, j) => {
      if (!f.mantido) return;
      f.passosReparo.forEach((p) => {
        houve = true;
        atual[j] = p.depois;
        const pr = projetos[p.removido];
        q.push({
          titulo: base + `Reparação do filho ${j + 1}`,
          texto: `Custo ${reais(p.custoAntes)} acima do orçamento de ${reais(estado.config.orcamento)}. ` +
            `Remove ${LETRAS[p.removido]} (${pr.nome}), a menor razão benefício/custo entre os selecionados: ` +
            `${str(p.antes)} → ${str(p.depois)}, custo ${reais(p.custoDepois)}.`,
          linhas: par.filhos.map((ff, jj) => ff.mantido ? {
            rotulo: `Filho ${jj + 1}`,
            bits: atual[jj].map((v, i) => ({ v, c: jj === j && i === p.removido ? 'rem' : '' })),
          } : descartado(ff, jj)),
        });
      });
    });

    // 6. Avaliação
    q.push({
      titulo: base + 'Avaliação',
      texto: (houve ? '' : 'Nenhum filho ultrapassou o orçamento: sem reparação. ') +
        'A aptidão é o benefício total da solução já reparada.',
      linhas: par.filhos.map((f, j) => f.mantido ? {
        rotulo: `Filho ${j + 1}`,
        bits: simples(f.final),
        info: `custo ${reais(f.custo)} · aptidão ${num(f.aptidao)}`,
      } : descartado(f, j)),
    });
    return q;
  }

  function quadrosInicial(ev) {
    const reparados = ev.inicial.filter((i) => i.passos.length).length;
    return [{
      titulo: 'Geração 0 · População inicial',
      texto: `${ev.inicial.length} indivíduos sorteados gene a gene (50% para 0 e para 1); ${reparados} precisaram de reparação. ` +
        'Os detalhes de cada um estão no log. Avance uma geração para ver os operadores em ação.',
      linhas: ev.inicial.slice(0, 5).map((ind, i) => ({
        rotulo: `Indivíduo #${i}`,
        bits: ind.final.map((v, j) => ({ v, c: ind.bruto[j] !== v ? 'rem' : '' })),
        info: (ind.passos.length ? `sorteado ${str(ind.bruto)}, reparado · ` : '') + `aptidão ${num(ind.aptidao)}`,
      })),
    }];
  }

  function desenharQuadro() {
    const palco = $('palco');
    palco.innerHTML = '';
    const q = anim.quadros[anim.i];
    if (!q) return;
    const h3 = document.createElement('h3');
    h3.textContent = q.titulo + ' ';
    const n = document.createElement('span');
    n.className = 'passo-n';
    n.textContent = `(etapa ${anim.i + 1} de ${anim.quadros.length})`;
    h3.appendChild(n);
    const p = document.createElement('p');
    p.textContent = q.texto;
    palco.append(h3, p);
    q.linhas.forEach((l) => {
      const div = document.createElement('div');
      div.className = 'linha-crom' + (l.classe ? ' ' + l.classe : '');
      const r = document.createElement('span');
      r.className = 'rotulo';
      r.textContent = l.rotulo;
      div.append(r, elCrom(l.bits, l.corte));
      if (l.info) {
        const inf = document.createElement('span');
        inf.className = 'info';
        inf.textContent = l.info;
        div.appendChild(inf);
      }
      palco.appendChild(div);
    });
    const nPares = anim.ev && anim.ev.pares ? anim.ev.pares.length : 0;
    $('animPar').textContent = nPares ? `Geração ${anim.ev.geracao} · par ${anim.par + 1} de ${nPares}` : 'Geração 0';
    $('btnParAnt').disabled = !nPares || anim.par <= 0;
    $('btnParProx').disabled = !nPares || anim.par >= nPares - 1;
    $('btnReproduzir').disabled = !nPares;
    $('btnEtapaAnt').disabled = anim.i <= 0;
    $('btnEtapaProx').disabled = anim.i >= anim.quadros.length - 1;
  }

  function pararAnimacao() {
    clearTimeout(anim.timer);
    anim.timer = null;
  }

  const duracaoQuadro = () => 500 + Number($('intervalo').value);

  // Reproduz elitismo + os pares indicados e chama aoTerminar no fim.
  function tocar(ev, pares, aoTerminar) {
    pararAnimacao();
    anim.ev = ev;
    const partes = pares.map((k) => ({ k, quadros: quadrosPar(ev, k) }));
    const fila = [];
    quadrosElite(ev).forEach((q) => fila.push({ k: pares[0] || 0, q }));
    partes.forEach((pt) => pt.quadros.forEach((q) => fila.push({ k: pt.k, q })));
    anim.quadros = fila.map((f) => f.q);
    anim.i = 0;
    const tique = () => {
      anim.par = fila[anim.i].k;
      desenharQuadro();
      anim.timer = setTimeout(() => {
        if (anim.i < anim.quadros.length - 1) {
          anim.i++;
          tique();
        } else {
          anim.timer = null;
          if (aoTerminar) aoTerminar();
          else atualizarControles();
        }
      }, duracaoQuadro());
    };
    tique();
  }

  // Mostra (e opcionalmente reproduz) um par específico de uma geração.
  function mostrarAnimacaoDe(ev, par, reproduzir) {
    pararAnimacao();
    anim.ev = ev;
    anim.par = par;
    if (ev.geracao === 0) {
      anim.quadros = quadrosInicial(ev);
      anim.i = 0;
      desenharQuadro();
      return;
    }
    if (reproduzir) {
      tocar(ev, [par], null);
    } else {
      anim.quadros = quadrosElite(ev).concat(quadrosPar(ev, par));
      anim.i = anim.quadros.length - 1; // parado na avaliação do par
      desenharQuadro();
    }
  }

  function navegarPar(delta) {
    if (!anim.ev || !anim.ev.pares || executando) return;
    const novo = anim.par + delta;
    if (novo < 0 || novo >= anim.ev.pares.length) return;
    mostrarAnimacaoDe(anim.ev, novo, false);
    anim.i = 1; // começa na seleção do novo par
    desenharQuadro();
  }

  function navegarEtapa(delta) {
    if (executando) return;
    pararAnimacao();
    const novo = anim.i + delta;
    if (novo < 0 || novo >= anim.quadros.length) return;
    anim.i = novo;
    desenharQuadro();
  }

  /* ================= Tema claro/escuro =================
     Só muda a aparência; não interfere no estado do algoritmo. */
  function aplicarTema(tema, salvar) {
    document.documentElement.dataset.tema = tema;
    const escuro = tema === 'escuro';
    const btn = $('btnTema');
    btn.textContent = escuro ? '☀️ Modo claro' : '🌙 Modo noturno';
    btn.setAttribute('aria-pressed', String(escuro));
    if (salvar) {
      try { localStorage.setItem('tema', tema); } catch (e) { /* sem armazenamento: vale só nesta visita */ }
    }
    renderGrafico(); // o gráfico usa as cores do tema
  }

  /* ================= Inicialização ================= */
  function iniciar() {
    aplicarTema(document.documentElement.dataset.tema === 'escuro' ? 'escuro' : 'claro', false);
    $('btnTema').addEventListener('click', () => {
      aplicarTema(document.documentElement.dataset.tema === 'escuro' ? 'claro' : 'escuro', true);
    });

    const tbody = $('tabProjetos').querySelector('tbody');
    EXEMPLO.forEach((p) => tbody.appendChild(criarLinhaProjeto(p)));
    renumerarProjetos();

    $('btnAdicionar').addEventListener('click', () => {
      const n = tbody.children.length;
      if (n >= MAX_PROJ) return;
      tbody.appendChild(criarLinhaProjeto({ nome: `Projeto ${LETRAS[n]}`, custo: '1000', beneficio: '1' }));
      renumerarProjetos();
      marcarSujo();
    });

    // Qualquer alteração em dados ou parâmetros exige reinício.
    $('secDados').addEventListener('input', marcarSujo);
    $('secParametros').addEventListener('input', marcarSujo);

    $('btnExecutar').addEventListener('click', executar);
    $('btnPausar').addEventListener('click', pausar);
    $('btnAvancar').addEventListener('click', avancar);
    $('btnReiniciar').addEventListener('click', reiniciar);
    $('intervalo').addEventListener('input', () => {
      $('intervaloTxt').textContent = `${$('intervalo').value} ms`;
    });

    $('btnParAnt').addEventListener('click', () => navegarPar(-1));
    $('btnParProx').addEventListener('click', () => navegarPar(1));
    $('btnEtapaAnt').addEventListener('click', () => navegarEtapa(-1));
    $('btnEtapaProx').addEventListener('click', () => navegarEtapa(1));
    $('btnReproduzir').addEventListener('click', () => {
      if (anim.ev && anim.ev.pares && !executando) mostrarAnimacaoDe(anim.ev, anim.par, true);
    });

    $('logGeracao').addEventListener('change', () => {
      $('logSeguir').checked = false;
      escreverLog();
    });
    $('logSeguir').addEventListener('change', () => estado && renderLog());

    $('btnTestes').addEventListener('click', () => {
      const r = TestesGA.executar(GA);
      const aprovados = r.filter((t) => t.ok).length;
      $('saidaTestes').textContent = `${aprovados} de ${r.length} grupos de teste aprovados\n\n` + TestesGA.comoTexto(r);
    });

    window.addEventListener('resize', renderGrafico);
    reiniciar();
  }

  document.addEventListener('DOMContentLoaded', iniciar);
})();
