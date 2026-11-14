/*
 * Testes de validação da seção 6 do enunciado.
 * Usados tanto pela página (botão "Executar testes") quanto pelo Node
 * (node rodar-testes.js). Chamam os mesmos operadores de ga.js.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TestesGA = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function executar(GA) {
    const { str, reais, num } = GA;
    const P = [
      { nome: 'Melhoria da iluminação', custo: 400000, beneficio: 7 },
      { nome: 'Instalação de bicicletários', custo: 300000, beneficio: 5 },
      { nome: 'Aquisição de bancos', custo: 200000, beneficio: 3 },
      { nome: 'Reforma de espaço de convivência', custo: 500000, beneficio: 8 },
    ];
    const ORC = 700000;
    const g = (s) => s.split('').map(Number);
    const resultados = [];

    function teste(titulo, corpo) {
      const linhas = [];
      let ok = true;
      const conferir = (cond, texto) => {
        if (!cond) ok = false;
        linhas.push(`${cond ? '[ok]' : '[FALHOU]'} ${texto}`);
      };
      const nota = (texto) => linhas.push(texto);
      corpo(conferir, nota);
      resultados.push({ titulo, ok, linhas });
    }

    const base = {
      projetos: P,
      orcamento: ORC,
      tamPopulacao: 20,
      geracoes: 50,
      taxaCruzamento: 0.8,
      taxaMutacao: 0.05,
      tamTorneio: 2,
      elite: 1,
      semente: 42,
      maxEventos: 1000,
    };

    /* 6.2 */
    teste('6.2 Avaliação de uma solução', (conferir, nota) => {
      const a = GA.avaliar(g('1100'), P, ORC);
      nota(
        `1100 → projetos ${a.selecionados.map((i) => GA.LETRAS[i]).join(' e ')}; custo ${reais(a.custo)}; ` +
          `benefício ${num(a.beneficio)}; saldo ${reais(a.saldo)}; viável: ${a.viavel ? 'sim' : 'não'}; aptidão ${num(a.aptidao)}`
      );
      conferir(
        a.custo === 700000 && a.beneficio === 12 && a.saldo === 0 && a.viavel && a.aptidao === 12,
        '1100: custo R$ 7.000, benefício 12, saldo R$ 0, viável, aptidão 12'
      );
      const esperado = {
        '0000': [0, 0], '1000': [400000, 7], '0100': [300000, 5], '0010': [200000, 3],
        '0001': [500000, 8], '1100': [700000, 12], '1010': [600000, 10], '0110': [500000, 8],
        '0011': [700000, 11],
      };
      let tabelaOk = true;
      const viaveis = [];
      for (let v = 0; v < 16; v++) {
        const s = v.toString(2).padStart(4, '0');
        const r = GA.avaliar(g(s), P, ORC);
        if (r.viavel) viaveis.push(s);
        const e = esperado[s];
        if (e ? !(r.viavel && r.custo === e[0] && r.beneficio === e[1]) : r.viavel) tabelaOk = false;
      }
      nota(`Soluções viáveis encontradas (${viaveis.length}): ${viaveis.join(', ')}`);
      conferir(tabelaOk, 'as 9 soluções viáveis têm custo e benefício iguais à tabela; as outras 7 são inviáveis');
    });

    /* 6.3 */
    teste('6.3 Reparação de uma solução inviável', (conferir, nota) => {
      const ini = GA.avaliar(g('1111'), P, ORC);
      nota(`1111 → custo ${reais(ini.custo)}; benefício ${num(ini.beneficio)}`);
      const r = GA.reparar(g('1111'), P, ORC);
      r.passos.forEach((p) => {
        const a = GA.avaliar(p.depois, P, ORC);
        nota(
          `Remover ${GA.LETRAS[p.removido]} → ${str(p.depois)}: custo ${reais(a.custo)}; benefício ${num(a.beneficio)}` +
            (a.viavel ? '; solução viável' : '')
        );
      });
      conferir(
        r.passos.length === 2 && r.passos[0].removido === 2 && str(r.passos[0].depois) === '1101' &&
          r.passos[1].removido === 3 && str(r.genes) === '1100',
        '1111 → 1101 (remove C) → 1100 (remove D)'
      );
    });

    /* 6.4 */
    teste('6.4 Cruzamento e mutação com escolhas controladas', (conferir, nota) => {
      const [f1, f2] = GA.cruzar(g('1100'), g('0011'), 2);
      nota(`Cruzamento: 11|00 + 00|11 → filho 1 = ${str(f1)}; filho 2 = ${str(f2)}`);
      conferir(str(f1) === '1111' && str(f2) === '0000', 'filhos 1111 e 0000');

      const m1 = GA.inverterBits(f1, [0]);
      const m2 = GA.inverterBits(f2, []);
      nota(`Mutação: filho 1 = ${str(m1)}; filho 2 = ${str(m2)}`);
      conferir(str(m1) === '0111' && str(m2) === '0000', 'mutação apenas no gene 1 do filho 1: 0111; filho 2 inalterado');

      const r1 = GA.reparar(m1, P, ORC);
      const r2 = GA.reparar(m2, P, ORC);
      nota(`Reparação do filho 1: ${GA.textoReparo(r1.passos)}`);
      nota(`Reparação do filho 2: ${r2.passos.length ? GA.textoReparo(r2.passos) : 'permanece ' + str(r2.genes)}`);
      conferir(
        str(r1.genes) === '0100' && r1.passos.length === 2 && r1.passos[0].removido === 2 &&
          r1.passos[1].removido === 3 && str(r1.passos[0].depois) === '0101',
        'filho 1: 0111 → 0101 → 0100, removendo C e depois D'
      );
      conferir(str(r2.genes) === '0000' && r2.passos.length === 0, 'filho 2 permanece 0000');

      const a1 = GA.avaliar(r1.genes, P, ORC);
      const a2 = GA.avaliar(r2.genes, P, ORC);
      nota(
        `Avaliação final: filho 1 = ${str(r1.genes)}, custo ${reais(a1.custo)}, aptidão ${num(a1.aptidao)}; ` +
          `filho 2 = ${str(r2.genes)}, custo ${reais(a2.custo)}, aptidão ${num(a2.aptidao)}`
      );
      conferir(a1.custo === 300000 && a1.aptidao === 5 && a2.custo === 0 && a2.aptidao === 0,
        'filho 1: custo R$ 3.000 e aptidão 5; filho 2: custo R$ 0 e aptidão 0');

      // Limites das taxas, verificados nos eventos de execuções reais.
      const filhosDe = (cfg) => {
        const e = GA.executarTudo(Object.assign({}, base, cfg, { geracoes: 10 }));
        const lista = [];
        e.eventos.forEach((ev) => {
          if (ev.geracao === 0) return;
          ev.pares.forEach((par) => par.filhos.forEach((f, j) => lista.push({ par, f, j })));
        });
        return lista;
      };
      const mut0 = filhosDe({ taxaMutacao: 0 }).filter((x) => x.f.mantido);
      conferir(mut0.every((x) => x.f.bitsMutados.length === 0 && str(x.f.aposMutacao) === str(x.f.aposCruzamento)),
        `mutação 0%: nenhum gene invertido (${mut0.length} descendentes conferidos)`);
      const mut100 = filhosDe({ taxaMutacao: 1 }).filter((x) => x.f.mantido);
      conferir(mut100.every((x) => x.f.aposMutacao.every((b, i) => b === 1 - x.f.aposCruzamento[i])),
        `mutação 100%: todos os genes invertidos antes da reparação (${mut100.length} descendentes conferidos)`);
      const cruz0 = filhosDe({ taxaCruzamento: 0 });
      conferir(cruz0.every((x) => !x.par.cruzou && str(x.f.aposCruzamento) === str(x.par.pais[x.j].genes)),
        `cruzamento 0%: filhos copiam os pais antes da mutação (${cruz0.length} filhos conferidos)`);
      const cruz100 = filhosDe({ taxaCruzamento: 1 });
      conferir(cruz100.every((x) => x.par.cruzou && x.par.corte >= 1 && x.par.corte <= 3),
        'cruzamento 100%: todo par cruza, com corte entre o 1º e o penúltimo gene');

      // Seleção isolada.
      const v = GA.vencedorTorneio([0, 1, 2], [7, 11, 12]);
      nota(`Torneio com 1000 (7), 0011 (11) e 1100 (12) → vencedor: candidato de aptidão ${[7, 11, 12][v]}`);
      conferir(v === 2, 'vence 1100 (aptidão 12)');
      const apt = [8, 8, 8, 8, 8, 8, 8, 8, 8];
      const e = GA.vencedorTorneio([5, 2, 8], apt);
      nota(`Empate: candidatos #5, #2 e #8, todos com aptidão 8 → vencedor #${e}`);
      conferir(e === 2, 'empate resolvido pelo menor índice na população (#2)');
      const rng = GA.criarRng(7);
      let distintos = true;
      for (let i = 0; i < 500; i++) {
        const t = GA.torneio([1, 2, 3, 4, 5, 6], 4, rng);
        if (new Set(t.candidatos).size !== 4) distintos = false;
      }
      conferir(distintos, 'candidatos de um mesmo torneio são sempre distintos (500 torneios de tamanho 4)');
    });

    /* 6.5 */
    teste('6.5 Execução completa e análise dos resultados', (conferir, nota) => {
      const e = GA.executarTudo(base);
      const m = e.melhorGlobal;
      const a = GA.avaliar(m.genes, P, ORC);
      nota('Parâmetros: população 20; 50 gerações; cruzamento 80%; mutação 5%; torneio 2; elite 1; semente 42');
      nota(
        `Melhor solução: ${str(m.genes)}; projetos ${a.selecionados.map((i) => GA.LETRAS[i]).join(' e ') || 'nenhum'}; ` +
          `custo ${reais(a.custo)}; benefício ${num(a.beneficio)}; saldo ${reais(a.saldo)}; encontrada na geração ${m.geracao}`
      );
      const h = e.historico;
      nota(`Geração 0: melhor ${num(h[0].melhor)}, média ${num(h[0].media)}; geração 50: melhor ${num(h[50].melhor)}, média ${num(h[50].media)}`);
      conferir(h.length === 51, `histórico com ${h.length} registros (geração 0 + 50 gerações)`);
      conferir(a.custo <= ORC && a.beneficio <= 12 && a.beneficio === m.aptidao && a.custo === m.custo,
        'custo ≤ R$ 7.000, benefício ≤ 12 e totais compatíveis com o cromossomo');
      conferir(h.every((r, i) => i === 0 || r.acumulado >= h[i - 1].acumulado), 'melhor acumulado nunca diminui');
      conferir(h.every((r, i) => i === 0 || r.melhor >= h[i - 1].melhor),
        'com 1 indivíduo de elite, a melhor aptidão da população nunca diminui');
      const e2 = GA.executarTudo(base);
      conferir(JSON.stringify(e2.historico) === JSON.stringify(h), 'mesma semente reproduz exatamente a mesma execução');

      nota('');
      nota('Efeito da mutação (demais parâmetros iguais; sementes 1 a 5):');
      [0.01, 0.2].forEach((taxa) => {
        const finais = [];
        const detalhes = [];
        [1, 2, 3, 4, 5].forEach((semente) => {
          const r = GA.executarTudo(Object.assign({}, base, { taxaMutacao: taxa, semente }));
          finais.push(r.melhorGlobal.aptidao);
          const u = r.historico[r.historico.length - 1];
          detalhes.push(
            `semente ${semente}: melhor ${num(r.melhorGlobal.aptidao)} (${str(r.melhorGlobal.genes)}, geração ${r.melhorGlobal.geracao}), média final da população ${num(u.media)}`
          );
        });
        const media = finais.reduce((s, x) => s + x, 0) / finais.length;
        nota(`Mutação ${taxa * 100}%: média do melhor benefício final = ${num(media)}; execuções que atingiram 12: ${finais.filter((x) => x === 12).length} de 5`);
        detalhes.forEach((d) => nota('  ' + d));
      });
    });

    /* 6.6 */
    teste('6.6 Limites de orçamento', (conferir, nota) => {
      const e = GA.criarEstado(Object.assign({}, base, { orcamento: 0 }));
      let todosZero = e.populacao.every((i) => str(i.genes) === '0000' && i.aptidao === 0 && i.custo === 0);
      while (!GA.terminou(e)) {
        GA.passo(e);
        if (!e.populacao.every((i) => str(i.genes) === '0000' && i.aptidao === 0 && i.custo === 0)) todosZero = false;
      }
      nota(`Orçamento R$ 0: melhor solução ${str(e.melhorGlobal.genes)}; custo ${reais(e.melhorGlobal.custo)}; aptidão ${num(e.melhorGlobal.aptidao)}`);
      conferir(todosZero, 'orçamento R$ 0: toda a população é 0000 (custo, benefício e aptidão zero) nas 51 gerações');

      const a = GA.avaliar(g('1111'), P, 1400000);
      nota(`Orçamento R$ 14.000, cromossomo 1111 → custo ${reais(a.custo)}; benefício ${num(a.beneficio)}; saldo ${reais(a.saldo)}; viável: ${a.viavel ? 'sim' : 'não'}`);
      conferir(a.viavel && a.custo === 1400000 && a.beneficio === 23 && a.saldo === 0,
        '1111 viável com custo R$ 14.000, benefício 23 e saldo R$ 0');
      const r = GA.executarTudo(Object.assign({}, base, { orcamento: 1400000 }));
      nota(`Execução completa com orçamento R$ 14.000 (semente 42): melhor ${str(r.melhorGlobal.genes)}, benefício ${num(r.melhorGlobal.aptidao)}`);
    });

    return resultados;
  }

  function comoTexto(resultados) {
    return resultados
      .map((r) => `${r.titulo} — ${r.ok ? 'APROVADO' : 'REPROVADO'}\n${r.linhas.join('\n')}`)
      .join('\n\n');
  }

  return { executar, comoTexto };
});
