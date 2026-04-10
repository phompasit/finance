import { useState } from "react";
import { useMemo } from "react";

export function useAccountTree(list = [], search = "") {
  const [expanded, setExpanded] = useState({});

  // ─── helper: คำนวณ level จาก code ───────────────────

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

  // Filter tree: เฉพาะ level 4 และ 5 เท่านั้น
  const filteredTree = useMemo(() => {
    const collect = (node) => {
      const level = node.level;
      const results = [];

      // เก็บ node นี้ถ้า level 4 หรือ 5
      if (level === 4 || level === 5) {
        results.push({ ...node, children: [] }); // ไม่ต้องมี children แล้ว
      }

      // วนหา level 4-5 ใน children ต่อเสมอ
      (node.children || []).forEach((child) => {
        results.push(...collect(child));
      });

      return results;
    };

    return tree.flatMap(collect);
  }, [tree]);

  const toggle = (code) => {
    setExpanded((p) => ({ ...p, [code]: !p[code] }));
  };
  console.log(filteredTree)
  return {
    tree: filteredTree,
    expanded,
    toggle,
  };
}