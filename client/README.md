# FeedWise – Client (React)

React 19 + Vite + TypeScript + Tailwind CSS frontend for FeedWise. See the main [README](../README.md) and [SETUP_GUIDE](../SETUP_GUIDE.md).

```bash
cp .env.example .env     # VITE_API_URL=http://localhost:5000/api
npm install
npm run dev              # http://localhost:5173
npm run build            # type-check + production build
```

Key files: `src/api/client.ts` (the single axios instance), `src/hooks/useApi.ts` (custom data-loading hook), `src/schemas/` (Zod schemas + `z.infer` types), `src/pages/` (14 pages), `src/components/ui/` (shared components), `src/index.css` (Tailwind `@theme` palette).
