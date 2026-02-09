import { getProfileAvatarUrl, getInitials } from "@/lib/avatar";

interface MemberAvatarProps {
  /** Pre-computed URL (e.g. signed URL from server). When set, avatarPath is ignored for the image src. */
  avatarUrl?: string | null;
  avatarPath: string | null;
  firstName: string | null;
  lastName: string | null;
  className?: string;
  size?: "sm" | "md";
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
};

export function MemberAvatar({
  avatarUrl: avatarUrlProp,
  avatarPath,
  firstName,
  lastName,
  className = "",
  size = "md",
}: MemberAvatarProps) {
  const url = avatarUrlProp ?? getProfileAvatarUrl(avatarPath);
  const initials = getInitials(firstName, lastName);

  if (url) {
    return (
      // Avatar is a purely decorative image; Next.js Image optimization is not required here.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} flex shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground ${className}`}
      aria-hidden
    >
      {initials}
    </div>
  );
}
