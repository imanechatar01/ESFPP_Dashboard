import { useState } from 'react';
import { ChevronDown, ChevronRight, Activity, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ProgrammeTree({ list, activeLogId, onSelect, onDelete }) {
  // Group by filiere
  const groups = list.reduce((acc, log) => {
    const filiereId = log.filiere?.id || 'unknown';
    if (!acc[filiereId]) {
      acc[filiereId] = {
        filiere: log.filiere || { name: 'Inconnu', code: '???' },
        items: []
      };
    }
    acc[filiereId].items.push(log);
    return acc;
  }, {});

  return (
    <div className="space-y-2">
      {Object.values(groups).map((group) => (
        <FiliereSection 
          key={group.filiere.id} 
          group={group} 
          activeLogId={activeLogId} 
          onSelect={onSelect}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

function FiliereSection({ group, activeLogId, onSelect, onDelete }) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const avgTaux = group.items.reduce((sum, item) => sum + (item.taux || 0), 0) / group.items.length;
  const progressPercent = !isNaN(avgTaux) ? Math.round(avgTaux * 100) : 0;

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-1.5 rounded-lg hover:bg-muted/50 transition-colors group"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="relative size-8 flex-shrink-0">
            {/* Progress ring placeholder or icon */}
            <div className="absolute inset-0 rounded-full border-2 border-primary/10" />
            <div 
              className="absolute inset-0 rounded-full border-2 border-primary transition-all duration-500" 
              style={{ 
                clipPath: `inset(${100 - progressPercent}% 0 0 0)`,
                opacity: progressPercent > 0 ? 1 : 0.2
              }} 
            />
            <Activity className="absolute inset-0 m-auto size-3.5 text-primary" />
          </div>
          <div className="text-left overflow-hidden">
            <p className="text-[11px] font-black uppercase tracking-widest text-foreground truncate">{group.filiere.name}</p>
            <p className="text-[9px] font-bold text-muted-foreground/60">{group.items.length} classe{group.items.length > 1 ? 's' : ''}</p>
          </div>
        </div>
        {isExpanded ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
      </button>

      {isExpanded && (
        <div className="space-y-1 ml-2 pl-2 border-l border-border/50 animate-in slide-in-from-top-1 duration-200">
          {group.items.map((log) => {
            const progressValue = typeof log.taux === 'number' && !isNaN(log.taux) 
              ? Math.round(log.taux * 100) 
              : 0;

            return (
              <div key={log.id} className="relative group/card">
                <button
                  onClick={() => onSelect(log.id)}
                  className={cn(
                    "w-full flex flex-col p-2 rounded-lg border transition-all hover:translate-x-1",
                    activeLogId === log.id 
                      ? "bg-primary border-primary shadow-sm" 
                      : "bg-card border-border hover:border-primary/30"
                  )}
                >
                  <div className="flex justify-between items-center mb-1.5">
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-tight",
                      activeLogId === log.id ? "text-white" : "text-foreground"
                    )}>
                      {log.classe?.label || '???'}
                    </span>
                    <span className={cn(
                      "text-[9px] font-black",
                      activeLogId === log.id ? "text-white" : "text-primary"
                    )}>
                      {progressValue}%
                    </span>
                  </div>
                  <div className={cn(
                    "h-1 w-full rounded-full overflow-hidden",
                    activeLogId === log.id ? "bg-white/20" : "bg-muted"
                  )}>
                    <div 
                      className={cn(
                        "h-full transition-all duration-500",
                        activeLogId === log.id ? "bg-white" : "bg-primary"
                      )}
                      style={{ width: `${progressValue}%` }}
                    />
                  </div>
                </button>
                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(log.id, `${group.filiere.name} — ${log.classe?.label}`);
                    }}
                    className={cn(
                      "absolute -top-1.5 -right-1.5 size-6 rounded-full flex items-center justify-center transition-all",
                      "bg-destructive/90 text-white shadow-md",
                      "opacity-0 scale-75 group-hover/card:opacity-100 group-hover/card:scale-100",
                      "hover:bg-destructive hover:shadow-lg"
                    )}
                    title="Supprimer ce logigramme"
                  >
                    <Trash2 className="size-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
