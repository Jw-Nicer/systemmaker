"use client";

import { useEffect, useState } from "react";
import type { ABTest, ABTestVariant } from "@/types/ab-test";

/**
 * Client-side A/B test variant selector.
 * Selects a variant based on weighted random, persists in localStorage,
 * and fires an impression to the server.
 */
export function useABVariant(test: ABTest | null): ABTestVariant | null {
  const [variant, setVariant] = useState<ABTestVariant | null>(null);

  useEffect(() => {
    if (!test || test.variants.length === 0) return;

    const storageKey = `ab_${test.id}`;

    // Check for existing assignment
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const existing = test.variants.find((v) => v.id === stored);
      if (existing) {
        setVariant(existing);
        return;
      }
    }

    // Weighted random selection
    const totalWeight = test.variants.reduce((sum, v) => sum + v.weight, 0);
    let rand = Math.random() * totalWeight;
    let selected = test.variants[0];
    for (const v of test.variants) {
      rand -= v.weight;
      if (rand <= 0) {
        selected = v;
        break;
      }
    }

    localStorage.setItem(storageKey, selected.id);
    setVariant(selected);

    // Record impression
    fetch("/api/ab/impression", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ test_id: test.id, variant_id: selected.id }),
    }).catch(() => {});
  }, [test]);

  return variant;
}

/**
 * Fires an A/B conversion event.
 */
export function trackABConversion(testId: string, variantId: string, event: string) {
  fetch("/api/ab/conversion", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ test_id: testId, variant_id: variantId, event }),
  }).catch(() => {});
}
