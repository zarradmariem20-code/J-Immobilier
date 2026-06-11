import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router";

const Home = lazy(() => import("./pages/Home").then(m => ({ default: m.Home })));
const Listings = lazy(() => import("./pages/Listings").then(m => ({ default: m.Listings })));
const PropertyDetail = lazy(() => import("./pages/PropertyDetail").then(m => ({ default: m.PropertyDetail })));
const About = lazy(() => import("./pages/About").then(m => ({ default: m.About })));
const Contact = lazy(() => import("./pages/Contact").then(m => ({ default: m.Contact })));
const Admin = lazy(() => import("./pages/Admin").then(m => ({ default: m.Admin })));
const AdminEditListing = lazy(() => import("./pages/AdminEditListing").then(m => ({ default: m.AdminEditListing })));
const SubmitListing = lazy(() => import("./pages/SubmitListing").then(m => ({ default: m.SubmitListing })));
const Account = lazy(() => import("./pages/Account"));
const AuthHandler = lazy(() => import("./pages/AuthHandler"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const Favorites = lazy(() => import("./pages/Favorites"));
const Messages = lazy(() => import("./pages/Messages"));
const Notifications = lazy(() => import("./pages/Notifications"));
const AccountSettings = lazy(() => import("./pages/AccountSettings"));
const LanguageSettings = lazy(() => import("./pages/LanguageSettings"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
    </div>
  );
}

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LazyPage><LoginPage /></LazyPage>,
  },
  {
    path: "/auth-handler",
    element: <LazyPage><AuthHandler /></LazyPage>,
  },
  {
    path: "/",
    element: <LazyPage><Home /></LazyPage>,
  },
  {
    path: "/listings",
    element: <LazyPage><Listings /></LazyPage>,
  },
  {
    path: "/property/:id",
    element: <LazyPage><PropertyDetail /></LazyPage>,
  },
  {
    path: "/about",
    element: <LazyPage><About /></LazyPage>,
  },
  {
    path: "/contact",
    element: <LazyPage><Contact /></LazyPage>,
  },
  {
    path: "/submit-listing",
    element: <LazyPage><SubmitListing /></LazyPage>,
  },
  {
    path: "/admin",
    element: <LazyPage><Admin /></LazyPage>,
  },
  {
    path: "/admin/dashboard",
    element: <LazyPage><Admin /></LazyPage>,
  },
  {
    path: "/admin/listings",
    element: <LazyPage><Admin /></LazyPage>,
  },
  {
    path: "/admin/listings/:listingId/edit",
    element: <LazyPage><AdminEditListing /></LazyPage>,
  },
  {
    path: "/admin/visits",
    element: <LazyPage><Admin /></LazyPage>,
  },
  {
    path: "/admin/contracts",
    element: <LazyPage><Admin /></LazyPage>,
  },
  {
    path: "/admin/checklist",
    element: <LazyPage><Admin /></LazyPage>,
  },
  {
    path: "/admin/settings",
    element: <LazyPage><AdminSettings /></LazyPage>,
  },
  {
    path: "/account",
    element: <LazyPage><Account /></LazyPage>,
  },
  {
    path: "/favorites",
    element: <LazyPage><Favorites /></LazyPage>,
  },
  {
    path: "/messages",
    element: <LazyPage><Messages /></LazyPage>,
  },
  {
    path: "/account/notifications",
    element: <LazyPage><Notifications /></LazyPage>,
  },
  {
    path: "/account/settings",
    element: <LazyPage><AccountSettings /></LazyPage>,
  },
  {
    path: "/account/language",
    element: <LazyPage><LanguageSettings /></LazyPage>,
  },
  {
    path: "/terms-of-service",
    element: <LazyPage><TermsOfService /></LazyPage>,
  },
  {
    path: "/privacy-policy",
    element: <LazyPage><PrivacyPolicy /></LazyPage>,
  },
]);
