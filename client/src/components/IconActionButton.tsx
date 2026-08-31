import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type IconActionButtonProps = Omit<React.ComponentProps<typeof Button>, "children" | "size"> & {
  icon: ReactNode;
  label: string;
  tooltip?: string;
  size?: "icon" | "icon-sm" | "icon-lg";
};

export function IconActionButton({ icon, label, tooltip = label, className, size = "icon", ...props }: IconActionButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          {...props}
          type={props.type ?? "button"}
          size={size}
          aria-label={label}
          title={label}
          className={cn("shrink-0", className)}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{tooltip}</TooltipContent>
    </Tooltip>
  );
}
