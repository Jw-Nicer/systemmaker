## 2025-05-15 - [Accessible Accordions with Smooth Transitions]
**Learning:** Adding smooth height animations to accordions with Framer Motion significantly improves the perceived quality of the interface. Combined with ARIA attributes like `aria-expanded` and `aria-controls`, it makes for a delightful and accessible experience.
**Action:** Use `AnimatePresence` and `motion.div` with `height: "auto"` for all future accordion-style components. Always ensure `aria-labelledby` or `aria-label` is present on the content region.
