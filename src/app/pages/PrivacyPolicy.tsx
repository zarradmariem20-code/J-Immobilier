import { Header } from "../components/Header";
import { Footer } from "../components/Footer";

export default function PrivacyPolicy() {
  return (
    <div className="flex min-h-screen flex-col bg-[linear-gradient(180deg,_#f8fbff_0%,_#ffffff_38%,_#f4f7fb_100%)]">
      <Header />
      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <h1 className="font-serif text-3xl font-semibold text-slate-950 md:text-4xl">Politique de Confidentialité</h1>
          <p className="mt-3 text-sm text-slate-500">Dernière mise à jour : 28 mai 2026</p>

          <div className="mt-10 space-y-8 text-[15px] leading-7 text-slate-700">
            <section>
              <h2 className="mb-2 text-lg font-semibold text-slate-900">1. Collecte des données</h2>
              <p>
                Nous collectons les informations que vous nous fournissez directement lors de votre utilisation du site, notamment :
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>Nom, prénom et coordonnées (email, téléphone) lors de l'inscription</li>
                <li>Informations relatives aux biens immobiliers publiés (description, photos, prix, localisation)</li>
                <li>Données de navigation (pages consultées, durée de visite, appareil utilisé)</li>
                <li>Messages et échanges via le formulaire de contact</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-slate-900">2. Utilisation des données</h2>
              <p>Vos données sont utilisées pour :</p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>Faciliter la publication et la gestion de vos annonces immobilières</li>
                <li>Vous mettre en relation avec des acquéreurs ou locataires potentiels</li>
                <li>Assurer le suivi des demandes de visite et de contact</li>
                <li>Améliorer nos services et l'expérience utilisateur</li>
                <li>Vous envoyer des notifications liées à votre compte et à vos annonces</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-slate-900">3. Partage des données</h2>
              <p>
                Vos données personnelles ne sont jamais vendues à des tiers. Elles peuvent être partagées uniquement dans les cas suivants :
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>Avec votre consentement explicite</li>
                <li>Pour répondre à une obligation légale ou réglementaire</li>
                <li>Avec nos prestataires techniques (hébergement, base de données) dans le cadre strict de nos services</li>
                <li>Pour publier vos annonces sur les réseaux sociaux (Facebook, Instagram, TikTok) si vous avez activé cette option lors de la validation</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-slate-900">4. Cookies</h2>
              <p>
                Le site utilise des cookies techniques nécessaires à son fonctionnement (session, préférences). Nous n'utilisons pas de cookies publicitaires ou de suivi tiers. Vous pouvez gérer les cookies via les paramètres de votre navigateur.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-slate-900">5. Sécurité des données</h2>
              <p>
                Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données personnelles contre tout accès non autorisé, altération, divulgation ou destruction. Vos données sont hébergées sur des serveurs sécurisés (Supabase) situés dans l'Union européenne.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-slate-900">6. Vos droits</h2>
              <p>Conformément à la législation tunisienne sur la protection des données, vous disposez des droits suivants :</p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li><strong>Droit d'accès</strong> : obtenir une copie de vos données personnelles</li>
                <li><strong>Droit de rectification</strong> : corriger les données inexactes</li>
                <li><strong>Droit de suppression</strong> : demander la suppression de vos données</li>
                <li><strong>Droit d'opposition</strong> : vous opposer au traitement de vos données</li>
              </ul>
              <p className="mt-2">
                Pour exercer ces droits, contactez-nous à : <strong>contact@journalimmobilier.tn</strong>
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-slate-900">7. Conservation des données</h2>
              <p>
                Vos données personnelles sont conservées pendant la durée de votre compte actif. En cas de suppression de compte, vos données sont supprimées dans un délai maximum de 30 jours, à l'exception des données que nous sommes tenus de conserver par obligation légale.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-slate-900">8. Contact</h2>
              <p>
                Pour toute question relative à cette politique de confidentialité, contactez-nous à : <strong>contact@journalimmobilier.tn</strong> ou par téléphone au <strong>+216 97 222 822</strong>.
              </p>
            </section>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
