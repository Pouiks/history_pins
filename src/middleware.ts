import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Domaine canonique unique. Tout le reste (ancienne URL Vercel, www) est redirigé
// en 308 vers ce domaine → évite le contenu dupliqué et fixe une seule URL pour le SEO.
const CANONICAL_HOST = 'histofrance.fr';
const REDIRECT_HOSTS = new Set([
  'history-pins.vercel.app',
  'www.histofrance.fr',
]);

export function middleware(req: NextRequest) {
  const host = (req.headers.get('host') || '').toLowerCase();
  if (REDIRECT_HOSTS.has(host)) {
    const url = req.nextUrl.clone();
    url.host = CANONICAL_HOST;
    url.protocol = 'https:';
    url.port = '';
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}

export const config = {
  // S'applique à toutes les routes sauf les assets internes Next.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
