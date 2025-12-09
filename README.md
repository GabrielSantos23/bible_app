# teste-final-bible

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines Convex, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **React Native** - Build mobile apps using React
- **Expo** - Tools for React Native development
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **shadcn/ui** - Reusable UI components
- **Convex** - Reactive backend-as-a-service platform
- **Authentication** - Better-Auth
- **Turborepo** - Optimized monorepo build system

## Getting Started

First, install the dependencies:

```bash
bun install
```

## Convex Setup

This project uses Convex as a backend. You'll need to set up Convex before running the app:

```bash
bun run dev:setup
```

Follow the prompts to create a new Convex project and connect it to your application.

### Configurar Variáveis de Ambiente do Better Auth

Após configurar o Convex, você precisa definir as seguintes variáveis de ambiente no dashboard do Convex:

1. Acesse o [Dashboard do Convex](https://dashboard.convex.dev)
2. Selecione seu projeto
3. Vá em **Settings** → **Environment Variables**
4. Adicione as seguintes variáveis:

   - **`BETTER_AUTH_SECRET`**: Uma string secreta aleatória para criptografia (recomendado: use um gerador de secrets, como `openssl rand -base64 32`)
   - **`CONVEX_SITE_URL`**: A URL do seu site Convex (geralmente algo como `https://your-project.convex.site`)

   Você também pode configurar via CLI do Convex:

   ```bash
   npx convex env set BETTER_AUTH_SECRET "seu-secret-aqui"
   npx convex env set CONVEX_SITE_URL "https://seu-projeto.convex.site"
   ```

   **Nota**: O `CONVEX_SITE_URL` geralmente é configurado automaticamente pelo Convex. Verifique no dashboard se já existe.

5. (Opcional) Para desenvolvimento local, você também pode configurar:
   - **`NATIVE_APP_URL`**: URL do seu app nativo (padrão: `mybettertapp://`)
   - **`EXPO_URL`**: URL do Expo (padrão: `exp://192.168.15.2:8081`)

Then, run the development server:

```bash
bun run dev
```

Use the Expo Go app to run the mobile application.
Your app will connect to the Convex cloud backend automatically.







## Project Structure

```
teste-final-bible/
├── apps/
│   ├── native/      # Mobile application (React Native, Expo)
├── packages/
│   ├── backend/     # Convex backend functions and schema
```

## Available Scripts

- `bun run dev`: Start all applications in development mode
- `bun run build`: Build all applications
- `bun run dev:web`: Start only the web application
- `bun run dev:setup`: Setup and configure your Convex project
- `bun run check-types`: Check TypeScript types across all apps
- `bun run dev:native`: Start the React Native/Expo development server
