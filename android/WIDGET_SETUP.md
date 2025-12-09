# Widget Android - Verso do Dia

Este documento explica como configurar e usar o widget Android que exibe o verso do dia na tela inicial.

## Configuração

### 1. Configurar a URL do Convex

Antes de usar o widget, você precisa configurar a URL do seu endpoint Convex no arquivo `strings.xml`:

1. Abra o arquivo: `android/app/src/main/res/values/strings.xml`
2. Localize a linha com `convex_widget_url`
3. Substitua `YOUR_CONVEX_URL` pela URL real do seu Convex:

```xml
<string name="convex_widget_url">https://seu-projeto.convex.site/widget/devotional?language=pt</string>
```

**Exemplo:**
```xml
<string name="convex_widget_url">https://happy-mouse-123.convex.site/widget/devotional?language=pt</string>
```

### 2. Endpoint HTTP

O widget usa o endpoint HTTP criado em `packages/backend/convex/http.ts`:

- **Rota**: `/widget/devotional`
- **Método**: GET
- **Parâmetros**: 
  - `language` (opcional): `pt` ou `en` (padrão: `pt`)

**Exemplo de URL:**
```
https://seu-projeto.convex.site/widget/devotional?language=pt
```

## Como Adicionar o Widget

1. **Compile e instale o app** no dispositivo Android
2. **Na tela inicial**, pressione e segure em uma área vazia
3. **Selecione "Widgets"** no menu que aparece
4. **Procure por "teste-final-bible"** ou "Verso do Dia"
5. **Arraste o widget** para a posição desejada na tela inicial

## Funcionalidades

- **Atualização automática**: O widget atualiza automaticamente a cada hora usando WorkManager
- **Atualização em background**: Usa WorkManager para atualizações confiáveis mesmo quando o app está fechado
- **Atualização manual**: Toque no widget para abrir o app (que também atualiza o widget)
- **Design responsivo**: O widget se adapta a diferentes tamanhos
- **Suporte a idiomas**: Português (pt) e Inglês (en)
- **Cache local**: Os dados são salvos localmente para exibição imediata

## Estrutura dos Arquivos

```
android/
├── app/
│   └── src/
│       └── main/
│           ├── java/com/anonymous/testefinalbible/
│           │   ├── VerseOfDayWidgetProvider.kt  # Provider do widget
│           │   └── DevotionalWorker.kt          # Worker para atualizações em background
│           └── res/
│               ├── layout/
│               │   └── widget_verse_of_day.xml   # Layout do widget
│               ├── drawable/
│               │   └── widget_background.xml    # Background do widget
│               ├── xml/
│               │   └── verse_of_day_widget_info.xml  # Configuração do widget
│               └── values/
│                   └── strings.xml               # Strings (inclui URL do Convex)
└── AndroidManifest.xml                           # Manifest (já configurado)
```

## Personalização

### Alterar o Background

Edite o arquivo `android/app/src/main/res/drawable/widget_background.xml` para alterar as cores do gradiente.

### Alterar o Layout

Edite o arquivo `android/app/src/main/res/layout/widget_verse_of_day.xml` para modificar a aparência do widget.

### Alterar o Idioma

O idioma pode ser alterado na URL do Convex:
- Português: `?language=pt`
- Inglês: `?language=en`

## Troubleshooting

### Widget não aparece na lista

1. Verifique se o app foi compilado e instalado corretamente
2. Verifique se o `AndroidManifest.xml` contém a configuração do widget
3. Limpe e recompile o projeto: `./gradlew clean build`

### Widget mostra "Carregando..." permanentemente

1. Verifique se a URL do Convex está correta no `strings.xml`
2. Verifique se o endpoint HTTP está funcionando (teste no navegador)
3. Verifique a conexão com a internet
4. Verifique os logs do Android: `adb logcat | grep VerseOfDay`

### Widget não atualiza

1. O widget atualiza automaticamente a cada hora usando WorkManager
2. O WorkManager requer conexão com a internet para atualizar
3. Para atualizar manualmente, remova e adicione o widget novamente
4. Ou toque no widget para abrir o app (isso também atualiza o widget)
5. Verifique se o WorkManager está ativo: `adb shell dumpsys jobscheduler | grep devotional`

## Notas Técnicas

- **WorkManager**: O widget usa `WorkManager` para atualizações em background confiáveis
  - Atualiza automaticamente a cada 1 hora (mínimo permitido pelo Android é 15 minutos)
  - Funciona mesmo quando o app está fechado
  - Requer conexão com a internet
  - Usa corrotinas Kotlin para operações assíncronas
- **SharedPreferences**: Os dados são salvos localmente para exibição imediata
- **Dependências**: Requer `androidx.work:work-runtime-ktx:2.9.0` (já adicionado no build.gradle)
- O widget atualiza automaticamente quando o app é aberto
- O tamanho mínimo do widget é 250dp x 110dp
- O WorkManager é iniciado automaticamente quando o primeiro widget é adicionado
- O WorkManager é cancelado quando o último widget é removido

