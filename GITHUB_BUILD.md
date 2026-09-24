# Gerar o APK pelo GitHub Actions

O projeto já inclui `.github/workflows/build-apk.yml`.

## Como usar
1. Crie um repositório vazio no GitHub, por exemplo `system-ascension`.
2. Coloque os arquivos deste projeto na raiz do repositório.
3. Ao enviar para a branch `main`, o workflow **Build Android APK** inicia automaticamente.
4. No GitHub, abra **Actions** > **Build Android APK** > execução mais recente.
5. Em **Artifacts**, baixe `system-ascension-apk`.
6. Extraia o ZIP baixado. Dentro dele estará `system-ascension.apk`.
7. Envie o APK para o celular Android e instale.

O APK gerado é de debug, assinado automaticamente para instalação direta e testes pessoais. Para publicar na Play Store, gere uma versão de produção assinada/AAB.
