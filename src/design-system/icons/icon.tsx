import type { SVGProps } from "react";

import { ICONS, type IconName } from "./icon-registry";

export type { IconName };

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "ref"> {
  name: IconName;
  size?: number;
  label?: string;
}

export function Icon({ name, size = 14, label, ...rest }: IconProps) {
  const Component = ICONS[name];
  return (
    <Component
      width={size}
      height={size}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      focusable="false"
      {...rest}
    />
  );
}

export function isIconName(value: string): value is IconName {
  return value in ICONS;
}
