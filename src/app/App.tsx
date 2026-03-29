import { useEffect } from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";

export default function App() {
  useEffect(() => {
    let previousLocationKey = `${router.state.location.pathname}${router.state.location.search}`;

    const unsubscribe = router.subscribe((state) => {
      const nextLocationKey = `${state.location.pathname}${state.location.search}`;

      if (nextLocationKey !== previousLocationKey) {
        window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
        previousLocationKey = nextLocationKey;
      }
    });

    return unsubscribe;
  }, []);

  return <RouterProvider router={router} />;
}
