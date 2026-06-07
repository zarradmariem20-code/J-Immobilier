import { Header } from "../components/Header";
import { Footer } from "../components/Footer";

export default function TermsOfService() {
  return (
    <div className="flex min-h-screen flex-col bg-[linear-gradient(180deg,_#f8fbff_0%,_#ffffff_38%,_#f4f7fb_100%)]">
      <Header />
      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <h1 className="font-serif text-3xl font-semibold text-slate-950 md:text-4xl">Conditions Générales d'Utilisation</h1>
          <p className="mt-3 text-sm text-slate-500">Dernière mise à jour : 28 mai 2026</p>

          <div className="mt-10 space-y-8 text-[15px] leading-7 text-slate-700">
            <section>
              <h2 className="mb-2 text-lg font-semibold text-slate-900">1. Acceptation des conditions</h2>
              <p>
                En accédant et en utilisant le site <strong>Journal Immobilier</strong> (journalimmobilier.tn), vous acceptez sans réserve les présentes conditions générales d'utilisation. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser le site.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-slate-900">2. Description du service</h2>
              <p>
                Journal Immobilier est une plateforme immobilière tunisienne permettant aux utilisateurs de consulter, publier et rechercher des annonces immobilières (vente et location). Le site offre également des services d'accompagnement dans les démarches d'acquisition et de vente de biens immobiliers.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-slate-900">3. Inscription et compte utilisateur</h2>
              <p>
                L'utilisation de certaines fonctionnalités du site (publication d'annonces, sauvegarde de favoris, prise de rendez-vous) nécessite la création d'un compte. Vous vous engagez à fournir des informations exactes et à maintenir la confidentialité de vos identifiants. Vous êtes responsable de toutes les activités effectuées sous votre compte.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-slate-900">4. Publications et annonces</h2>
              <p>
                Les annonces publiées sur le site sont soumises à une validation par notre équipe avant publication. Journal Immobilier se réserve le droit de modifier, refuser ou supprimer任何annonce qui ne respecte pas nos standards de qualité ou qui contient des informations inexactes ou trompeuses.
              </p>
              <p className="mt-2">
                En publiant une annonce, vous confirmez être propriétaire ou mandataire autorisé du bien concerné et garantissez l'exactitude des informations fournies.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-slate-900">5. Utilisation acceptable</h2>
              <p>Vous vous engagez à ne pas :</p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>Utiliser le site à des fins illégales ou non autorisées</li>
                <li>Publier des contenus faux, trompeurs ou frauduleux</li>
                <li>Tester ou tenter de contourner les mesures de sécurité du site</li>
                <li>Collecter ou extraire les données d'autres utilisateurs sans leur consentement</li>
                <li>Usurper l'identité d'une autre personne ou entité</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-slate-900">6. Propriété intellectuelle</h2>
              <p>
                L'ensemble du contenu du site (textes, images, logos, graphismes, logiciels) est la propriété de Journal Immobilier ou de ses partenaires et est protégé par les lois tunisiennes et internationales relatives à la propriété intellectuelle. Toute reproduction, même partielle, est interdite sans autorisation préalable.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-slate-900">7. Limitation de responsabilité</h2>
              <p>
                Journal Immobilier agit en tant qu'intermédiaire entre les vendeurs et les acheteurs/locataires. Nous ne sommes pas partie aux transactions entre utilisateurs. Les informations publiées sur le site sont fournies à titre indicatif et ne constituent pas une garantie quant à la qualité, la légalité ou l'exactitude des biens proposés.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-slate-900">8. Modification des conditions</h2>
              <p>
                Journal Immobilier se réserve le droit de modifier ces conditions à tout moment. Les modifications prennent effet dès leur publication sur le site. Il est recommandé de consulter régulièrement cette page.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold text-slate-900">9. Contact</h2>
              <p>
                Pour toute question relative aux présentes conditions, vous pouvez nous contacter à l'adresse : <strong>contact@journalimmobilier.tn</strong> ou par téléphone au <strong>+216 97 222 822</strong>.
              </p>
            </section>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
