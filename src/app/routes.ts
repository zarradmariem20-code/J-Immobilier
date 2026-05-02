import { createBrowserRouter } from "react-router";
import { Home } from "./pages/Home";
import { Listings } from "./pages/Listings";
import { PropertyDetail } from "./pages/PropertyDetail";
import { About } from "./pages/About";
import { Contact } from "./pages/Contact";
import { Admin } from "./pages/Admin";
import { AdminEditListing } from "./pages/AdminEditListing";
import { SubmitListing } from "./pages/SubmitListing";
import Account from "./pages/Account";
import AuthHandler from "./pages/AuthHandler";
import LoginPage from "./pages/LoginPage";
import Favorites from "./pages/Favorites";
import Messages from "./pages/Messages";
import Notifications from "./pages/Notifications";
import AccountSettings from "./pages/AccountSettings";
import LanguageSettings from "./pages/LanguageSettings";
import AdminSettings from "./pages/AdminSettings";

export const router = createBrowserRouter([
      {
        path: "/login",
        Component: LoginPage,
      },
    {
      path: "/auth-handler",
      Component: AuthHandler,
    },
  {
    path: "/",
    Component: Home,
  },
  {
    path: "/listings",
    Component: Listings,
  },
  {
    path: "/property/:id",
    Component: PropertyDetail,
  },
  {
    path: "/about",
    Component: About,
  },
  {
    path: "/contact",
    Component: Contact,
  },
  {
    path: "/submit-listing",
    Component: SubmitListing,
  },
  {
    path: "/admin",
    Component: Admin,
  },
  {
    path: "/admin/dashboard",
    Component: Admin,
  },
  {
    path: "/admin/listings",
    Component: Admin,
  },
  {
    path: "/admin/listings/:listingId/edit",
    Component: AdminEditListing,
  },
  {
    path: "/admin/visits",
    Component: Admin,
  },
  {
    path: "/admin/contracts",
    Component: Admin,
  },
  {
    path: "/admin/checklist",
    Component: Admin,
  },
  {
    path: "/admin/settings",
    Component: AdminSettings,
  },
  {
    path: "/account",
    Component: Account,
  },
  {
    path: "/favorites",
    Component: Favorites,
  },
  {
    path: "/messages",
    Component: Messages,
  },
  {
    path: "/account/notifications",
    Component: Notifications,
  },
  {
    path: "/account/settings",
    Component: AccountSettings,
  },
  {
    path: "/account/language",
    Component: LanguageSettings,
  },
]);
