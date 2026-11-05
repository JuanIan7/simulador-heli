// Configuração do projeto Firebase (console.firebase.google.com › Configurações do projeto › Seus apps › Web).
// Estes valores identificam o projeto e podem ficar no código: quem protege os dados são as regras em firestore.rules.
// Com null, o jogo funciona sem contas (progresso só no aparelho) e o botão de entrar não aparece.
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAtAk46_NGyYk_3OD8PbhPfu9l9NieL_sY',
  // no GitHub Pages o login passa pelo próprio site (juanian7.github.io/__/auth/, repo juanian7.github.io): no Safari e no Chrome do iPhone
  // o login por simulador-heli.firebaseapp.com perde o estado e dá "missing initial state"
  authDomain: globalThis.location?.hostname === 'juanian7.github.io' ? 'juanian7.github.io' : 'simulador-heli.firebaseapp.com',
  projectId: 'simulador-heli',
  storageBucket: 'simulador-heli.firebasestorage.app',
  messagingSenderId: '28951497338',
  appId: '1:28951497338:web:15cfb3c9db731ac47249c3',
};

// E-mails com acesso de desenvolvedor (ver o progresso de todos e zerar contas). Tem que bater com firestore.rules.
export const ADMINS = ['juanhanzi@gmail.com'];
