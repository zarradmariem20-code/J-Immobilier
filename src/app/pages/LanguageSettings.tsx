import { useState } from "react";
import { Languages } from "lucide-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { getPreferredLanguage, setPreferredLanguage } from "../utils/storage";

export default function LanguageSettings() {
  const [language, setLanguage] = useState<"fr" | "en">(getPreferredLanguage());

  const chooseLanguage = (next: "fr" | "en") => {
    setPreferredLanguage(next);
    setLanguage(next);
  };

  const buttonClass = (value: "fr" | "en") =>
    `rounded-2xl border px-4 py-3 text-left transition ${
      language === value
        ? "border-sky-300 bg-sky-50 text-sky-800"
        : "border-slate-200 bg-white text-slate-700 hover:border-sky-200"
    }`;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f8fbff] to-[#f3f6fb]">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-2 text-slate-900">
            <Languages className="h-5 w-5 text-sky-600" />
            <h1 className="text-2xl font-semibold">Langue</h1>
          </div>
          <div className="grid gap-3">
            <button type="button" className={buttonClass("fr")} onClick={() => chooseLanguage("fr")}>
              Francais
            </button>
            <button type="button" className={buttonClass("en")} onClick={() => chooseLanguage("en")}>
              English
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
