/**
 * Mini logger préfixé.
 *
 * Pour activer/désactiver, jouer sur le niveau de log du devtools.
 *
 * En dev (`import.meta.env.DEV`), chaque log est aussi envoyé via fetch
 * vers `/__log` — un middleware Vite (cf. `vite.config.ts` → `logBridge`)
 * print l'event dans le stdout du serveur. Ça permet de voir les logs
 * browser en temps réel depuis n'importe quel outil qui tail le stdout.
 */

const PREFIX = '[nihongo]';

type Level = 'debug' | 'info' | 'warn' | 'error';

function tag(area: string): string {
  return `${PREFIX}[${area}]`;
}

function ship(level: Level, area: string, args: unknown[]): void {
  if (!import.meta.env.DEV) return;
  // Sérialisation défensive — JSON.stringify des Date passe en ISO, c'est
  // OK ; pour les erreurs on capture name+message+stack.
  const safeArgs = args.map((a) => {
    if (a instanceof Error) {
      return { name: a.name, message: a.message, stack: a.stack };
    }
    return a;
  });
  try {
    void fetch('/__log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level, area, args: safeArgs }),
      // Pas d'await — fire-and-forget. Si le pont est down, on n'embête pas.
    }).catch(() => undefined);
  } catch {
    /* JSON.stringify peut throw sur des cycles — on swallow */
  }
}

export const log = {
  debug(area: string, ...args: unknown[]): void {
    console.debug(tag(area), ...args);
    ship('debug', area, args);
  },
  info(area: string, ...args: unknown[]): void {
    console.info(tag(area), ...args);
    ship('info', area, args);
  },
  warn(area: string, ...args: unknown[]): void {
    console.warn(tag(area), ...args);
    ship('warn', area, args);
  },
  error(area: string, ...args: unknown[]): void {
    console.error(tag(area), ...args);
    ship('error', area, args);
  },
};
