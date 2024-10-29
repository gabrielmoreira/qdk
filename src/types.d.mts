declare module 'tree-console' {
  export type TreeNode =
    | {
        name: string;
        children: TreeNode[];
      }
    | { nodeName: string; children: TreeNode[] };
  export interface TreeOptions {
    label: string;
    children: string;
  }
  export function getStringTree(
    nodes: TreeNode[],
    options?: TreeOptions,
  ): string;
}
