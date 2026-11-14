/*
 * Núcleo do algoritmo genético (sem dependências externas).
 * Funciona no navegador (window.GA) e no Node (require), para que os mesmos
 * operadores usados na interface sejam os exercitados pelos testes.
 *
 * Convenções:
 *  - cromossomo: vetor de 0/1, uma posição por projeto;
 *  - custo e orçamento: inteiros em centavos (evita erro de ponto flutuante);
 *  - aptidão: benefício total da solução já reparada.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GA = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- Gerador pseudoaleatório com semente (mulberry32) ---------- */
  function criarRng(semente) {
    let a = semente >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296; // [0, 1)
    };
  }

  /* ---------- Avaliação ---------- */
  function avaliar(genes, projetos, orcamento) {
    let custo = 0;
    let beneficio = 0;
    const selecionados = [];
    for (let i = 0; i < genes.length; i++) {
      if (genes[i] === 1) {
        custo += projetos[i].custo;
        beneficio += projetos[i].beneficio;
        selecionados.push(i);
      }
    }
    const viavel = custo <= orcamento;
    return {
      custo,
      beneficio,
      saldo: orcamento - custo,
      viavel,
      selecionados,
      aptidao: viavel ? beneficio : null, // só soluções viáveis têm aptidão
    };
  }

  /* ---------- Reparação ----------
   * Enquanto o custo ultrapassar o orçamento, remove o projeto selecionado de
   * menor razão benefício/custo; em empate, o de menor índice.
   * A comparação b_i/c_i < b_j/c_j é feita por multiplicação cruzada.
   */
  function reparar(genes, projetos, orcamento) {
    const g = genes.slice();
    const passos = [];
    let custo = 0;
    for (let i = 0; i < g.length; i++) if (g[i] === 1) custo += projetos[i].custo;

    while (custo > orcamento) {
      let pior = -1;
      for (let i = 0; i < g.length; i++) {
        if (g[i] !== 1) continue;
        if (pior === -1) {
          pior = i;
        } else if (
          projetos[i].beneficio * projetos[pior].custo <
          projetos[pior].beneficio * projetos[i].custo
        ) {
          pior = i; // estritamente menor: empates ficam com o menor índice
        }
      }
      const antes = g.slice();
      g[pior] = 0;
      const custoAntes = custo;
      custo -= projetos[pior].custo;
      passos.push({ removido: pior, antes, depois: g.slice(), custoAntes, custoDepois: custo });
    }
    return { genes: g, passos };
  }

  /* ---------- Seleção por torneio ---------- */
  // Vencedor: maior aptidão; em empate, menor índice na população.
  function vencedorTorneio(candidatos, aptidoes) {
    let v = candidatos[0];
    for (let k = 1; k < candidatos.length; k++) {
      const c = candidatos[k];
      if (aptidoes[c] > aptidoes[v] || (aptidoes[c] === aptidoes[v] && c < v)) v = c;
    }
    return v;
  }

  // Sorteia k candidatos distintos (Fisher-Yates parcial) e devolve o vencedor.
  function torneio(aptidoes, k, rng) {
    const n = aptidoes.length;
    const idx = new Array(n);
    for (let i = 0; i < n; i++) idx[i] = i;
    for (let i = 0; i < k; i++) {
      const j = i + Math.floor(rng() * (n - i));
      const tmp = idx[i];
      idx[i] = idx[j];
      idx[j] = tmp;
    }
    const candidatos = idx.slice(0, k);
    return { candidatos, vencedor: vencedorTorneio(candidatos, aptidoes) };
  }

  /* ---------- Cruzamento de um ponto ----------
   * corte = quantidade de genes antes do corte (1 .. n-1), isto é,
   * "corte após o gene `corte`".
   */
  function cruzar(pai1, pai2, corte) {
    return [
      pai1.slice(0, corte).concat(pai2.slice(corte)),
      pai2.slice(0, corte).concat(pai1.slice(corte)),
    ];
  }

  function sortearCorte(n, rng) {
    return 1 + Math.floor(rng() * (n - 1));
  }

  /* ---------- Mutação por inversão de bits ---------- */
  function inverterBits(genes, posicoes) {
    const g = genes.slice();
    for (const p of posicoes) g[p] = g[p] === 1 ? 0 : 1;
    return g;
  }

  // Cada gene é sorteado de forma independente com probabilidade `taxa` (0..1).
  function mutar(genes, taxa, rng) {
    const bits = [];
    for (let i = 0; i < genes.length; i++) if (rng() < taxa) bits.push(i);
    return { genes: inverterBits(genes, bits), bits };
  }

  /* ---------- Execução ---------- */
  function estatisticas(populacao) {
    let melhor = -Infinity;
    let soma = 0;
    for (const ind of populacao) {
      if (ind.aptidao > melhor) melhor = ind.aptidao;
      soma += ind.aptidao;
    }
    return { melhor, media: soma / populacao.length };
  }

  function atualizarMelhorGlobal(estado) {
    for (let i = 0; i < estado.populacao.length; i++) {
      const ind = estado.populacao[i];
      if (!estado.melhorGlobal || ind.aptidao > estado.melhorGlobal.aptidao) {
        estado.melhorGlobal = {
          genes: ind.genes.slice(),
          aptidao: ind.aptidao,
          custo: ind.custo,
          geracao: estado.geracao,
        };
      }
    }
  }

  function registrar(estado, evento) {
    const s = estatisticas(estado.populacao);
    atualizarMelhorGlobal(estado);
    estado.historico.push({
      geracao: estado.geracao,
      melhor: s.melhor,
      media: s.media,
      acumulado: estado.melhorGlobal.aptidao,
    });
    estado.eventos.push(evento);
    const max = estado.config.maxEventos || 100;
    while (estado.eventos.length > max) estado.eventos.shift();
  }

  /*
   * config: { projetos:[{nome,custo,beneficio}], orcamento, tamPopulacao,
   *           geracoes, taxaCruzamento (0..1), taxaMutacao (0..1),
   *           tamTorneio, elite, semente, maxEventos? }
   * Cria a geração 0: genes sorteados com 50% de chance, reparados e avaliados.
   */
  function criarEstado(config) {
    const rng = criarRng(config.semente);
    const n = config.projetos.length;
    const populacao = [];
    const inicial = [];
    for (let i = 0; i < config.tamPopulacao; i++) {
      const bruto = [];
      for (let j = 0; j < n; j++) bruto.push(rng() < 0.5 ? 1 : 0);
      const rep = reparar(bruto, config.projetos, config.orcamento);
      const av = avaliar(rep.genes, config.projetos, config.orcamento);
      populacao.push({ genes: rep.genes, aptidao: av.aptidao, custo: av.custo });
      inicial.push({ bruto, passos: rep.passos, final: rep.genes, aptidao: av.aptidao, custo: av.custo });
    }
    const estado = {
      config,
      rng,
      geracao: 0,
      populacao,
      historico: [],
      eventos: [],
      melhorGlobal: null,
    };
    registrar(estado, { geracao: 0, inicial });
    return estado;
  }

  function terminou(estado) {
    return estado.geracao >= estado.config.geracoes;
  }

  /*
   * Produz exatamente uma nova geração. Ordem dos sorteios, por par:
   *   torneio do pai 1 -> torneio do pai 2 -> ocorre cruzamento? ->
   *   ponto de corte (se cruzou) -> mutação do filho 1 (gene a gene) ->
   *   mutação do filho 2 (gene a gene, se ele for mantido).
   */
  function passo(estado) {
    if (terminou(estado)) return null;
    const cfg = estado.config;
    const pop = estado.populacao;
    const N = pop.length;
    const n = cfg.projetos.length;
    const aptidoes = pop.map((ind) => ind.aptidao);

    // Elitismo: melhores indivíduos copiados sem modificação.
    const ordem = aptidoes.map((_, i) => i).sort((a, b) => aptidoes[b] - aptidoes[a] || a - b);
    const elite = ordem.slice(0, cfg.elite).map((i) => ({
      indice: i,
      genes: pop[i].genes.slice(),
      aptidao: pop[i].aptidao,
      custo: pop[i].custo,
    }));
    const nova = elite.map((e) => ({ genes: e.genes.slice(), aptidao: e.aptidao, custo: e.custo }));

    // Demais vagas: descendentes de pais escolhidos sempre na população anterior.
    const pares = [];
    while (nova.length < N) {
      const t1 = torneio(aptidoes, cfg.tamTorneio, estado.rng);
      const t2 = torneio(aptidoes, cfg.tamTorneio, estado.rng);
      const p1 = pop[t1.vencedor];
      const p2 = pop[t2.vencedor];

      const cruzou = estado.rng() < cfg.taxaCruzamento;
      let corte = null;
      let brutos;
      if (cruzou) {
        corte = sortearCorte(n, estado.rng);
        brutos = cruzar(p1.genes, p2.genes, corte);
      } else {
        brutos = [p1.genes.slice(), p2.genes.slice()];
      }

      const manter = Math.min(2, N - nova.length); // se restar uma vaga, só o filho 1
      const filhos = [];
      for (let f = 0; f < 2; f++) {
        if (f >= manter) {
          filhos.push({ aposCruzamento: brutos[f], mantido: false });
          continue;
        }
        const m = mutar(brutos[f], cfg.taxaMutacao, estado.rng);
        const rep = reparar(m.genes, cfg.projetos, cfg.orcamento);
        const av = avaliar(rep.genes, cfg.projetos, cfg.orcamento);
        nova.push({ genes: rep.genes, aptidao: av.aptidao, custo: av.custo });
        filhos.push({
          aposCruzamento: brutos[f],
          bitsMutados: m.bits,
          aposMutacao: m.genes,
          passosReparo: rep.passos,
          final: rep.genes,
          custo: av.custo,
          aptidao: av.aptidao,
          mantido: true,
        });
      }

      pares.push({
        t1,
        t2,
        pais: [
          { indice: t1.vencedor, genes: p1.genes.slice(), aptidao: p1.aptidao },
          { indice: t2.vencedor, genes: p2.genes.slice(), aptidao: p2.aptidao },
        ],
        cruzou,
        corte,
        filhos,
      });
    }

    estado.populacao = nova;
    estado.geracao += 1;
    const evento = { geracao: estado.geracao, elite, pares, aptidoesAnteriores: aptidoes };
    registrar(estado, evento);
    return evento;
  }

  function executarTudo(config) {
    const estado = criarEstado(config);
    while (!terminou(estado)) passo(estado);
    return estado;
  }

  /* ---------- Texto (formatação e logs) ---------- */
  const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const str = (genes) => genes.join('');
  const reais = (centavos) =>
    (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const num = (x) => x.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

  function textoReparo(passos) {
    if (!passos.length) return 'sem reparação';
    let s = str(passos[0].antes);
    for (const p of passos) s += ` → ${str(p.depois)} (remove ${LETRAS[p.removido]})`;
    return s;
  }

  // Log textual de uma geração, registrando apenas o que de fato ocorreu.
  function descreverEvento(ev) {
    const linhas = [];
    if (ev.geracao === 0) {
      linhas.push('Geração 0 — população inicial (cada gene sorteado com 50% de chance)');
      ev.inicial.forEach((ind, i) => {
        const rep = ind.passos.length ? `reparação: ${textoReparo(ind.passos)}` : 'sem reparação';
        linhas.push(
          `#${i}: sorteado ${str(ind.bruto)}; ${rep}; custo ${reais(ind.custo)}; aptidão ${num(ind.aptidao)}`
        );
      });
      return linhas.join('\n');
    }

    linhas.push(`Geração ${ev.geracao}`);
    if (ev.elite.length === 0) {
      linhas.push('Elitismo: nenhum indivíduo preservado (quantidade de elite = 0).');
    } else {
      linhas.push(
        'Elitismo: preservados sem modificação ' +
          ev.elite.map((e) => `#${e.indice} ${str(e.genes)} (aptidão ${num(e.aptidao)})`).join(', ') +
          '.'
      );
    }
    ev.pares.forEach((par, k) => {
      const cand = (t) =>
        t.candidatos.map((c) => `#${c} (apt. ${num(ev.aptidoesAnteriores[c])})`).join(', ');
      const partes = [];
      partes.push(
        `torneios: [${cand(par.t1)}] → #${par.t1.vencedor}; [${cand(par.t2)}] → #${par.t2.vencedor}`
      );
      partes.push(`pais: ${str(par.pais[0].genes)} e ${str(par.pais[1].genes)}`);
      partes.push(
        par.cruzou ? `corte após o gene ${par.corte}` : 'sem cruzamento (filhos copiam os pais)'
      );
      partes.push(
        `filhos: ${str(par.filhos[0].aposCruzamento)} e ${str(par.filhos[1].aposCruzamento)}`
      );
      par.filhos.forEach((f, j) => {
        const nome = `filho ${j + 1}`;
        if (!f.mantido) {
          partes.push(`${nome} descartado (restava apenas uma vaga)`);
          return;
        }
        partes.push(
          f.bitsMutados.length
            ? `mutação no ${nome}, gene(s) ${f.bitsMutados.map((b) => b + 1).join(', ')}: ${str(f.aposMutacao)}`
            : `${nome} sem mutação`
        );
        if (f.passosReparo.length) partes.push(`reparação do ${nome}: ${textoReparo(f.passosReparo)}`);
        partes.push(`${nome} avaliado: ${str(f.final)}, custo ${reais(f.custo)}, aptidão ${num(f.aptidao)}`);
      });
      linhas.push(`Par ${k + 1} — ${partes.join('; ')}.`);
    });
    return linhas.join('\n');
  }

  return {
    criarRng,
    avaliar,
    reparar,
    vencedorTorneio,
    torneio,
    cruzar,
    sortearCorte,
    inverterBits,
    mutar,
    criarEstado,
    passo,
    terminou,
    executarTudo,
    descreverEvento,
    textoReparo,
    LETRAS,
    str,
    reais,
    num,
  };
});
