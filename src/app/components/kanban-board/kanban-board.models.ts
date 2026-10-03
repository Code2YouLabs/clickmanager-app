export interface KanbanColumnState<T = unknown> {
  id: string;
  title: string;
  count?: number;
  items: T[];
  loading?: boolean;
  error?: string | null;
  emptyText?: string;
  hasMore?: boolean;
  loadingMore?: boolean;
  tone?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'neutral';
}

export type KanbanDropState = 'neutral' | 'source' | 'allowed' | 'blocked' | 'loading';

export interface KanbanDragEvent<T = unknown> {
  item: T;
  column: KanbanColumnState<T>;
  index: number;
}

export interface KanbanDropEvent<T = unknown> {
  item: T;
  sourceColumn: KanbanColumnState<T>;
  targetColumn: KanbanColumnState<T>;
  previousIndex: number;
  currentIndex: number;
}
