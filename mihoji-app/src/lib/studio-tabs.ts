import { BarChart3, CalendarDays, ImageIcon, Inbox, Plug, CircleDollarSign, Clock, Code2, Database, Eye, MoreHorizontal, Settings, Search } from 'lucide-react';

export const studioTabs = [
  { id: 'preview', label: 'Aperçu', icon: Eye },
  { id: 'photos', label: 'Mes photos', icon: ImageIcon },
  { id: 'infos', label: 'Horaires et chiffres', icon: Clock },
  { id: 'requests', label: 'Demandes reçues', icon: Inbox },
  { id: 'bookings', label: 'Rendez-vous', icon: CalendarDays },
  { id: 'connections', label: 'Connexions', icon: Plug },
  { id: 'code', label: 'Code', icon: Code2 },
  { id: 'database', label: 'Base de données', icon: Database },
  { id: 'analytics', label: 'Statistiques', icon: BarChart3 },
  { id: 'seo', label: 'SEO', icon: Search },
  { id: 'payments', label: 'Paiements', icon: CircleDollarSign },
  { id: 'settings', label: 'Réglages', icon: Settings },
  { id: 'more', label: 'Plus', icon: MoreHorizontal },
] as const;

export type StudioTabId = (typeof studioTabs)[number]['id'];
export const simpleStudioTabIds: StudioTabId[] = ['preview', 'photos', 'infos', 'requests', 'bookings', 'connections', 'settings'];
