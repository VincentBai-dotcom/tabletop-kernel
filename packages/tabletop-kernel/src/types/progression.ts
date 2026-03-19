export interface ProgressionSegmentState {
  id: string;
  kind: string;
  name: string;
  parentId?: string;
  active: boolean;
  ownerId?: string;
}

export interface ProgressionState {
  current: string | null;
  segments: Record<string, ProgressionSegmentState>;
}
