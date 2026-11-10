/** Chemin d'une page du site, préfixé par la base (le site est publié sous /reperes-cump/). */
export function chemin(page = '', ancre?: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const morceau = page.replace(/^\/|\/$/g, '');
  return `${base}/${morceau ? `${morceau}/` : ''}${ancre ? `#${ancre}` : ''}`;
}
