import { createIcon } from "../../runtime/create-icon.js";

export const Home = createIcon("Home", [
  [
    "path",
    {
      "d": "M15 21v-6a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v6"
    }
  ],
  [
    "path",
    {
      "d": "M3 10.5 12 3l9 7.5"
    }
  ],
  [
    "path",
    {
      "d": "M5 10v11h14V10"
    }
  ]
] as const);

export default Home;
