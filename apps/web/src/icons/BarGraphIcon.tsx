import { FC } from "react";
import { SvgIconProps, SvgIcon } from "@mui/material";

export const BarGraphIcon: FC<SvgIconProps> = ({ ...props }) => (
  <SvgIcon viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M16.5 19.5H10.5"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M28.5 13.5H22.5"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4.5 4.5V28.5C4.5 29.2956 4.81607 30.0587 5.37868 30.6213C5.94129 31.1839 6.70435 31.5 7.5 31.5H31.5"
      fill="none"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M27 7.5H24C23.1716 7.5 22.5 8.17157 22.5 9V24C22.5 24.8284 23.1716 25.5 24 25.5H27C27.8284 25.5 28.5 24.8284 28.5 24V9C28.5 8.17157 27.8284 7.5 27 7.5Z"
      fill="none"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M15 12H12C11.1716 12 10.5 12.6716 10.5 13.5V24C10.5 24.8284 11.1716 25.5 12 25.5H15C15.8284 25.5 16.5 24.8284 16.5 24V13.5C16.5 12.6716 15.8284 12 15 12Z"
      fill="none"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </SvgIcon>
);
