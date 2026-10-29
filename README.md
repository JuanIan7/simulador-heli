# Simulador de Helicóptero para Estudo (PPH / IFR)

Jogo de estudo para o curso de Piloto Privado de Helicóptero: R22, R44, R66 e os Esquilos AS350 B2 e H125 do CBMERJ.
21 fases da trilha PPH (torque, efeito solo, ETL, autorrotação, H-V, estóis, fonia, METAR, altímetro, navegação, SIPAER, prova).
**Não é um simulador certificado.** Os números vêm dos POH/TCDS públicos; o que vale é o manual da aeronave e o instrutor.

## Como jogar
- **iPhone / Android (PWA):** abra o link do GitHub Pages no Safari ou Chrome e use "Adicionar à Tela de Início". Funciona sem internet depois da primeira abertura.
- **Android (APK):** baixe `simulador-heli.apk` na página de Releases (link `latest`).
- **Mac:** `npm install && npm run dev`. Teclas: W/S coletivo, setas cíclico, A/D pedais, C câmera.

## Estrutura
- `src/data/` aeronaves (parâmetros com fonte), fases, bancos de questões, cartões de fonia.
- `src/sim/` modelo de voo (`fisica.js`), cena 3D (`cena.js`), controles e missões.
- `src/ui/` instrumentos, quiz, fonia, METAR, SIPAER, identificação de peças.
- `android/` projeto Capacitor; o APK é gerado pelo GitHub Actions.

Desenvolvido por Juan Araujo & Filho.
