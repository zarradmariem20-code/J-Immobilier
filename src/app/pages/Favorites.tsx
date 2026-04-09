import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Clock3, Heart } from "lucide-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { PropertyCard } from "../components/PropertyCard";
import { getFavoriteHistory } from "../utils/storage";
import type { Property } from "../data/properties";
import { getProperties } from "../../lib/api";
import { supabase } from "../../lib/supabase";

interface FavoriteEntry {
  property: Property;
  savedAt: string;
}

function mapProperty(item: any): Property {
  return {
    id: item.id,
    title: item.title,
    price: item.price,
    transactionType: item.transaction_type,
    location: item.location,
    mapLocationQuery: item.map_location_query,
    nearbyCommodities: item.nearby_commodities ?? [],
    bedrooms: item.bedrooms,
    bathrooms: item.bathrooms,
    area: item.area,
    type: item.type,
    image: item.image,
    gallery: item.gallery ?? [],
    description: item.description ?? "",
    features: item.features ?? [],
    tags: item.tags ?? [],
    featured: Boolean(item.featured),
  };
}

export default function Favorites() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const ensureAuthAndLoad = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/login");
        return;
      }

      const history = getFavoriteHistory();
      if (history.length === 0) {
        if (isMounted) {
          setFavorites([]);
          setLoading(false);
        }
        return;
      }

      try {
        const rows = await getProperties({ limit: 200 });
        const byId = new Map<number, Property>(rows.map((item: any) => [item.id, mapProperty(item)]));
        const entries = history
          .map((entry) => {
            const property = byId.get(entry.propertyId);
            if (!property) {
              return null;
            }
            return { property, savedAt: entry.savedAt };
          })
          .filter((entry): entry is FavoriteEntry => entry !== null);

        if (isMounted) {
          setFavorites(entries);
        }
      } catch {
        if (isMounted) {
          setFavorites([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    ensureAuthAndLoad();

    const sync = () => ensureAuthAndLoad();
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);

    return () => {
      isMounted = false;
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-[linear-gradient(180deg,#f4f8ff_0%,#f8fbff_42%,#ffffff_100%)]">
      <Header />
      <main className="flex-1">
        <section className="border-b border-sky-100 bg-white/75 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600">Historique</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">Articles sauvegardes</h1>
            <p className="mt-2 text-slate-600">Retrouvez vos biens likes et la date de sauvegarde.</p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-600">Chargement de vos favoris...</div>
          ) : favorites.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <Heart className="mx-auto h-7 w-7 text-slate-400" />
              <p className="mt-4 text-slate-700">Aucun article sauvegarde pour le moment.</p>
              <Link
                to="/listings"
                className="mt-5 inline-flex items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-sky-200 hover:text-sky-700"
              >
                Voir les annonces
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {favorites.map(({ property, savedAt }) => (
                <div key={property.id} className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                    <Clock3 className="h-3.5 w-3.5" />
                    Sauvegarde le {new Date(savedAt).toLocaleDateString("fr-FR")}
                  </div>
                  <PropertyCard property={property} />
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
