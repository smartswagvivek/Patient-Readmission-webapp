import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils.js";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-medical-primary text-white hover:bg-medical-primary-dark",
        secondary:
          "border-transparent bg-medical-surface text-medical-primary hover:bg-medical-surface/80",
        destructive: "border-transparent bg-red-600 text-white hover:bg-red-700",
        outline: "border-slate-300 text-slate-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
