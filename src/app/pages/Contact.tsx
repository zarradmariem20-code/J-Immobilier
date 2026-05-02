import { FormEvent, useEffect, useMemo, useState } from "react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { saveInquiry } from "../utils/storage";
import { getPublicSiteSettings, type SiteSettings } from "../../lib/api";

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
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    let mounted = true;

    getPublicSiteSettings()
      .then((data) => {
        if (mounted) setSiteSettings(data);
      })
      .catch(() => {
        // Keep existing UI with default fallbacks if settings endpoint is unavailable.
      });

    return () => {
      mounted = false;
    };
  }, []);

  const officeAddressLines = siteSettings?.contact.officeAddressLines ?? ["Bouhsina", "Sousse, Tunisie"];
  const officeMapQuery = siteSettings?.contact.officeMapQuery ?? "Bouhsina Sousse Tunisie";
  const officePhoneDisplay = useMemo(() => {
    if (!siteSettings) return "+216 97 222 822 / +216 27 037 037";
    const primary = siteSettings.contact.primaryPhone?.trim() || "";
    const secondary = siteSettings.contact.secondaryPhone?.trim() || "";
    if (primary && secondary) return `${primary} / ${secondary}`;
    return primary || secondary || "+216 97 222 822";
  }, [siteSettings]);
  const officeEmail = siteSettings?.contact.email ?? "contact@journalimmobilier.tn";
  const openingHours = siteSettings?.contact.openingHours ?? [
    "Lundi - Vendredi : 8h30 - 18h00",
    "Samedi : 9h00 - 14h00",
    "Dimanche : Fermé",
  ];

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

      <section className="bg-[linear-gradient(135deg,#0f172a_0%,#0f3d63_55%,#0ea5e9_100%)] py-12 text-white sm:py-18">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-200 sm:text-sm">Contact</p>
          <h1 className="mt-3 mb-4 font-serif text-4xl font-semibold leading-tight sm:text-5xl">Contactez-nous</h1>
          <p className="max-w-2xl text-base text-blue-100 sm:text-lg">
            Entrez en contact avec notre équipe en Tunisie pour un achat, une location ou une mise en vente
          </p>
        </div>
      </section>

      <section className="bg-[linear-gradient(180deg,#f8fbff_0%,#f2f6fb_100%)] py-10 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
            <div className="space-y-6 sm:space-y-8">
              <div>
                <h2 className="mb-4 font-serif text-2xl font-semibold text-black sm:mb-6 sm:text-3xl">Entrez en contact</h2>
                <p className="mb-6 text-gray-700 sm:mb-8">
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
                      {officeAddressLines[0] ?? ""}<br />
                      {officeAddressLines[1] ?? ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 bg-white p-6 rounded-[28px] shadow-lg">
                  <div className="bg-[#1f5f96] p-3 rounded-lg flex-shrink-0">
                    <Phone className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-black mb-1">Téléphone</h3>
                    <p className="text-gray-600">{officePhoneDisplay}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 bg-white p-6 rounded-[28px] shadow-lg">
                  <div className="bg-[#1f5f96] p-3 rounded-lg flex-shrink-0">
                    <Mail className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-black mb-1">Email</h3>
                    <p className="text-gray-600">{officeEmail}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 bg-white p-6 rounded-[28px] shadow-lg">
                  <div className="bg-[#1f5f96] p-3 rounded-lg flex-shrink-0">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-black mb-1">Horaires d'Ouverture</h3>
                    <p className="text-gray-600">
                      {openingHours.map((line, index) => (
                        <span key={`${line}-${index}`}>
                          {line}
                          {index < openingHours.length - 1 ? <br /> : null}
                        </span>
                      ))}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] bg-white p-5 shadow-lg sm:rounded-[32px] sm:p-8">
              <h2 className="mb-5 font-serif text-2xl font-semibold text-black sm:mb-6 sm:text-3xl">Envoyez-nous un message</h2>
              <form className="space-y-5 sm:space-y-6" onSubmit={handleSubmit}>
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
                      placeholder="Ex : 97 222 822"
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

      <section className="bg-white py-10 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-5 text-center font-serif text-2xl font-semibold text-black sm:mb-6 sm:text-3xl">Visitez notre bureau</h2>
          <div className="overflow-hidden rounded-[24px] border border-slate-200 shadow-lg sm:rounded-[32px]">
            <iframe
              title="Carte du bureau"
              src={`https://www.google.com/maps?q=${encodeURIComponent(officeMapQuery)}&output=embed`}
              className="h-72 w-full sm:h-96"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

          {siteSettings?.bureaus?.length ? (
            <div className="mt-8">
              <h3 className="mb-4 text-center text-xl font-semibold text-slate-900">Nos bureaux</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {siteSettings.bureaus.map((bureau) => (
                  <article key={bureau.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h4 className="text-base font-semibold text-slate-900">{bureau.name || "Bureau"}</h4>
                    <p className="mt-1 text-sm text-slate-600">{bureau.address}</p>
                    <p className="text-sm text-slate-600">{bureau.phone}</p>
                    {bureau.email ? <p className="text-sm text-slate-600">{bureau.email}</p> : null}
                    <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
                      <iframe
                        title={`Carte ${bureau.name || bureau.id}`}
                        src={`https://www.google.com/maps?q=${encodeURIComponent(bureau.mapQuery || bureau.address || "Tunisie")}&output=embed`}
                        className="h-48 w-full"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <Footer />
    </div>
  );
}
