import { FormEvent, useState } from "react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { saveInquiry } from "../utils/storage";

export function Contact() {
  const [formState, setFormState] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [feedback, setFeedback] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formState.firstName || !formState.lastName || !formState.email || !formState.message) {
      setFeedback("Merci de renseigner au minimum votre nom, votre email et votre message.");
      return;
    }

    saveInquiry({
      id: `${Date.now()}`,
      fullName: `${formState.firstName} ${formState.lastName}`,
      email: formState.email,
      phone: formState.phone,
      message: `${formState.subject ? `${formState.subject} - ` : ""}${formState.message}`,
      createdAt: new Date().toISOString(),
    });

    setFeedback("Votre message a bien été enregistré. Vous pouvez continuer à tester le site, la demande reste disponible dans le navigateur.");
    setFormState({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      subject: "",
      message: "",
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <section className="bg-[linear-gradient(135deg,#0f172a_0%,#0f3d63_55%,#0ea5e9_100%)] text-white py-18">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-200">Contact</p>
          <h1 className="mt-3 font-serif text-5xl font-semibold mb-4">Contactez-nous</h1>
          <p className="text-blue-100 text-lg">
            Entrez en contact avec notre équipe en Tunisie pour un achat, une location ou une mise en vente
          </p>
        </div>
      </section>

      <section className="py-16 bg-[linear-gradient(180deg,#f8fbff_0%,#f2f6fb_100%)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-8">
              <div>
                <h2 className="font-serif text-3xl font-semibold text-black mb-6">Entrez en contact</h2>
                <p className="text-gray-700 mb-8">
                  Vous avez des questions sur nos propriétés ou services ? Notre équipe est prête à vous assister. 
                  Contactez-nous par l'un des canaux suivants.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4 bg-white p-6 rounded-[28px] shadow-lg">
                  <div className="bg-[#1f5f96] p-3 rounded-lg flex-shrink-0">
                    <MapPin className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-black mb-1">Adresse du Bureau</h3>
                    <p className="text-gray-600">
                      Les Berges du Lac 1<br />
                      Tunis, Tunisie
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 bg-white p-6 rounded-[28px] shadow-lg">
                  <div className="bg-[#1f5f96] p-3 rounded-lg flex-shrink-0">
                    <Phone className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-black mb-1">Téléphone</h3>
                    <p className="text-gray-600">+216 71 123 456</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 bg-white p-6 rounded-[28px] shadow-lg">
                  <div className="bg-[#1f5f96] p-3 rounded-lg flex-shrink-0">
                    <Mail className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-black mb-1">Email</h3>
                    <p className="text-gray-600">contact@journalimmobilier.tn</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 bg-white p-6 rounded-[28px] shadow-lg">
                  <div className="bg-[#1f5f96] p-3 rounded-lg flex-shrink-0">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-black mb-1">Horaires d'Ouverture</h3>
                    <p className="text-gray-600">
                      Lundi - Vendredi : 8h30 - 18h00<br />
                      Samedi : 9h00 - 14h00<br />
                      Dimanche : Fermé
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[32px] p-8 shadow-lg">
              <h2 className="font-serif text-3xl font-semibold text-black mb-6">Envoyez-nous un message</h2>
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prénom
                    </label>
                    <input
                      type="text"
                      value={formState.firstName}
                      onChange={(event) => setFormState((current) => ({ ...current, firstName: event.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      placeholder="Jean"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom
                    </label>
                    <input
                      type="text"
                      value={formState.lastName}
                      onChange={(event) => setFormState((current) => ({ ...current, lastName: event.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      placeholder="Dupont"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adresse Email
                  </label>
                  <input
                    type="email"
                    value={formState.email}
                    onChange={(event) => setFormState((current) => ({ ...current, email: event.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="jean.dupont@exemple.fr"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Numéro de Téléphone
                  </label>
                  <input
                    type="tel"
                    value={formState.phone}
                    onChange={(event) => setFormState((current) => ({ ...current, phone: event.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="01 23 45 67 89"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sujet
                  </label>
                  <input
                    type="text"
                    value={formState.subject}
                    onChange={(event) => setFormState((current) => ({ ...current, subject: event.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="Comment pouvons-nous vous aider ?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message
                  </label>
                  <textarea
                    rows={6}
                    value={formState.message}
                    onChange={(event) => setFormState((current) => ({ ...current, message: event.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="Parlez-nous de vos besoins immobiliers..."
                  ></textarea>
                </div>

                {feedback && (
                  <div className="rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-800">
                    {feedback}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-sky-700 text-white py-4 rounded-lg font-semibold hover:bg-sky-800 transition-colors"
                >
                  Envoyer le Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-3xl font-semibold text-black mb-6 text-center">Visitez notre bureau</h2>
          <div className="overflow-hidden rounded-[32px] border border-slate-200 shadow-lg">
            <iframe
              title="Carte du bureau"
              src="https://www.google.com/maps?q=Les%20Berges%20du%20Lac%201%20Tunis&output=embed"
              className="h-96 w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
