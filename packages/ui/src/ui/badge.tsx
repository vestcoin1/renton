import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "renton-core/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-colors [&_svg]:size-3.5",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "text-foreground",
        success: "border-success/20 bg-success/10 text-emerald-700 dark:text-emerald-300",
        warning: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        info: "border-primary/20 bg-primary/10 text-primary",
        destructive: "border-destructive/20 bg-destructive/10 text-destructive",
        neutral: "border-border bg-muted text-muted-foreground",
        violet: "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };


