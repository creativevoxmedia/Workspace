# CreativeVox Media — Design System

## Direction
Build a premium, editorial-feeling digital agency site: confident, creative, and conversion-focused. Keep the existing red / near-black brand identity, but avoid generic AI-generated SaaS styling. Use intentional typography, strong hierarchy, purposeful negative space, and distinct section compositions.

## Tokens
- Background: near-black (#0a0a0c)
- Panels: charcoal (#121216 / #18181d)
- Primary text: near-white (#f7f7f8)
- Muted text: neutral gray only where contrast remains readable
- Accent: brand red (#ff303b), with lighter red for hover and emphasis
- Borders: subtle white at low opacity in dark mode
- Layout: centered content, readable line lengths, consistent spacing rhythm
- Corners: use moderate radii; avoid wrapping every element in nested cards

## Typography
- Use a distinctive display face for headings and a highly readable body face.
- Maintain a clear hierarchy between eyebrow labels, section headings, body copy, and metadata.
- Avoid relying on one font weight or oversized all-caps labels to create hierarchy.
- Body copy should be comfortable on small screens and never rely on low-contrast gray.

## Components and interaction
- Primary CTA should be visually dominant and action-oriented.
- Secondary actions should be quieter, but still clearly interactive.
- Cards should be used when they clarify grouping; prefer open layouts for content that does not need a container.
- Hover effects should be subtle and informative, not required to understand content.
- Keep focus states visible and ensure touch targets are comfortably sized.
- Honor prefers-reduced-motion; avoid bounce or elastic motion.

## Responsive behavior
- Design for narrow mobile widths first when modifying navigation, CTA groups, service lists, and dialogs.
- Prevent horizontal overflow, clipped text, and tiny tap targets.
- Preserve usable spacing and readable line lengths at every breakpoint.

## Content rules
- Lead with business outcomes rather than vague claims.
- Make service names and deliverables concrete.
- The Social Media Marketing service must include management, creative post designs, and content creation together.
- Show actual portfolio work and clearly distinguish concept work from delivered client work.
- Never invent results, reviews, client names, or performance statistics.

## Quality checklist
- [ ] Clear primary CTA and obvious contact path
- [ ] Responsive layout without horizontal overflow
- [ ] Keyboard-visible focus states
- [ ] Reduced-motion support
- [ ] Descriptive links and meaningful heading order
- [ ] Adequate text contrast
- [ ] Images have appropriate alternative text
- [ ] No unsupported business claims
- [ ] Test mobile and desktop before shipping
