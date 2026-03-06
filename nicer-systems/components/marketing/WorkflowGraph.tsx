"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface Node {
  id: number;
  x: number;
  y: number;
  size: number;
  phase: number;
  amplitude: number;
  duration: number;
}

interface Edge {
  from: number;
  to: number;
}

function seededRandom(s: number): number {
  s = Math.sin(s) * 10000;
  return s - Math.floor(s);
}

function generateGraph(seed: number) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  let nodeIndex = 0;
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 4; col++) {
      const key = seed + row * 100 + col;
      if (seededRandom(key * 7.3) > 0.45) continue;

      nodes.push({
        id: nodeIndex,
        x: 10 + col * 22 + seededRandom(key * 3.1) * 12,
        y: 5 + row * 16 + seededRandom(key * 5.7) * 8,
        size: 3 + seededRandom(key * 2.9) * 3,
        phase: seededRandom(key * 1.7) * Math.PI * 2,
        amplitude: 1.5 + seededRandom(key * 4.3) * 3,
        duration: 8 + seededRandom(key * 6.1) * 10,
      });
      nodeIndex++;
    }
  }

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 28 && seededRandom(seed + i * 13 + j * 17) > 0.4) {
        edges.push({ from: i, to: j });
      }
    }
  }

  return { nodes, edges };
}

export function WorkflowGraph() {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(true);
  const [packetEdge, setPacketEdge] = useState(0);
  const [packetEdge2, setPacketEdge2] = useState(0);
  const graph = useMemo(() => generateGraph(42), []);

  // Parallax: subtle drift based on scroll
  const { scrollYProgress } = useScroll();
  const parallaxY = useTransform(scrollYProgress, [0, 1], [0, -15]);

  const nodeAnimations = useMemo(() =>
    graph.nodes.map((node) => ({
      animate: {
        cx: [node.x, node.x + node.amplitude * 0.3, node.x - node.amplitude * 0.2, node.x],
        cy: [node.y, node.y - node.amplitude * 0.2, node.y + node.amplitude * 0.3, node.y],
      },
      transition: {
        duration: node.duration,
        repeat: Infinity,
        ease: "easeInOut" as const,
        delay: node.phase,
      },
    })),
    [graph.nodes]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handler = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  // First data packet
  useEffect(() => {
    if (reduced || !visible || graph.edges.length === 0) return;
    const interval = setInterval(() => {
      setPacketEdge((prev) => (prev + 1) % graph.edges.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [reduced, visible, graph.edges.length]);

  // Second data packet (offset by half the edges)
  useEffect(() => {
    if (reduced || !visible || graph.edges.length < 3) return;
    const offset = Math.floor(graph.edges.length / 2);
    setPacketEdge2(offset);
    const interval = setInterval(() => {
      setPacketEdge2((prev) => (prev + 1) % graph.edges.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [reduced, visible, graph.edges.length]);

  if (!mounted) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full"
        style={{ y: reduced ? 0 : parallaxY }}
      >
        {graph.edges.map((edge, i) => {
          const from = graph.nodes[edge.from];
          const to = graph.nodes[edge.to];
          if (!from || !to) return null;
          return (
            <line
              key={`e-${i}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="var(--theme-primary)"
              strokeOpacity={0.1}
              strokeWidth={0.15}
            />
          );
        })}

        {graph.nodes.map((node, i) => (
          <motion.circle
            key={`n-${node.id}`}
            cx={node.x}
            cy={node.y}
            r={node.size * 0.1}
            fill="var(--theme-primary)"
            fillOpacity={0.15}
            animate={!reduced && visible ? nodeAnimations[i].animate : undefined}
            transition={!reduced && visible ? nodeAnimations[i].transition : undefined}
          />
        ))}

        {/* Data packet 1 */}
        {!reduced &&
          visible &&
          graph.edges.length > 0 &&
          (() => {
            const edge = graph.edges[packetEdge];
            const from = graph.nodes[edge.from];
            const to = graph.nodes[edge.to];
            if (!from || !to) return null;
            return (
              <motion.circle
                key={`packet-${packetEdge}`}
                r={0.3}
                fill="var(--theme-primary)"
                fillOpacity={0.6}
                initial={{ cx: from.x, cy: from.y, opacity: 0 }}
                animate={{
                  cx: [from.x, to.x],
                  cy: [from.y, to.y],
                  opacity: [0, 1, 1, 0],
                }}
                transition={{ duration: 2.5, ease: "easeInOut" }}
              />
            );
          })()}

        {/* Data packet 2 */}
        {!reduced &&
          visible &&
          graph.edges.length >= 3 &&
          (() => {
            const edge = graph.edges[packetEdge2];
            const from = graph.nodes[edge.from];
            const to = graph.nodes[edge.to];
            if (!from || !to) return null;
            return (
              <motion.circle
                key={`packet2-${packetEdge2}`}
                r={0.25}
                fill="var(--theme-secondary)"
                fillOpacity={0.5}
                initial={{ cx: from.x, cy: from.y, opacity: 0 }}
                animate={{
                  cx: [from.x, to.x],
                  cy: [from.y, to.y],
                  opacity: [0, 1, 1, 0],
                }}
                transition={{ duration: 2, ease: "easeInOut" }}
              />
            );
          })()}
      </motion.svg>
    </div>
  );
}
