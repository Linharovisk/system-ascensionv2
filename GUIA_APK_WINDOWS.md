# Guia rápido — transformar o SYSTEM: Ascension em APK no Windows

## A. Instale o Node.js

Use Node.js 22.13 ou superior.

Depois abra o PowerShell e confira:

```powershell
node -v
npm -v
```

## B. Extraia o projeto

Extraia o ZIP para uma pasta simples, por exemplo:

```text
C:\system-ascension
```

Abra essa pasta no Explorador de Arquivos, clique na barra de endereço, digite `powershell` e pressione Enter.

## C. Prepare o projeto

```powershell
npm install
npx expo install --fix
npx expo-doctor
```

O `expo install --fix` ajuda a alinhar bibliotecas nativas às versões recomendadas pelo Expo SDK instalado.

## D. Teste no celular

```powershell
npx expo start
```

Instale `Expo Go` no Android e leia o QR Code.

Se o celular e o PC estiverem em redes diferentes e o QR não funcionar, tente:

```powershell
npx expo start --tunnel
```

## E. Crie uma conta Expo

Acesse https://expo.dev/ e crie uma conta gratuita.

Depois:

```powershell
npm install --global eas-cli
eas login
```

## F. Vincule o projeto

```powershell
eas init
```

Confirme a criação de um novo projeto EAS para `system-ascension`.

## G. Gere o APK

```powershell
eas build -p android --profile preview
```

Se aparecer uma pergunta sobre Android Keystore e você nunca publicou este aplicativo antes, deixe o EAS gerar uma nova credencial.

No fim do build, abra o link fornecido pela Expo no celular e instale o APK.

## H. Próximas versões

Sempre que você modificar apenas o código e quiser uma nova versão instalável, aumente `version` e `android.versionCode` em `app.json` e gere outro build.

Exemplo:

```json
"version": "2.1.0",
"android": {
  "versionCode": 3
}
```

Depois:

```powershell
eas build -p android --profile preview
```

## I. Publicar na Play Store

Para publicar, o formato indicado é AAB:

```powershell
eas build -p android --profile production
```

O perfil `production` do projeto já está configurado como `app-bundle`.
