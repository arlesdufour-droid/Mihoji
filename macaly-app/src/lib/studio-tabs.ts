import { BarChart3, CircleDollarSign, Code2, Database, Eye, MoreHorizontal, Settings, Search } from 'lucide-react';

export const studioTabs = [
  { id: 'preview', label: 'Preview', icon: Eye },
  { id: 'code', label: 'Code', icon: Code2 },
  { id: 'database', label: 'Database', icon: Database },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'seo', label: 'SEO', icon: Search },
  { id: 'payments', label: 'Payments', icon: CircleDollarSign },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'more', label: 'More', icon: MoreHorizontal },
] as const;

export type StudioTabId = (typeof studioTabs)[number]['id'];
