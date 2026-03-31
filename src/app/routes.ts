import { createBrowserRouter } from "react-router";
import { Home } from "./pages/Home";
import { Listings } from "./pages/Listings";
import { PropertyDetail } from "./pages/PropertyDetail";
import { About } from "./pages/About";
import { Contact } from "./pages/Contact";
import { Admin } from "./pages/Admin";
import { SubmitListing } from "./pages/SubmitListing";
import Account from "./pages/Account";
import AuthHandler from "./pages/AuthHandler";
import LoginPage from "./pages/LoginPage";

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
    path: "/account",
    Component: Account,
  },
]);
