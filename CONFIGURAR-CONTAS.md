# Contas, progresso na nuvem e ranking (Firebase)

O jogo funciona sem isto: sem configuração, o progresso fica só no aparelho. Para ligar as contas:

1. Abra https://console.firebase.google.com com a conta juanhanzi@gmail.com e crie um projeto (ex.: `simulador-heli`). O Google Analytics pode ficar desligado. O plano gratuito (Spark) basta e não pede cartão.
2. **Authentication** › Começar › Método de login **Google** › Ativar › escolha o e-mail de suporte › Salvar.
3. **Authentication** › Configurações › **Domínios autorizados** › Adicionar domínio: `juanian7.github.io`.
4. **Firestore Database** › Criar banco de dados › local **southamerica-east1 (São Paulo)** › modo de produção. Depois, aba **Regras**: apague o que estiver lá, cole o conteúdo de `firestore.rules` e clique em Publicar.
5. Engrenagem › **Configurações do projeto** › Seus apps › ícone **Web `</>`** › apelido `site` (sem Firebase Hosting) › Registrar. Copie o bloco `firebaseConfig = { apiKey: ..., authDomain: ..., projectId: ..., ... }` e mande para o Claude, que o coloca em `src/firebase-config.js`.

Os valores do `firebaseConfig` não são senha: identificam o projeto. Quem protege os dados são as regras do passo 4.

## Como funciona
- Login com Google (só no app pelo navegador; o APK continua salvando só no aparelho).
- No primeiro login a pessoa escolhe um apelido; o e-mail só aparece para o desenvolvedor.
- Progresso por conta: melhores estrelas de cada fase, estrelas e melhor tempo de cada rota, provas e número de jogadas. Se a pessoa já jogava no aparelho sem conta, esse progresso soma com o da conta.
- Ranking: geral (soma de estrelas), mais ativos (jogadas), por fase e por rota (estrelas e tempo).
- Desenvolvedor (e-mails em `ADMINS` e nas regras): menu › 🛠 Jogadores, com e-mail, último acesso, estrelas por fase, **Zerar progresso** e **Apagar**.
- Para acrescentar outro desenvolvedor: incluir o e-mail em `src/firebase-config.js` (ADMINS) e em `firestore.rules` (função admin), e republicar as regras.
