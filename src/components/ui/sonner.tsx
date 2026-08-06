import { Toaster as Sonner } from "sonner";
import { useEffect, useState } from "react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const updateTheme = () => {
      const isLight = document.documentElement.classList.contains("light");
      setTheme(isLight ? "light" : "dark");
    };

    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return (
    <Sonner
      className="toaster group"
      position="top-center"
      theme={theme}
      offset={16}
      toastOptions={{
        classNames: {
          toast:
            "group toast card-elevated !rounded-2xl !border-border !text-foreground !shadow-xl !p-4 !gap-3",
          title: "!text-[15px] !font-semibold !tracking-tight",
          description: "!text-[13px] !text-muted-foreground !mt-0.5",
          actionButton:
            "!bg-primary !text-primary-foreground !rounded-full !px-3 !py-1.5 !text-[12px] !font-medium hover:!opacity-90 transition-opacity",
          cancelButton:
            "!bg-secondary !text-foreground !rounded-full !px-3 !py-1.5 !text-[12px] !font-medium transition-colors",
          closeButton:
            "!bg-secondary !text-foreground !border-border",
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
