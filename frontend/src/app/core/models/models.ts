export enum ProjectRole {
  Member = 0,
  Admin = 1
}

export enum TaskStatus {
  Todo = 0,
  InProgress = 1,
  Done = 2
}

export enum TaskPriority {
  Low = 0,
  Medium = 1,
  High = 2
}

export interface UserInfo {
  id: string;
  email: string;
  displayName: string;
}

export interface AuthResponse {
  token: string;
  expiresAt: string;
  user: UserInfo;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: string;
  myRole: ProjectRole;
}

export interface ProjectMember {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  role: ProjectRole;
  joinedAt: string;
}

export interface TaskItem {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  order: number;
  assigneeId?: string | null;
  createdById: string;
  createdAt: string;
  updatedAt?: string;
  labelIds: string[];
  sprintId?: string | null;
  issueType: number;
  storyPoints?: number | null;
  dueDate?: string | null;
}

export interface Comment {
  id: string;
  taskItemId: string;
  authorId: string;
  authorDisplayName: string;
  content: string;
  createdAt: string;
}

export interface Label {
  id: string;
  projectId: string;
  name: string;
  colorHex: string;
}

export interface Attachment {
  id: string;
  taskItemId: string;
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  uploadedById: string;
  uploadedAt: string;
  downloadUrl: string;
}

export interface TaskFilter {
  search?: string;
  status?: TaskStatus;
  assigneeId?: string | null;
  labelId?: string;
}
