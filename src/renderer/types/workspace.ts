// Ported from server web UI types (kept minimal).
export interface TreeNode {
  id: string
  type: string
  name: string
  label: string
  description: string
  color: string | null
  children: TreeNode[]
}


