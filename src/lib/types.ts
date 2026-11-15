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
  assigneeId: string | null;
  starred: boolean;
  done: boolean;
  completedAt: string | null; // ISO
  createdById: string | null;
  createdAt: number;
};
