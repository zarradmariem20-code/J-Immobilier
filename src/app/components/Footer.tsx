import { Facebook, Instagram, Twitter, Mail, Phone, MapPin } from "lucide-react";
import { Link } from "react-router";
import { BrandLogo } from "./BrandLogo";

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      <div className="absolute -top-24 right-0 h-64 w-64 rounded-full bg-sky-500/15 blur-3xl" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          <div className="space-y-5 md:col-span-1">
            <BrandLogo dark />
            <p className="max-w-sm text-sm leading-6 text-slate-300">
              Une sélection immobilière tunisienne plus premium, des conseils précis et un accompagnement humain du premier appel jusqu'à la signature.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-slate-400 transition-colors hover:text-sky-300" aria-label="Facebook">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-slate-400 transition-colors hover:text-sky-300" aria-label="Instagram">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-slate-400 transition-colors hover:text-sky-300" aria-label="Twitter">
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-slate-200">Navigation</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/" className="text-sm text-slate-400 transition-colors hover:text-white">
                  Accueil
                </Link>
              </li>
              <li>
                <Link to="/listings" className="text-sm text-slate-400 transition-colors hover:text-white">
                  Annonces
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-sm text-slate-400 transition-colors hover:text-white">
                  À Propos
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-sm text-slate-400 transition-colors hover:text-white">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-slate-200">Services</h3>
            <ul className="space-y-3 text-sm text-slate-400">
              <li>Acquisition résidentielle et prestige</li>
              <li>Mandat de vente et mise en valeur</li>
              <li>Locations longue et courte durée</li>
              <li>Recherche sur-mesure par région</li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-slate-200">Coordonnées</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm text-slate-400">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Les Berges du Lac 1, Tunis, Tunisie</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-400">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <span>+216 71 123 456</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-400">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <span>contact@journalimmobilier.tn</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-8 text-center text-sm text-slate-400">
          <p>&copy; 2026 Journal Immobilier. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
}