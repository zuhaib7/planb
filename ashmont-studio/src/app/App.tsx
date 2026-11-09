import { lazy, Suspense, useEffect } from "react";
import { HashRouter, Route, Routes } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { initI18n } from "../i18n";
import { useSettings } from "../lib/settings";
import { Layout } from "./Layout";
import { LanguageGate } from "./LanguageGate";
import { NotFound } from "./NotFound";
import { HomePage } from "../features/home/HomePage";

// Route-level code splitting: only Home ships in the entry chunk.
const ProjectsPage = lazy(() => import("../features/projects/ProjectsPage").then((m) => ({ default: m.ProjectsPage })));
const ProjectDetailPage = lazy(() => import("../features/projects/ProjectDetailPage").then((m) => ({ default: m.ProjectDetailPage })));
const ServicesPage = lazy(() => import("../features/services/ServicesPage").then((m) => ({ default: m.ServicesPage })));
const InsightsPage = lazy(() => import("../features/insights/InsightsPage").then((m) => ({ default: m.InsightsPage })));
const ConsultationPage = lazy(() => import("../features/consultation/ConsultationPage").then((m) => ({ default: m.ConsultationPage })));
const AboutPage = lazy(() => import("../features/about/AboutPage").then((m) => ({ default: m.AboutPage })));
const ContactPage = lazy(() => import("../features/contact/ContactPage").then((m) => ({ default: m.ContactPage })));
const SettingsPage = lazy(() => import("../features/settings/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const StudioPage = lazy(() => import("../features/studio/StudioPage").then((m) => ({ default: m.StudioPage })));
const PrivacyPage = lazy(() => import("../features/settings/PrivacyPage").then((m) => ({ default: m.PrivacyPage })));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 5 * 60_000, networkMode: "offlineFirst" } } });

initI18n(useSettings.getState().language);

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Suspense fallback={<div role="status" aria-label="…" className="min-h-[50vh]" />}><Layout /></Suspense>}>
        <Route index element={<HomePage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:slug" element={<ProjectDetailPage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="studio" element={<StudioPage />} />
        <Route path="insights" element={<InsightsPage />} />
        <Route path="consultation" element={<ConsultationPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export function App() {
  const { language, languageChosen, theme, reducedMotion } = useSettings();

  useEffect(() => { initI18n(language); }, [language]);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") delete root.dataset.theme; else root.dataset.theme = theme;
  }, [theme]);
  useEffect(() => { document.documentElement.dataset.reducedMotion = String(reducedMotion); }, [reducedMotion]);

  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion={reducedMotion ? "always" : "user"}>
        {languageChosen ? <HashRouter><AppRoutes /></HashRouter> : <LanguageGate />}
      </MotionConfig>
    </QueryClientProvider>
  );
}
