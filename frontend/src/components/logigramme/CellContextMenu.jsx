import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export function CellContextMenu({ x = 0, y = 0, onClose = () => {}, onSelect = () => {} }) {
  const menuRef = useRef(null);
  const portalNodeRef = useRef(typeof document !== 'undefined' ? document.createElement('div') : null);

  useEffect(() => {
    // append portal node to body (created synchronously above)
    if (portalNodeRef.current && !portalNodeRef.current.parentNode) {
      portalNodeRef.current.style.position = 'absolute';
      portalNodeRef.current.style.top = '0';
      portalNodeRef.current.style.left = '0';
      portalNodeRef.current.style.width = '0';
      portalNodeRef.current.style.height = '0';
      portalNodeRef.current.style.zIndex = '9999';
      document.body.appendChild(portalNodeRef.current);
    }
    // ensure high stacking and pointer events
    portalNodeRef.current.style.position = 'absolute';
    portalNodeRef.current.style.top = '0';
    portalNodeRef.current.style.left = '0';
    portalNodeRef.current.style.width = '0';
    portalNodeRef.current.style.height = '0';
    portalNodeRef.current.style.zIndex = '9999';
    document.body.appendChild(portalNodeRef.current);

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
  const clamp = (coord, max, pad = 8, size = 160) => Math.min(Math.max(pad, coord), Math.max(pad, max - size - pad));
  const left = clamp(x, window.innerWidth);
  const top = clamp(y, window.innerHeight);

  const menu = (
    <div
      ref={menuRef}
      className="fixed z-[9999] min-w-[120px] bg-white rounded-md border border-slate-200 shadow-lg py-1 text-xs font-medium text-slate-700"
      style={{ top: `${top}px`, left: `${left}px` }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <button
        onClick={() => onSelect('normal')}
        className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-[#FEF9C3] border border-slate-300"></span>
        Session
      </button>
      <button
        onClick={() => onSelect('vacation')}
        className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-[#F472B6]"></span>
        Vacance
      </button>
      <button
        onClick={() => onSelect('exam')}
        className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-slate-200 border border-slate-300"></span>
        Examen
      </button>
    </div>
  );

  return createPortal(menu, portalNodeRef.current || document.body);
}

export default CellContextMenu;
