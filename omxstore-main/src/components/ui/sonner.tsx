import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:glass-strong group-[.toaster]:text-foreground group-[.toaster]:rounded-2xl group-[.toaster]:border-white/10 group-[.toaster]:shadow-card",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:gradient-primary group-[.toast]:text-white group-[.toast]:rounded-xl group-[.toast]:font-bold",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
