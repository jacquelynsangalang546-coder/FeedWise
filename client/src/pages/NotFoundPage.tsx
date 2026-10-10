import { MapPinOff } from 'lucide-react';
import { ButtonLink } from '../components/ui/Button';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

interface NotFoundPageProps {
  embedded?: boolean; // shown inside the app shell (e.g. a missing product)
  title?: string;
  message?: string;
}

export default function NotFoundPage({ embedded = false, title = 'Page not found', message }: NotFoundPageProps) {
  useDocumentTitle(title);
  const content = (
    <div className="flex flex-col items-center px-4 py-16 text-center">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-grain-100 text-grain-700">
        <MapPinOff className="size-8" aria-hidden />
      </span>
      <h1 className="mt-5 text-3xl font-bold text-pasture-900">{title}</h1>
      <p className="mt-2 max-w-md text-ink-500">
        {message ?? 'The page you opened does not exist or was moved. Check the address or go back to the dashboard.'}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <ButtonLink to="/dashboard">Go to dashboard</ButtonLink>
        <ButtonLink to="/" variant="secondary">
          Home
        </ButtonLink>
      </div>
    </div>
  );
  if (embedded) return content;
  return <div className="flex min-h-dvh items-center justify-center bg-canvas">{content}</div>;
}
