declare module 'tree-console' {
  interface TreeNode {
    name: string;
    children: StringNode[];
  }
  interface TreeOptions {
    label: string;
    children: string;
  }
  function getStringTree(
    nodes: TreeNode[] | any,
    options?: TreeOptions,
  ): string;
}
