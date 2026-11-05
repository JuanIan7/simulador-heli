// Configuração do projeto Firebase (console.firebase.google.com › Configurações do projeto › Seus apps › Web).
// Estes valores identificam o projeto e podem ficar no código: quem protege os dados são as regras em firestore.rules.
// Com null, o jogo funciona sem contas (progresso só no aparelho) e o botão de entrar não aparece.
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAtAk46_NGyYk_3OD8PbhPfu9l9NieL_sY',
  authDomain: 'simulador-heli.firebaseapp.com',
  projectId: 'simulador-heli',
  storageBucket: 'simulador-heli.firebasestorage.app',
  messagingSenderId: '28951497338',
  appId: '1:28951497338:web:15cfb3c9db731ac47249c3',
};

// E-mails com acesso de desenvolvedor (ver o progresso de todos e zerar contas). Tem que bater com firestore.rules.
export const ADMINS = ['juanhanzi@gmail.com'];
