# SYSTEM: Ascension V2

App Android em React Native + Expo para transformar treino, alimentação e progresso em uma rotina gamificada estilo RPG.

## O que já existe nesta V2

- Tela de despertar / criação de Player
- Level, XP, ranks E → S e atributos
- Moedas e loja de recompensas pessoais
- Missões principais e side quests aleatórias
- Animação de QUEST COMPLETE e tela de LEVEL UP
- Boss semanal com recompensa
- Conquistas automáticas
- Sequência diária (streak)
- Calendário de consistência
- Treino Upper/Lower 4x por semana
- Registro de carga e repetições por exercício
- Alimentação com checks diários
- Jornada de peso e checkpoints
- Gráfico do histórico de peso
- Notificações locais opcionais
- Persistência offline com SQLite
- Reset local dos dados

As penalidades do app são apenas virtuais. O app não usa jejum forçado, corte de refeições, desidratação ou exercício excessivo como punição.

## Requisitos no computador

- Windows, macOS ou Linux
- Node.js 22.13 ou mais recente para Expo SDK 57
- Conta gratuita em https://expo.dev/
- Internet para instalar dependências e gerar o build na nuvem

## 1. Instalar as dependências

Abra o terminal dentro desta pasta e rode:

```powershell
npm install
npx expo install --fix
```

Depois confira o projeto:

```powershell
npx expo-doctor
```

## 2. Testar antes de gerar o APK

Instale o Expo Go no Android e rode:

```powershell
npx expo start
```

O terminal mostrará um QR Code. Abra o Expo Go e escaneie.

Observação: as notificações locais básicas podem ser testadas no Expo Go. Para testar exatamente o app nativo que será instalado, gere o APK abaixo.

## 3. Instalar o EAS CLI

```powershell
npm install --global eas-cli
```

Faça login:

```powershell
eas login
```

Se ainda não tiver conta, crie uma em https://expo.dev/ e depois volte ao comando.

## 4. Vincular o projeto à sua conta Expo

Na pasta do projeto:

```powershell
eas init
```

Escolha criar um novo projeto quando o terminal perguntar.

O arquivo `eas.json` deste projeto já possui um perfil chamado `preview` configurado para gerar `.apk`.

## 5. Gerar o APK instalável

Rode:

```powershell
eas build -p android --profile preview
```

Na primeira compilação, o EAS pode perguntar sobre as credenciais/keystore do Android. Para um projeto novo, escolha a opção para o EAS gerar uma nova keystore.

Quando o build terminar, o terminal e o painel da Expo mostrarão um link/QR Code. Abra esse link no celular, baixe o `.apk` e instale.

Também existe um atalho no package.json:

```powershell
npm run build:apk
```

## 6. Se o Android bloquear a instalação

Ao abrir o APK, o Android pode pedir permissão para instalar apps daquela fonte (Chrome, navegador ou gerenciador de arquivos). Autorize apenas para a fonte que você está usando e prossiga com a instalação.

## 7. Build para Google Play

O APK é ótimo para instalar diretamente no aparelho. Para a Play Store, gere um Android App Bundle (`.aab`):

```powershell
eas build -p android --profile production
```

ou:

```powershell
npm run build:play
```

## Arquivos principais

- `App.js` — interface, regras de XP, telas, missões, Boss, loja, calendário e notificações
- `src/data.js` — treinos, alimentação, missões, conquistas, cores e recompensas padrão
- `src/storage.js` — banco SQLite e migração do estado da V1
- `src/utils.js` — datas, rank, XP, calendário e semana
- `app.json` — configuração Android/Expo
- `eas.json` — perfis de build APK/AAB
- `package.json` — dependências e comandos

## Personalização rápida

Treinos: edite `workoutPlan` em `src/data.js`.

Proteína principal de cada dia: edite `proteins` em `src/data.js`.

Side quests: edite `randomMissions` em `src/data.js`.

Conquistas: edite `achievements` em `src/data.js` e as condições em `App.js`.

Recompensas iniciais: edite `defaultRewards` em `src/data.js`. Você também pode criar recompensas dentro do próprio app.

Horários das notificações: procure por `scheduleNotificationAsync` em `App.js`.

## Comandos úteis

```powershell
npm run start
npm run doctor
npm run build:apk
npm run build:play
```

## Documentação oficial

- Expo: https://docs.expo.dev/
- EAS Build: https://docs.expo.dev/build/introduction/
- APK Android: https://docs.expo.dev/build-reference/apk/
- SQLite: https://docs.expo.dev/versions/latest/sdk/sqlite/
- Notifications: https://docs.expo.dev/versions/latest/sdk/notifications/
