import cap from "@/assets/icon-cap.png";
import chart from "@/assets/icon-chart.png";
import shield from "@/assets/icon-shield.png";
import people from "@/assets/icon-people.png";
import trophy from "@/assets/icon-trophy.png";
import sparkle from "@/assets/icon-sparkle.png";
import app from "@/assets/app-icon.png";
import book from "@/assets/icon-book.png";
import inbox from "@/assets/icon-inbox.png";
import users from "@/assets/icon-users.png";
import gear from "@/assets/icon-gear.png";

export const icon3d = { cap, chart, shield, people, trophy, sparkle, app, book, inbox, users, gear } as const;

export type Icon3dName = keyof typeof icon3d;

export function Icon3d({
  name,
  size = 56,
  className = "",
  priority = false,
}: {
  name: Icon3dName;
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <img
      src={icon3d[name]}
      alt=""
      aria-hidden
      width={size}
      height={size}
      loading={priority ? "eager" : "lazy"}
      className={`select-none drop-shadow-[0_8px_18px_rgba(0,80,200,0.35)] ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
