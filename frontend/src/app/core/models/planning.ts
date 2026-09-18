export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  goal?: string;
  startDate: string;
  endDate: string;
  status: number;
  completedAt?: string;
  taskCount: number;
  doneCount: number;
  totalPoints: number;
  donePoints: number;
}
export interface SprintRequest {
  name: string;
  goal?: string;
  startDate: string;
  endDate: string;
}
export const STATUS_NAMES = ['Yapılacak', 'Devam ediyor', 'Tamamlandı'];
export const PRIORITY_NAMES = ['Düşük', 'Orta', 'Yüksek'];
export const TYPE_NAMES = ['Görev', 'Hata'];
