import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export function WeekContextMenu({ x = 0, y = 0, onClose = () => {}, onSelect = () => {} }) {
  const menuRef = useRef(null);
  const portalNodeRef = useRef(typeof document !== 'undefined' ? document.createElement('div') : null);

  useEffect(() => {
    if (portalNodeRef.current && !portalNodeRef.current.parentNode) {
      portalNodeRef.current.style.position = 'absolute';
      portalNodeRef.current.style.top = '0';
      portalNodeRef.current.style.left = '0';
      portalNodeRef.current.style.width = '0';
      portalNodeRef.current.style.height = '0';
      portalNodeRef.current.style.zIndex = '9999';
      document.body.appendChild(portalNodeRef.current);
    }

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      if (portalNodeRef.current && portalNodeRef.current.parentNode) {
        portalNodeRef.current.parentNode.removeChild(portalNodeRef.current);
      }
    };
  }, [onClose]);

  // Clamp so menu stays inside viewport
  const clamp = (coord, max, pad = 8, size = 200) => Math.min(Math.max(pad, coord), Math.max(pad, max - size - pad));
  const left = clamp(x, window.innerWidth, 8, 240);
  const top = clamp(y, window.innerHeight, 8, 100);

  const menu = (
    <div
      ref={menuRef}
      className="fixed z-[9999] min-w-[220px] bg-card rounded-md border border-border shadow-lg py-1 text-xs font-medium text-muted-foreground no-print"
      style={{ top: `${top}px`, left: `${left}px` }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <button
        onClick={() => { onSelect('mark_done'); onClose(); }}
        className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-status-done border border-border"></span>
        Marquer la semaine comme terminée
      </button>
      <div className="h-px bg-status-exam my-1"></div>
      <button
        onClick={() => { onSelect('clear'); onClose(); }}
        className="w-full text-left px-3 py-1.5 hover:bg-destructive/10 text-destructive flex items-center gap-2"
      >
        Supprimer la semaine
      </button>
    </div>
  );

  return createPortal(menu, portalNodeRef.current || document.body);
}

export default WeekContextMenu;
