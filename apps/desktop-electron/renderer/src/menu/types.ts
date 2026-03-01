export type Workspace = {
  id: string;
  name: string;
  label: string;
  description: string;
  color: string;
  type: string;
  status: string;
  isActive: boolean;
  documentCount: number;
  bitmapCount: number;
  owner?: string;
  ownerEmail?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Context = {
  id: string;
  name?: string;
  label?: string;
  url?: string;
  color?: string;
  pathArray?: string[];
};

export type TreeNode = {
  id: string;
  type: string;
  name: string;
  label: string;
  description: string;
  color: string | null;
  children: TreeNode[];
};

export type MenuView = 'workspaces' | 'contexts' | 'tree';
export type ContextMode = 'explorer' | 'bound';
