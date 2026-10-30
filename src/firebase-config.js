// Configuração do projeto Firebase (console.firebase.google.com › Configurações do projeto › Seus apps › Web).
// Estes valores identificam o projeto e podem ficar no código: quem protege os dados são as regras em firestore.rules.
// Enquanto for null, o jogo funciona como antes (progresso só no aparelho) e o botão de conta mostra "não configurado".
export const FIREBASE_CONFIG = null;

// E-mails com acesso de desenvolvedor (ver o progresso de todos e zerar contas). Tem que bater com firestore.rules.
export const ADMINS = ['juanhanzi@gmail.com'];
