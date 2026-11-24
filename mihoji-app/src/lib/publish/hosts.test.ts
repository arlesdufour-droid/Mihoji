import { describe, expect, it } from 'vitest';
import { isSharedAssetPath, resolveHost, siteKeyOf, type HostConfig } from './hosts';

const config: HostConfig = { publishedDomain: 'sites.mihoji.fr', appHosts: ['localhost', '127.0.0.1', 'app.mihoji.fr'] };

describe('résolution du nom d’hôte', () => {
  it('l’hôte principal de l’application garde son comportement', () => {
    for (const host of ['app.mihoji.fr', 'APP.mihoji.fr:443', 'localhost:3000', '127.0.0.1:3100', 'mihoji-xyz.vercel.app', 'x-3000.app.github.dev', 'sites.mihoji.fr', '', null]) {
      expect(resolveHost(host, config), String(host)).toEqual({ kind: 'app' });
    }
  });

  it('<sous-domaine>.<domaine des sites> mène au site publié', () => {
    expect(resolveHost('boulangerie-lemoine.sites.mihoji.fr', config)).toEqual({ kind: 'subdomain', slug: 'boulangerie-lemoine' });
    expect(resolveHost('Boulangerie-Lemoine.sites.mihoji.fr:443', config)).toEqual({ kind: 'subdomain', slug: 'boulangerie-lemoine' });
    expect(resolveHost('a.b.sites.mihoji.fr', config)).toEqual({ kind: 'invalid' });
  });

  it('un autre nom d’hôte est un domaine personnalisé candidat', () => {
    expect(resolveHost('www.boulangerie-lemoine.fr', config)).toEqual({ kind: 'custom', hostname: 'www.boulangerie-lemoine.fr' });
    expect(resolveHost('boulangerie-lemoine.fr.', config)).toEqual({ kind: 'custom', hostname: 'boulangerie-lemoine.fr' });
    expect(resolveHost('monsite', config)).toEqual({ kind: 'invalid' });
    expect(resolveHost('évil.example', config)).toEqual({ kind: 'invalid' });
  });

  it('sans domaine des sites configuré, seuls les domaines personnalisés sont routés', () => {
    expect(resolveHost('x.sites.mihoji.fr', { ...config, publishedDomain: null })).toEqual({ kind: 'custom', hostname: 'x.sites.mihoji.fr' });
  });

  it('clé interne du site', () => {
    expect(siteKeyOf({ kind: 'subdomain', slug: 'dubois' })).toBe('dubois');
    expect(siteKeyOf({ kind: 'custom', hostname: 'www.dubois.fr' })).toBe('www.dubois.fr');
    expect(siteKeyOf({ kind: 'app' })).toBeNull();
  });

  it('un site publié ne peut demander à l’application que ses formulaires, photos et polices', () => {
    const id = '11111111-1111-4111-8111-111111111111';
    expect(isSharedAssetPath('/api/public/leads', 'POST')).toBe(true);
    expect(isSharedAssetPath('/fonts/x.woff2', 'GET')).toBe(true);
    expect(isSharedAssetPath(`/api/hosted-photos/${id}`, 'GET')).toBe(true);
    expect(isSharedAssetPath(`/api/hosted-photos/${id}`, 'DELETE')).toBe(false);
    expect(isSharedAssetPath('/api/projects', 'GET')).toBe(false);
    expect(isSharedAssetPath('/studio/x', 'GET')).toBe(false);
  });
});
