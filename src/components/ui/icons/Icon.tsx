import React from "react";
import { SVG_PATHS } from "../forms/formConfig";

type IconProps = {
  name: keyof typeof SVG_PATHS;
  className?: string;
};

export function Icon({ name, className = "h-5 w-5 text-gray-400" }: IconProps) {
  // Type guard functions to check the structure of the paths
  const isEmailIcon = (name: string): name is "email" => name === "email";
  const isPhoneIcon = (name: string): name is "phone" => name === "phone";
  const isLockIcon = (name: string): name is "lock" => name === "lock";

  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      {isEmailIcon(name) && (
        <>
          <path d={SVG_PATHS[name].path1} />
          <path d={SVG_PATHS[name].path2} />
        </>
      )}
      {isPhoneIcon(name) && <path d={SVG_PATHS[name].path} />}
      {isLockIcon(name) && <path d={SVG_PATHS[name].path} />}
    </svg>
  );
}
