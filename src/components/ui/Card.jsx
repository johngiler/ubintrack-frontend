import { cn } from "@/lib/cn";

export function Card({ children, className, ...props }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl bg-[var(--card)] shadow-[var(--shadow-sm)] transition-colors duration-300 dark:shadow-[var(--shadow-md)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

Card.Header = function CardHeader({ children, className, ...props }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 px-5 py-4",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

Card.Body = function CardBody({ children, className, ...props }) {
  return (
    <div className={cn("p-5", className)} {...props}>
      {children}
    </div>
  );
};

Card.Footer = function CardFooter({ children, className, ...props }) {
  return (
    <div className={cn("bg-[var(--surface-hover)]/40 px-5 py-3", className)} {...props}>
      {children}
    </div>
  );
};
