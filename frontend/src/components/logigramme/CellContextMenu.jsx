import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export function CellContextMenu({ x = 0, y = 0, onClose = () => {}, onSelect = () => {} }) {
  const menuRef = useRef(null);
  const inputRef = useRef(null);
  const portalNodeRef = useRef(typeof document !== 'undefined' ? document.createElement('div') : null);
  const [showHoursInput, setShowHoursInput] = useState(false);
  const [hours, setHours] = useState('');

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

  useEffect(() => {
    if (showHoursInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showHoursInput]);

  // Clamp so menu stays inside viewport
  const clamp = (coord, max, pad = 8, size = 160) => Math.min(Math.max(pad, coord), Math.max(pad, max - size - pad));
  const left = clamp(x, window.innerWidth);
  const top = clamp(y, window.innerHeight);

  const handleSessionSubmit = (e) => {
    e.preventDefault();
    if (hours.trim() !== '') {
      onSelect('normal', Number(hours));
      onClose();
    }
  };

  const menu = (
    <div
      ref={menuRef}
      className="fixed z-[9999] min-w-[140px] bg-white rounded-md border border-slate-200 shadow-lg py-1 text-xs font-medium text-slate-700 no-print"
      style={{ top: `${top}px`, left: `${left}px` }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {!showHoursInput ? (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowHoursInput(true);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#FEF9C3] border border-slate-300"></span>
            Session
          </button>
          <button
            onClick={() => { onSelect('exam'); onClose(); }}
            className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#e2e8f0] border border-slate-300"></span>
            Examen
          </button>
          <button
            onClick={() => { onSelect('tiff'); onClose(); }}
            className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#facc15] border border-slate-300"></span>
            TIFF / Clôture
          </button>
          <button
            onClick={() => { onSelect('vacation'); onClose(); }}
            className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#F472B6]"></span>
            Vacance
          </button>
          <div className="h-px bg-slate-200 my-1"></div>
          <button
            onClick={() => { onSelect('empty'); onClose(); }}
            className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600 flex items-center gap-2"
          >
            Supprimer
          </button>
        </>
      ) : (
        <form onSubmit={handleSessionSubmit} className="px-3 py-2 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FEF9C3] border border-slate-300 flex-shrink-0"></span>
          <input
            ref={inputRef}
            type="number"
            step="0.5"
            min="0"
            className="w-16 px-1 py-0.5 border border-slate-300 rounded text-xs"
            placeholder="Heures"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation();
                setShowHoursInput(false);
              }
            }}
          />
          <button type="submit" className="bg-primary text-white px-2 py-0.5 rounded hover:bg-primary/90 text-xs">
            OK
          </button>
        </form>
      )}
    </div>
  );

  return createPortal(menu, portalNodeRef.current || document.body);
}

export default CellContextMenu;
