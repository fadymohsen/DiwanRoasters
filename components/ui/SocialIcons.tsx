import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement>;

export function InstagramIcon(props: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FacebookIcon(props: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M13.5 21v-7.6h2.6l.4-3H13.5V8.5c0-.9.3-1.5 1.5-1.5h1.6V4.3c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.8v3H10.4V21h3.1Z" />
    </svg>
  );
}

export function TikTokIcon(props: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M16.6 3h-3.1v11.6a2.6 2.6 0 1 1-2.6-2.6c.3 0 .5 0 .8.1V8.9a5.7 5.7 0 1 0 4.9 5.6V9.3a6.9 6.9 0 0 0 4 1.3V7.5a4 4 0 0 1-4-4.5Z" />
    </svg>
  );
}

export function WhatsAppIcon(props: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12.04 2.5a9.5 9.5 0 0 0-8.2 14.27L2.5 21.5l4.85-1.27A9.5 9.5 0 1 0 12.04 2.5Zm0 1.7a7.8 7.8 0 1 1-4.1 14.45l-.3-.18-2.88.75.77-2.8-.2-.3a7.8 7.8 0 0 1 6.7-11.92Zm-3 3.7c-.2 0-.5.07-.75.35-.26.28-1 .98-1 2.4s1.03 2.8 1.17 3c.14.2 2 3.2 4.95 4.35 2.45.97 2.95.78 3.48.73.54-.05 1.7-.7 1.95-1.37.24-.68.24-1.26.17-1.38-.07-.12-.27-.2-.56-.34-.3-.15-1.7-.84-1.97-.94-.27-.1-.46-.15-.66.15-.2.3-.76.94-.93 1.13-.17.2-.34.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.34.44-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.66-1.6-.9-2.18-.24-.57-.48-.5-.66-.5Z" />
    </svg>
  );
}
