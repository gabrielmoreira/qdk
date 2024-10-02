declare module 'tree-console' {
  type TreeNode =
    | {
        name: string;
        children: TreeNode[];
      }
    | { nodeName: string; children: TreeNode[] };
  interface TreeOptions {
    label: string;
    children: string;
  }
  function getStringTree(nodes: TreeNode[], options?: TreeOptions): string;
}
