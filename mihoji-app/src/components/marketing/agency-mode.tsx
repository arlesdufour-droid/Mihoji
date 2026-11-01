'use client';

import { useEffect } from 'react';

// L'espace agence utilise par défaut l'affichage expert, sans écraser un choix déjà fait (préférence d'affichage uniquement).
export function AgencyMode() {
  useEffect(() => {
    if (!window.localStorage.getItem('mihoji-ui-mode')) window.localStorage.setItem('mihoji-ui-mode', 'expert');
  }, []);
  return null;
}
