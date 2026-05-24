import { createIcon } from "../../runtime/create-icon.js";

export const User = createIcon("User", [
  [
    "circle",
    {
      "cx": "12",
      "cy": "8",
      "r": "4"
    }
  ],
  [
    "path",
    {
      "d": "M6 20a6 6 0 0 1 12 0"
    }
  ]
] as const);

export default User;
