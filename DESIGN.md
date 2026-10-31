# CreativeVox Media — Design System

## Direction
Build a premium, editorial-feeling digital agency site: confident, creative, and conversion-focused. Keep the red brand identity, now on a deep green-black base with mint and sage supporting tones, but avoid generic AI-generated SaaS styling. Use intentional typography, strong hierarchy, purposeful negative space, and distinct section compositions.

## Tokens
- Background: deep green-black (#0a110f)
- Panels: dark green (#101a16 / #16221d)
- Primary text: mint-white (#e3f3ec); display highlights may use mint (#d8efe8)
- Muted text: sage-gray (#9db8ac), only where contrast remains readable
- Accent: brand red (#c1322a) for buttons and large type; lighter red (#e5584d) for small text, links and hover
- Supporting tone: sage (#89ad9e) for gradients and decorative details
- Borders: subtle mint at low opacity in dark mode (rgba(216,239,232,.12))
- Light mode: pale mint background (#f2f7f4), near-black green text (#0f1a16), red #b52d25 / #9c241e
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
