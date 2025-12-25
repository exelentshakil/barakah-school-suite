import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface QuickActionProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  variant?: 'default' | 'primary' | 'gold';
}

const variantStyles = {
  default: 'bg-card hover:bg-muted border-border',
  primary: 'bg-primary/5 hover:bg-primary/10 border-primary/20',
  gold: 'bg-accent/5 hover:bg-accent/10 border-accent/20',
};

const iconStyles = {
  default: 'bg-muted text-foreground',
  primary: 'bg-primary text-primary-foreground',
  gold: 'bg-accent text-accent-foreground',
};

export function QuickAction({
  title,
  description,
  icon: Icon,
  href,
  variant = 'default',
}: QuickActionProps) {
  return (
    <Link
      to={href}
      className={cn(
        "flex items-center gap-4 p-4 rounded-xl border transition-all duration-200",
        "hover:shadow-md hover:scale-[1.02] active:scale-[0.98]",
        variantStyles[variant]
      )}
    >
      <div className={cn(
        "shrink-0 w-12 h-12 rounded-xl flex items-center justify-center",
        iconStyles[variant]
      )}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="min-w-0">
        <h3 className="font-semibold text-foreground truncate">{title}</h3>
        <p className="text-sm text-muted-foreground truncate">{description}</p>
      </div>
    </Link>
  );
}
