# Stack

## Languages
- **TypeScript** 7.0.2 - Primary language for frontend and backend
- **JavaScript/TSX** - React components

## Runtime
- **Node.js** (with tsx) - Development and production server
- **TypeScript compiler** used for type checking (`npm run lint`)

## Frontend
- **React** 19.0.1 - UI framework
- **Vite** 8.3.0 - Build tool and dev server
- **@vitejs/plugin-react** 6.1.1 - React plugin for Vite
- **Tailwind CSS** 4.3.3 - Styling framework
- **@tailwindcss/vite** 4.3.3 - Tailwind Vite plugin
- **PostCSS/Autoprefixer** 10.4.21 - CSS processing
- **Motion** 12.23.24 - Animations
- **Lucide React** 0.546.0 - Icon library
- **Leaflet** 1.9.4 - Maps/cartography
- **@types/leaflet** 1.9.22

## Backend
- **Express** 4.21.2 - HTTP server framework
- **Node.js built-in modules** - fs, path, etc.

## AI/External Services
- **@google/genai** ^2.4.0 - Google Gemini AI integration (for AI Studio features)

## Development Tools
- **tsx** 4.21.0 - TypeScript execution
- **esbuild** 0.28.0 - Bundling
- **TypeScript** 7.0.2 - Type checking
- **@types/node**, **@types/express**, **@types/react**, **@types/react-dom**

## Build & Scripts
- `dev`: `tsx server.ts` - Runs Express server with Vite middleware
- `build`: `vite build` - Builds frontend
- `start`: `tsx server.ts` - Production start
- `lint`: `tsc --noEmit` - Type checking
- `test`: `node --test`

## Configuration Files
- `tsconfig.json` - TypeScript configuration
- `vite.config.ts` - Vite configuration
- `package.json` - Dependencies and scripts
- `.env.example` - Environment variables template
- `index.html` - Entry point

## Module System
- **ES Modules** (`"type": "module"`) throughout
- Uses `.ts` extensions in imports
