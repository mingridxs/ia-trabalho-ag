# Simulador de Algoritmo Genético — Projetos do Campus

Atividade prática de Algoritmo Genético · Inteligência Artificial · UFPI · 2026.2

- **Aplicação publicada:** https://mingridxs.github.io/ia-trabalho-ag/
- **Repositório:** https://github.com/mingridxs/ia-trabalho-ag

## Autores

- Maria Ingrid ([mingridxs](https://github.com/mingridxs))
- Carlos Henrique ([CarlosRPL](https://github.com/CarlosRPL))

## Descrição da solução

Simulador, executado inteiramente no navegador, de um algoritmo genético que escolhe projetos de melhoria de um campus com orçamento limitado. O objetivo é maximizar a soma dos benefícios sem ultrapassar o orçamento (problema da mochila 0/1).

- **Representação:** cromossomo binário, um gene por projeto, na ordem da tabela (1 = selecionado, 0 = excluído).
- **População inicial:** cada gene sorteado de forma independente, com 50% de chance para 0 e para 1.
- **Reparação:** enquanto o custo ultrapassar o orçamento, remove-se o projeto selecionado de menor razão benefício/custo (em empate, o de menor índice). É aplicada à população inicial e a todos os descendentes antes da avaliação.
- **Aptidão:** benefício total da solução já reparada. A seleção vazia é válida e tem aptidão zero.
- **Seleção:** torneio independente para cada pai, com candidatos distintos; vence a maior aptidão e, em empate, o menor índice na população.
- **Cruzamento:** de um ponto, com a taxa aplicada por par de pais; o corte é sorteado entre o primeiro e o penúltimo gene. Sem cruzamento, os filhos copiam os pais.
- **Mutação:** inversão de bits, com a taxa aplicada de forma independente a cada gene de cada descendente.
- **Elitismo:** os melhores indivíduos são copiados sem modificação; as demais vagas são preenchidas por descendentes de pais escolhidos sempre na população anterior. Se restar uma vaga, só o primeiro filho do último par é mantido. O tamanho da população é constante.
- **Parada:** após o número configurado de gerações, apresentando a melhor solução de toda a execução.

Ordem dos sorteios em cada par: torneio do pai 1, torneio do pai 2, ocorrência do cruzamento, ponto de corte (se cruzou), mutação do filho 1 gene a gene, mutação do filho 2 gene a gene (se ele for mantido). Custos e orçamento são tratados internamente em centavos, para evitar erros de ponto flutuante.

### Arquivos

| Arquivo | Conteúdo |
| --- | --- |
| `index.html` | Estrutura da página |
| `style.css` | Estilos e animações |
| `ga.js` | Algoritmo genético: gerador com semente, avaliação, reparação, torneio, cruzamento, mutação, elitismo e logs |
| `app.js` | Interface: validação, controles, métricas, gráfico, histórico e animação |
| `testes.js` | Testes da seção 6 (usados pela página e pelo terminal) |
| `rodar-testes.js` | Executa os testes no terminal com `node rodar-testes.js` |

## Instruções de uso

1. Abra a aplicação publicada (ou o arquivo `index.html` em um navegador; não há instalação nem servidor).
2. A tela inicia com o exemplo da seção 6.1. Edite os projetos, o orçamento e os parâmetros se quiser. É possível adicionar e remover projetos, mantendo entre 4 e 15.
3. Qualquer alteração exige clicar em **Reiniciar**, que valida os campos, limpa o histórico e restabelece a semente. Entradas inválidas (inclusive campos vazios) bloqueiam a execução e são listadas em vermelho.
4. Controles:
   - **Executar:** roda as gerações em sequência, ou retoma de onde parou.
   - **Pausar:** interrompe preservando o estado.
   - **Avançar uma geração:** produz exatamente uma geração e permanece pausado.
   - **Reiniciar:** volta à geração 0 com a semente configurada.
5. Acompanhe a geração atual, a melhor aptidão da geração, a aptidão média e o melhor resultado acumulado, além do gráfico, da tabela de histórico, da população atual e do log.
6. A seção **Animação das operações** mostra, para a geração exibida, os torneios, o ponto de corte, a troca de segmentos, os bits mutados, as remoções da reparação e a avaliação. Use os botões de par e de etapa para navegar manualmente.
7. O botão **Executar testes** roda os testes da seção 6 na própria página.

## Parâmetros

| Campo | Valor inicial | Validação |
| --- | --- | --- |
| Projetos | exemplo da seção 6.1 | nome não vazio; custo positivo com até duas casas decimais; benefício não negativo; de 4 a 15 projetos |
| Orçamento disponível | R$ 7.000 | não negativo, com até duas casas decimais |
| Tamanho da população | 20 | inteiro ≥ 2 (limite prático de 500) |
| Número de gerações | 50 | inteiro ≥ 1 (limite prático de 5000); a população inicial é a geração 0 |
| Taxa de cruzamento | 80% | entre 0% e 100%, por par de pais |
| Taxa de mutação | 5% | entre 0% e 100%, por gene |
| Tamanho do torneio | 2 | inteiro entre 2 e o tamanho da população |
| Indivíduos de elite | 1 | inteiro entre 0 e o tamanho da população menos 1 |
| Semente aleatória | 42 | inteiro |

Os limites superiores de população e gerações não constam do enunciado; existem apenas para o navegador não travar.

## Bibliotecas auxiliares

Nenhuma biblioteca externa é utilizada. O algoritmo genético, o gráfico (em `<canvas>`) e as animações (CSS) foram implementados no próprio projeto. O gerador pseudoaleatório com semente é o algoritmo público *mulberry32*, escrito diretamente em `ga.js`.

## Resultados dos testes (seção 6)

Os testes estão em `testes.js` e chamam os mesmos operadores usados pelo simulador. Dados da seção 6.1: A (R$ 4.000; 7), B (R$ 3.000; 5), C (R$ 2.000; 3), D (R$ 5.000; 8); orçamento de R$ 7.000, salvo indicação em contrário.

### 6.2 Avaliação de uma solução

- **Entrada:** cromossomo 1100; orçamento R$ 7.000.
- **Saída obtida:** projetos A e B; custo R$ 7.000,00; benefício 12; saldo R$ 0,00; viável; aptidão 12.
- Avaliando os 16 cromossomos possíveis, 9 são viáveis (0000, 1000, 0100, 0010, 0001, 1100, 1010, 0110, 0011), com custo e benefício iguais aos da tabela do enunciado; os outros 7 ultrapassam o orçamento.
- **Conclusão:** coincide com a referência.

### 6.3 Reparação de uma solução inviável

- **Entrada:** cromossomo 1111; orçamento R$ 7.000.
- **Saída obtida:**
  - 1111 → custo R$ 14.000,00; benefício 23
  - remove C → 1101: custo R$ 12.000,00; benefício 20
  - remove D → 1100: custo R$ 7.000,00; benefício 12; solução viável
- **Conclusão:** saída exata, igual à referência.

### 6.4 Cruzamento e mutação com escolhas controladas

- **Entrada:** pai 1 = 1100; pai 2 = 0011; corte após o segundo gene; inversão forçada apenas do gene 1 do filho 1.
- **Saída obtida:**
  - Cruzamento: 11|00 + 00|11 → filho 1 = 1111; filho 2 = 0000
  - Mutação: filho 1 = 0111; filho 2 = 0000
  - Reparação do filho 1: 0111 → 0101 (remove C) → 0100 (remove D)
  - Reparação do filho 2: permanece 0000
  - Avaliação final: filho 1 = 0100, custo R$ 3.000,00, aptidão 5; filho 2 = 0000, custo R$ 0,00, aptidão 0
- **Limites das taxas** (conferidos nos eventos registrados em execuções de 10 gerações, população 20, semente 42):
  - mutação 0%: nenhum gene invertido nos 190 descendentes;
  - mutação 100%: todos os genes dos 190 descendentes invertidos antes da reparação;
  - cruzamento 0%: os 200 filhos são cópias dos pais antes da mutação;
  - cruzamento 100%: todo par cruza, com corte entre o 1º e o penúltimo gene.
- **Seleção isolada:**
  - torneio com 1000 (aptidão 7), 0011 (aptidão 11) e 1100 (aptidão 12): vence 1100;
  - empate entre os candidatos #5, #2 e #8, todos com aptidão 8: vence #2 (menor índice);
  - em 500 torneios de tamanho 4, os candidatos foram sempre distintos.
- **Conclusão:** todos os valores coincidem com a referência. Cruzamento, mutação e reparação aparecem em registros separados no log e na animação.

### 6.5 Execução completa e análise dos resultados

- **Parâmetros:** população 20; 50 gerações; cruzamento 80%; mutação 5%; torneio 2; elite 1; semente 42.
- **Saída obtida:** cromossomo 1100; projetos A e B; custo R$ 7.000,00; benefício 12; saldo R$ 0,00; encontrada na geração 0.
- Geração 0: melhor 12, média 7,6. Geração 50: melhor 12, média 11,2.
- **Verificações:**
  - o histórico tem 51 registros (geração 0 e as 50 produzidas);
  - custo ≤ R$ 7.000, benefício ≤ 12 e totais compatíveis com o cromossomo;
  - o melhor acumulado nunca diminui;
  - com 1 indivíduo de elite, a melhor aptidão da população nunca diminui;
  - repetir a execução com a mesma semente reproduz exatamente o mesmo histórico.
- **Conclusão:** a execução atingiu o ótimo de referência. Nesta instância o ótimo já aparece na população inicial, o que é esperado: há só 16 cromossomos possíveis e a reparação leva vários cromossomos inviáveis diretamente a 1100 (por exemplo, 1111, 1101 e 1110).

#### Efeito da taxa de mutação

Demais parâmetros iguais aos acima; cinco execuções por configuração.

| Semente | Mutação 1%: melhor benefício | Mutação 1%: média final da população | Mutação 20%: melhor benefício | Mutação 20%: média final da população |
| --- | --- | --- | --- | --- |
| 1 | 12 (geração 0) | 12 | 12 (geração 0) | 8,6 |
| 2 | 12 (geração 0) | 11,75 | 12 (geração 0) | 9,5 |
| 3 | 12 (geração 2) | 12 | 12 (geração 1) | 9,15 |
| 4 | 12 (geração 0) | 11,3 | 12 (geração 0) | 9,3 |
| 5 | 12 (geração 0) | 12 | 12 (geração 0) | 8,1 |

| Configuração | Média do melhor benefício final | Execuções que atingiram 12 |
| --- | --- | --- |
| Mutação 1% | 12 | 5 de 5 |
| Mutação 20% | 12 | 5 de 5 |

**Interpretação.** Quanto ao melhor benefício final, as duas taxas empataram: todas as dez execuções atingiram 12. Isso se deve mais à instância do que à mutação. O espaço de busca tem 16 cromossomos, a população tem 20 indivíduos e a reparação converte parte das soluções inviáveis no próprio ótimo, de modo que ele costuma surgir na geração 0 ou nas primeiras gerações; com 1 indivíduo de elite, uma vez encontrado ele não se perde. Portanto, estes dados não permitem dizer que uma taxa é superior à outra na qualidade da melhor solução.

A diferença aparece na média final da população: cerca de 11,8 com 1% e cerca de 8,9 com 20%. Com mutação baixa, a população converge para cópias do melhor indivíduo; com mutação alta, muitos descendentes são alterados a cada geração e, depois de reparados, ficam frequentemente piores que os pais, mantendo a população mais diversa e com média menor. Em instâncias maiores, essa diversidade pode ajudar a escapar de ótimos locais, enquanto uma taxa baixa pode levar à convergência prematura; por outro lado, mutação demais aproxima a busca de um sorteio aleatório. Qual taxa é melhor depende do problema e dos demais parâmetros.

### 6.6 Limites de orçamento

- **Orçamento R$ 0:** nas 51 gerações, toda a população é 0000, com custo, benefício e aptidão iguais a zero. Melhor solução: 0000.
- **Orçamento R$ 14.000:** a avaliação de 1111 retorna custo R$ 14.000,00, benefício 23, saldo R$ 0,00 e solução viável. Na execução completa com semente 42, a melhor solução encontrada foi 1111, com benefício 23.
- **Conclusão:** coincide com a referência.

### Como reproduzir

- Na página: botão **Executar testes**.
- No terminal: `node rodar-testes.js` (requer Node.js; termina com código 0 se todos os testes passarem).
