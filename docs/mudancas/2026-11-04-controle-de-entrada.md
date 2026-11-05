# Controle de entrada nos formulários (04/11/2026)

Branch: `controle-de-entrada`. Autor: VMLino, com o Claude Code.

## Por quê

Os campos de texto do Diário de voo, dos Gastos da turma, do Hangar e do apelido do jogo aceitavam qualquer coisa: letras no lugar de horas, matrícula sem hífen, código ICAO em minúsculas, nomes com símbolos, valores absurdos. Isso sujava o banco, atrapalhava os totais e as planilhas, e deixava algumas brechas de segurança.

## O que mudou

### Novo módulo `src/entrada.js`

O módulo junta as máscaras, a limpeza e a validação num lugar só. Para um campo ganhar uma máscara, basta colocar o atributo `data-m` nele e chamar `ligarMascaras(raiz)` depois de montar a tela. A função não liga a mesma máscara duas vezes, então pode ser chamada a cada renderização.

| `data-m` | Enquanto digita | Ao salvar |
|---|---|---|
| `matricula` | Caixa alta, só letras e números, hífen automático depois dos 2 primeiros (`prabc` → `PR-ABC`) | Exige o formato `XX-XXX` (até 5 depois do hífen) |
| `icao` | Caixa alta, até 4 letras ou números | Vazio ou exatamente 4 |
| `modelo` | Caixa alta: letras, números, espaço, `-` e `/` (`as350 b2` → `AS350 B2`) | Até 20 caracteres |
| `canac` | Só dígitos, até 6 | Vazio ou exatamente 6 |
| `duracao` | Só dígitos, dois-pontos automáticos (`130` → `1:30`) | Ao sair do campo vira `HH:MM`; minutos ≥ 60 viram horas; máximo de 24 h |
| `dinheiro` | Só dígitos e uma vírgula, no máximo 2 casas (o ponto vira vírgula) | Máximo de R$ 100.000,00 |
| `nome` | Letras (com acento), espaço, ponto, apóstrofo e hífen | Espaços repetidos removidos |
| `texto` | Sem caracteres de controle/invisíveis nem `< > { }` e crase | Espaços repetidos removidos, corte no `maxlength` |
| `maiusculo` | Caixa alta (usado no METAR) | — |
| `codigo` | Sem espaços nem aspas (código ou link do grupo) | Fica só o código: letras, números, `_` e `-` |

**Campos de data:** o navegador já não aceita letras. Acrescentamos `min`/`max` e a recusa de datas que não existem, como 30/02. No Diário, voo no futuro não é aceito; nos Gastos, o intervalo vai de 2020 a um ano à frente.

O cursor fica no lugar certo quando a máscara reescreve o campo, e teclados que montam acentos (composição/IME) são respeitados.

### Segurança

- **SQL injection:** não se aplica. O projeto não usa SQL; o banco é o Firestore.
- **HTML/JS injetado na tela:** já era tratado com `esc()` em toda exibição. A entrada agora também remove `< > { }` e crase.
- **Fórmula injetada no CSV (corrigido):** uma descrição como `=HYPERLINK(...)` virava fórmula ao abrir a planilha no Excel ou no Sheets. Agora `celulaCsv()` prefixa com apóstrofo toda célula que começa com `= + - @`, exceto números negativos. Vale para o CSV do Diário e o dos Gastos.
- **Links de material (Hangar):** `linkSeguro()` aceita só `https`, ao enviar e ao exibir. Isso bloqueia `javascript:` e `data:`.
- **Valores de listas:** função a bordo, situação na CIV, local, categoria, quem pagou, participantes e exercícios são conferidos contra as opções válidas antes de salvar.
- **Regras do Firestore (`firestore.rules`):** ganharam limites de tamanho e o formato de data `AAAA-MM-DD` no perfil e nos voos do diário, nos gastos (valor ≤ 10.000.000 centavos, descrição ≤ 80, observação ≤ 120, até 60 participantes), no nome do membro (2 a 24) e na lista de pessoas do grupo (até 60).

### Arquivos alterados

- `src/entrada.js` (novo)
- `src/diario/main.js`: máscaras nos dados do piloto e no voo, validação ao salvar, CSV protegido
- `src/gastos/main.js`: máscaras, validação de data e valor, CSV protegido, limpeza do código do grupo
- `src/hangar/main.js`: máscaras em todas as abas, link de material só `https`, METAR em caixa alta
- `src/main.js` e `src/nuvem.js`: apelido do jogo limpo
- `firestore.rules`: travas no servidor

## Atenção

- **As regras do Firestore não sobem com o push.** É preciso colar o `firestore.rules` em Firebase Console › Firestore Database › Regras e publicar. Até lá, só valem as travas do app.
- Dados antigos não foram alterados. A máscara formata o valor antigo quando o formulário é aberto, e ele é gravado no formato novo no próximo salvamento.
- `package-lock.json` tinha uma diferença local antiga (versão 0.2.1 → 0.4.0), sem relação com esta mudança, e ficou fora deste commit.

## Como foi testado

- 29 testes das funções de `entrada.js` (matrícula, ICAO, duração, dinheiro, datas, links, CSV, limpeza de nomes e textos): todos passaram.
- `vite build` compilou sem erro.
- Os formulários ainda não foram testados no navegador: falta digitar de verdade no Diário, nos Gastos e no Hangar, inclusive no celular.
