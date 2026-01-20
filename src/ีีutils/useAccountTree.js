import { useMemo, useState } from "react";

export function useAccountTree(list = [], search = "") {
  const [expanded, setExpanded] = useState({});

  // Build tree
  const tree = useMemo(() => {
    const map = {};
    list.forEach((r) => {
      map[r.code] = { ...r, children: [] };
    });

    const roots = [];
    list.forEach((r) => {
      const node = map[r.code];
      const pcode = r.parentCode || null;
      if (pcode && map[pcode]) {
        map[pcode].children.push(node);
      } else {
        roots.push(node);
      }
    });

    const sortTree = (nodes) => {
      nodes.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
      nodes.forEach((n) => n.children && sortTree(n.children));
    };

    sortTree(roots);
    return roots;
  }, [list]);

  // Filter tree by search
  const filteredTree = useMemo(() => {
    if (!search) return tree;

    const q = search.toLowerCase();
    const filterNode = (node) => {
      const match =
        node.code?.toLowerCase().includes(q) ||
        node.name?.toLowerCase().includes(q);

      const children = (node.children || [])
        .map(filterNode)
        .filter(Boolean);

      return match || children.length
        ? { ...node, children }
        : null;
    };

    return tree.map(filterNode).filter(Boolean);
  }, [tree, search]);

  const toggle = (code) => {
    setExpanded((p) => ({ ...p, [code]: !p[code] }));
  };

  return {
    tree: filteredTree,
    expanded,
    toggle,
  };
}
