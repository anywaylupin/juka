/**
 * Where to reach the author, shown from the foot of the sidebar.
 * An empty link is left out of the dialog rather than shown as a dead button, so a row can be added before its address is known.
 */
export const CONTACT_LINKS = [
  { key: 'source', icon: 'i-lucide-git-branch', href: 'https://github.com/anywaylupin/juka' },
  { key: 'github', icon: 'i-lucide-github', href: 'https://github.com/anywaylupin' },
  { key: 'linkedin', icon: 'i-lucide-linkedin', href: 'https://www.linkedin.com/in/anywaylupin' }
] as const;
