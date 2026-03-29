import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { Award, Users, Target, Heart } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import keyImage from "../../assets/key.png";

export function About() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <section className="bg-[linear-gradient(135deg,#111827_0%,#123a5b_55%,#0ea5e9_100%)] text-white py-18">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-200">À propos</p>
          <h1 className="mt-3 font-serif text-5xl font-semibold mb-4">Une agence pensée pour le marché immobilier tunisien</h1>
          <p className="text-blue-100 text-lg max-w-3xl">
            Votre partenaire de confiance en Tunisie pour la vente, la location et l'investissement résidentiel
          </p>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-serif text-4xl font-semibold text-black mb-6">Notre Histoire</h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  Fondé en 2010, Journal Immobilier accompagne les projets résidentiels et patrimoniaux dans les régions les plus demandées de Tunisie, de Tunis à Hammamet en passant par Sousse et Sfax.
                </p>
                <p>
                  Notre mission est simple : proposer des biens bien présentés, des conseils de terrain et un accompagnement fiable pour chaque vente ou location.
                </p>
                <p>
                  Aujourd'hui, l'agence combine connaissance locale, sélection plus premium et outils modernes pour offrir une expérience plus claire aux acheteurs, vendeurs et locataires.
                </p>
              </div>
            </div>
            <div className="relative h-96 rounded-[32px] overflow-hidden shadow-xl">
              <ImageWithFallback
                src={keyImage}
                alt="Notre Bureau"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-[linear-gradient(180deg,#f8fbff_0%,#f2f6fb_100%)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-serif text-4xl font-semibold text-black mb-4">Nos valeurs fondamentales</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Les principes qui guident tout ce que nous faisons
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center p-6 bg-white rounded-[28px] shadow-lg">
              <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold text-lg text-black mb-2">Excellence</h3>
              <p className="text-gray-600">
                Nous visons l'excellence dans chaque transaction et interaction
              </p>
            </div>
            <div className="text-center p-6 bg-white rounded-[28px] shadow-lg">
              <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold text-lg text-black mb-2">Travail d'Équipe</h3>
              <p className="text-gray-600">
                La collaboration et le soutien définissent notre approche du service client
              </p>
            </div>
            <div className="text-center p-6 bg-white rounded-[28px] shadow-lg">
              <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold text-lg text-black mb-2">Focus</h3>
              <p className="text-gray-600">
                Nous restons concentrés sur ce qui compte le plus - votre succès
              </p>
            </div>
            <div className="text-center p-6 bg-white rounded-[28px] shadow-lg">
              <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold text-lg text-black mb-2">Intégrité</h3>
              <p className="text-gray-600">
                L'honnêteté et la transparence guident chaque décision que nous prenons
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-serif text-4xl font-semibold text-black mb-4">Pourquoi nous choisir</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Nous combinons connaissance du marché tunisien, sélection rigoureuse et présentation moderne pour offrir des résultats plus solides
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-8 rounded-[28px]">
              <div className="text-4xl font-bold text-blue-600 mb-2">15+</div>
              <div className="text-xl font-semibold text-black mb-2">Ans d'Expérience</div>
              <p className="text-gray-600">
                Au service des clients avec dévouement et expertise depuis 2010
              </p>
            </div>
            <div className="bg-gray-50 p-8 rounded-[28px]">
              <div className="text-4xl font-bold text-blue-600 mb-2">1000+</div>
              <div className="text-xl font-semibold text-black mb-2">Clients Satisfaits</div>
              <p className="text-gray-600">
                Familles et particuliers qui ont trouvé la maison de leurs rêves
              </p>
            </div>
            <div className="bg-gray-50 p-8 rounded-[28px]">
              <div className="text-4xl font-bold text-blue-600 mb-2">500+</div>
              <div className="text-xl font-semibold text-black mb-2">Propriétés Listées</div>
              <p className="text-gray-600">
                Un portefeuille diversifié de propriétés premium parmi lesquelles choisir
              </p>
            </div>
          </div>

          <div className="mt-16 grid gap-8 lg:grid-cols-3">
            {[
              {
                image: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
                name: "Amine Ben Salem",
                role: "Direction d'agence",
              },
              {
                image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
                name: "Yassine Trabelsi",
                role: "Conseil investissement",
              },
              {
                image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
                name: "Nour Gharbi",
                role: "Accompagnement acheteurs",
              },
            ].map((member) => (
              <article key={member.name} className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                <ImageWithFallback src={member.image} alt={member.name} className="h-72 w-full object-cover" />
                <div className="p-6">
                  <p className="text-xl font-semibold text-slate-950">{member.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{member.role}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
