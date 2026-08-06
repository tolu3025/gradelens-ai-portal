import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="top-center"
      theme="dark"
      offset={16}
      toastOptions={{
        classNames: {
          toast:
            "group toast glass !rounded-2xl !border-white/10 !text-foreground !shadow-[0_20px_60px_-20px_oklch(0_0_0/0.7)] !p-4 !gap-3",
          title: "!text-[15px] !font-semibold !tracking-tight",
          description: "!text-[13px] !text-muted-foreground !mt-0.5",
          actionButton:
            "!bg-primary !text-primary-foreground !rounded-full !px-3 !py-1.5 !text-[12px] !font-medium hover:!opacity-90 transition-opacity",
          cancelButton:
            "!bg-white/10 !text-foreground !rounded-full !px-3 !py-1.5 !text-[12px] !font-medium hover:!bg-white/15 transition-colors",
          closeButton:
            "!bg-white/10 !text-foreground !border-white/10 hover:!bg-white/20",
          success:
            "!border-[color-mix(in_oklab,var(--success)_40%,transparent)] [&_[data-icon]]:!text-[var(--success)]",
          error:
            "!border-[color-mix(in_oklab,var(--destructive)_50%,transparent)] [&_[data-icon]]:!text-[var(--destructive)]",
          warning:
            "!border-[color-mix(in_oklab,var(--warning)_45%,transparent)] [&_[data-icon]]:!text-[var(--warning)]",
          info:
            "!border-[color-mix(in_oklab,var(--brand)_45%,transparent)] [&_[data-icon]]:!text-[var(--brand)]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
