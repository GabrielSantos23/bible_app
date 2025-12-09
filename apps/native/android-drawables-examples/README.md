# Exemplos de Drawables XML para Android

Esta pasta contém exemplos de drawables XML que você pode usar no seu projeto.

## Como usar

1. **Após fazer o prebuild do Expo:**
   ```bash
   npx expo prebuild
   ```

2. **Copie os arquivos XML para a pasta correta:**
   ```bash
   cp android-drawables-examples/*.xml android/app/src/main/res/drawable/
   ```

3. **Use no código:**
   ```tsx
   <Icon sf="house.fill" drawable="ic_home" />
   ```

## Notas

- As cores estão definidas como `#FFFFFFFF` (branco). Você pode alterar para a cor desejada.
- Os ícones têm tamanho de 24dp, que é o padrão do Material Design.
- Se precisar de ícones diferentes, use as ferramentas mencionadas no guia `CONVERTER_SVG_PARA_XML.md`.



