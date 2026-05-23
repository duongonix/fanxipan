import { createRouter } from "fanxipan/router";
import Home from "./Home.fanxi";
import DashboardLayout from "./DashboardLayout.fanxi";
import DashboardHome from "./DashboardHome.fanxi";
import SettingsLayout from "./SettingsLayout.fanxi";
import SettingsHome from "./SettingsHome.fanxi";
import ProfileSettings from "./ProfileSettings.fanxi";
import Clients from "./Clients.fanxi";
import UserDetail from "./UserDetail.fanxi";
import NotFound from "./NotFound.fanxi";


const router = createRouter({
  "/": Home,
  "/home": Home,
  "/dashboard": {
    "/": DashboardHome,
    "/settings": {
      "/": SettingsHome,
      "/profile": ProfileSettings,
      "/(clients)": Clients,
      layout: SettingsLayout,
    },
    layout: DashboardLayout,
  },
  "/user/:id": UserDetail,
  "/*": NotFound,
});


export default router;



