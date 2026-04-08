import { useMemo, useState, useEffect } from "react";
import { blockedCodes } from "../accounting/Journal/Chart";





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

    return roots;
  }, [list]);

  // Filter tree: ให้ลูกที่ไม่ blocked ขึ้น แม้ parent blocked
const filteredTree = useMemo(() => {
  const filterNode = (node) => {
    // กรองลูกก่อน
    const children = (node.children || [])
      .map(filterNode)
      .filter(Boolean)
      .flat(); // แบน array เพื่อไม่ให้ซ้อน

    if (blockedCodes.includes(node.code)) {
      // Node blocked → return children (ไม่เอา node ตัวเอง)
      return children.length ? children : null;
    }

    // Node ปกติ → return node พร้อม children
    return [{ ...node, children }];
  };

  return tree.map(filterNode).flat().filter(Boolean);
}, [tree]);

  const toggle = (code) => {
    setExpanded((p) => ({ ...p, [code]: !p[code] }));
  };

  return {
    tree: filteredTree,
    expanded,
    toggle,
  };
}