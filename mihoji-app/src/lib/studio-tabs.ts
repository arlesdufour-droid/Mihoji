import { BarChart3, CircleDollarSign, Code2, Database, Eye, MoreHorizontal, Settings, Search } from 'lucide-react';

export const studioTabs = [
  { id: 'preview', label: 'Aperçu', icon: Eye },
  { id: 'code', label: 'Code', icon: Code2 },
  { id: 'database', label: 'Base de données', icon: Database },
  { id: 'analytics', label: 'Statistiques', icon: BarChart3 },
  { id: 'seo', label: 'SEO', icon: Search },
  { id: 'payments', label: 'Paiements', icon: CircleDollarSign },
  { id: 'settings', label: 'Réglages', icon: Settings },
  { id: 'more', label: 'Plus', icon: MoreHorizontal },
] as const;

export type StudioTabId = (typeof studioTabs)[number]['id'];
export const simpleStudioTabIds: StudioTabId[] = ['preview', 'settings'];
