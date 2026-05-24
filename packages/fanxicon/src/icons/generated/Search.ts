import { createIcon } from "../../runtime/create-icon.js";

export const Search = createIcon("Search", [
  [
    "circle",
    {
      "cx": "11",
      "cy": "11",
      "r": "8"
    }
  ],
  [
    "path",
    {
      "d": "m21 21-4.3-4.3"
    }
  ]
] as const);

export default Search;
