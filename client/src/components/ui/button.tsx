import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 select-none",
  {
    variants: {
      variant: {
        default: "bg-surface-2 text-fg border border-subtle hover:border-strong",
        primary: "bg-primary text-primary-foreground hover:brightness-110 shadow-[0_0_0_0_hsl(var(--primary)/0)] hover:shadow-[0_0_24px_hsl(var(--primary)/0.35)]",
        ghost: "text-fg-2 hover:text-fg hover:bg-surface-2",
        outline: "border border-subtle text-fg hover:border-strong bg-transparent",
        link: "text-fg-2 underline-offset-4 hover:text-fg hover:underline",
        secondary: "bg-surface-2 text-fg border border-subtle hover:border-strong",
        destructive: "bg-no/20 text-no border border-no/30 hover:bg-no/30",
        yes: "bg-yes/12 text-yes border border-yes/30 hover:bg-yes/20 hover:border-yes/50",
        no:  "bg-no/12 text-no border border-no/30 hover:bg-no/20 hover:border-no/50",
      },
      size: {
        default: "h-9 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-6 text-[15px]",
        xl: "h-14 px-8 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
