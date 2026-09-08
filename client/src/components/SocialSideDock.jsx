import { useEffect, useRef, useState } from "react";
import { useSiteSettings } from "../context/SiteSettingsContext";
import { isHttpUrl, phoneToWhatsAppHref } from "../utils/whatsapp";

const STORAGE_KEY = "uscl-social-dock";
const DRAG_THRESHOLD = 6;

function socialHref(socials, label) {
  const item = (socials || []).find((s) => String(s.label).toLowerCase() === label);
  const href = String(item?.href || "").trim();
  return href && href !== "#" ? href : "";
}

function LinkedInMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#fff"
        d="M7.4 9.3H4.6V19h2.8V9.3ZM6 4.2A1.6 1.6 0 1 0 6 7.4 1.6 1.6 0 0 0 6 4.2ZM19.4 19h-2.8v-4.7c0-1.3-.5-2.1-1.6-2.1-.9 0-1.4.6-1.6 1.2-.1.2-.1.5-.1.8V19h-2.8s.04-8.8 0-9.7h2.8v1.4c.4-.6 1.1-1.5 2.7-1.5 2 0 3.4 1.3 3.4 4.1V19Z"
      />
    </svg>
  );
}

function InstagramMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#fff"
        d="M8.2 4.2h7.6A4 4 0 0 1 19.8 8.2v7.6a4 4 0 0 1-4 4H8.2a4 4 0 0 1-4-4V8.2a4 4 0 0 1 4-4Zm7.7 1.6h-7.8a2.3 2.3 0 0 0-2.3 2.3v7.8a2.3 2.3 0 0 0 2.3 2.3h7.8a2.3 2.3 0 0 0 2.3-2.3V8.1a2.3 2.3 0 0 0-2.3-2.3Zm-3.9 2.5a3.7 3.7 0 1 1 0 7.4 3.7 3.7 0 0 1 0-7.4Zm0 1.6a2.1 2.1 0 1 0 0 4.2 2.1 2.1 0 0 0 0-4.2Zm4-2.3a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8Z"
      />
    </svg>
  );
}

function WhatsAppMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#fff"
        d="M12.04 4.5A7.5 7.5 0 0 0 5.3 16.1L4.5 19.5l3.5-.8A7.5 7.5 0 1 0 12.04 4.5Zm4.3 10.6c-.18.5-1.04.95-1.46 1.01-.37.06-.85.08-1.37-.09-.31-.1-.72-.24-1.24-.46-2.18-.94-3.6-3.14-3.71-3.29-.11-.14-.9-1.2-.9-2.3 0-1.09.57-1.63.78-1.85.2-.22.44-.28.59-.28h.42c.14 0 .32-.05.5.38.18.45.62 1.55.68 1.66.06.11.1.24.02.39-.08.14-.12.23-.24.36-.12.13-.25.29-.36.39-.12.11-.24.23-.1.45.14.22.62 1.02 1.33 1.65.91.82 1.68 1.07 1.92 1.19.24.12.38.1.52-.06.14-.16.59-.69.75-.93.16-.24.32-.2.53-.12.22.08 1.37.65 1.6.77.24.12.4.18.46.28.06.1.06.58-.12 1.08Z"
      />
    </svg>
  );
}

function readStoredPos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.x === "number" && typeof parsed?.y === "number") return parsed;
  } catch {
    // ignore
  }
  return null;
}

export default function SocialSideDock() {
  const { socials, contact, whatsappGroupUrl } = useSiteSettings();
  const dockRef = useRef(null);
  const dragRef = useRef(null);
  const [pos, setPos] = useState(null);

  useEffect(() => {
    setPos(readStoredPos());
  }, []);

  const linkedin = socialHref(socials, "linkedin");
  const instagram = socialHref(socials, "instagram");
  const whatsapp =
    (isHttpUrl(whatsappGroupUrl) ? whatsappGroupUrl.trim() : "") || phoneToWhatsAppHref(contact.phone);

  const items = [
    { key: "linkedin", href: linkedin, label: "LinkedIn", className: "is-linkedin", icon: <LinkedInMark /> },
    { key: "instagram", href: instagram, label: "Instagram", className: "is-instagram", icon: <InstagramMark /> },
    { key: "whatsapp", href: whatsapp, label: "WhatsApp", className: "is-whatsapp", icon: <WhatsAppMark /> },
  ];

  function onPointerDown(event) {
    if (event.button !== 0) return;
    const node = dockRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: rect.left,
      originY: rect.top,
      moved: false,
    };
    node.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event) {
    const drag = dragRef.current;
    const node = dockRef.current;
    if (!drag || !node || event.pointerId !== drag.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) drag.moved = true;
    if (!drag.moved) return;
    const nextX = Math.min(window.innerWidth - node.offsetWidth - 8, Math.max(8, drag.originX + dx));
    const nextY = Math.min(window.innerHeight - node.offsetHeight - 8, Math.max(8, drag.originY + dy));
    setPos({ x: nextX, y: nextY });
  }

  function onPointerUp(event) {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (drag.moved) {
      setPos((current) => {
        if (current) {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
          } catch {
            // ignore
          }
        }
        return current;
      });
    }
    window.setTimeout(() => {
      dragRef.current = null;
    }, 0);
  }

  function onItemClick(event, href) {
    if (dragRef.current?.moved || !href) {
      event.preventDefault();
    }
  }

  return (
    <div
      ref={dockRef}
      className="social-side-dock"
      style={pos ? { left: pos.x, top: pos.y, right: "auto", transform: "none" } : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {items.map((item) => (
        <a
          key={item.key}
          href={item.href || "#"}
          target={item.href ? "_blank" : undefined}
          rel="noreferrer"
          className={`social-side-dock__btn ${item.className}`}
          aria-label={item.label}
          title={item.label}
          onClick={(event) => onItemClick(event, item.href)}
        >
          {item.icon}
        </a>
      ))}
    </div>
  );
}
