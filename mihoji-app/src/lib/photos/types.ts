// Fournisseur d'images derrière une interface : Unsplash (réel) ou bibliothèque locale (repli).

export type PhotoCandidate = {
  /** Adresse de l'image brute (sans paramètres de taille) ; les variantes sont calculées au rendu. */
  src: string;
  alt: string;
  credit: { name: string; url: string };
  /** Texte descriptif utilisé pour juger la pertinence (description, tags). */
  description: string;
  tags: string[];
  /** Adresse d'événement de téléchargement Unsplash, à appeler quand la photo est réellement utilisée. */
  downloadLocation?: string;
  /** Pixabay : petite version (640 px) pour le contrôle visuel, et identifiant d'origine pour l'hébergement. */
  previewUrl?: string;
  sourceId?: string;
};

export type PhotoSearchResult = { candidates: PhotoCandidate[]; remaining?: number };

export interface PhotoProvider {
  readonly name: 'unsplash' | 'pixabay' | 'local';
  search(query: string, signal?: AbortSignal): Promise<PhotoSearchResult>;
}
