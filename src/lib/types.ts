export type AppUser = {
  id: string; // Firebase Auth の uid
  name: string | null;
  email: string;
  image: string | null;
};

export type List = {
  id: string;
  name: string;
  sortOrder: number;
};

export type Task = {
  id: string;
  listId: string;
  parentId: string | null; // あればサブタスク
  title: string;
  notes: string;
  dueDate: string | null; // YYYY-MM-DD（日本時間）
  assigneeId: string | null;
  starred: boolean;
  done: boolean;
  completedAt: string | null; // ISO
  createdById: string | null;
  createdAt: number;
};
