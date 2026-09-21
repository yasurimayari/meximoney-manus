import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { PfiProgress } from "./PfiProgress";
import { emptyPfiAnswers } from "./pfiTypes";
import type { PfiAnswers } from "./pfiTypes";
import {
  ScreenBasics,
  ScreenBusinesses,
  ScreenChannels,
  ScreenClosing,
  ScreenCommunicationStyle,
  ScreenCountriesCurrencies,
  ScreenCreateFirstAccount,
  ScreenDebtsAccountsPulse,
  ScreenGoals,
  ScreenIncomeSources,
  ScreenKnowledge,
  ScreenOccupation,
  ScreenPrivacy,
  ScreenRiskProfile,
  ScreenTaxSituation,
  ScreenWelcome,
} from "./screens";
import { dashboardPeriodQuery } from "@/lib/dashboardPeriod";

type ScreenKey = "welcome" | "basics" | "knowledge" | "occupation" | "countries" | "income" | "businesses" | "debtsAccounts" | "taxSituation" | "risk" | "goals" | "communication" | "channels" | "privacy" | "closing";

const SCREEN_ORDER: ScreenKey[] = ["welcome", "basics", "knowledge", "occupation", "countries", "income", "businesses", "debtsAccounts", "taxSituation", "risk", "goals", "communication", "channels", "privacy", "closing"];

function visibleScreens(answers: PfiAnswers): ScreenKey[] {
  const declaresBusiness = answers.occupationTags.includes("business");
  const declaresSelfEmployed = answers.occupationTags.includes("self_employed");
  return SCREEN_ORDER.filter(key => {
    if (key === "businesses") return declaresBusiness;
    if (key === "taxSituation") return declaresBusiness || declaresSelfEmployed;
    return true;
  });
}

export default function PfiOnboarding() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { data: workspace, isLoading } = trpc.finance.workspace.get.useQuery();
  const profile = workspace?.profile;

  const [answers, setAnswers] = useState<PfiAnswers>(() => emptyPfiAnswers());
  const [index, setIndex] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Una usuaria nueva todavía no tiene fila en financialProfiles (profile es
    // null) -- eso no significa "sigue cargando", significa "no hay nada que
    // precargar". Espera solo a que la consulta de workspace termine.
    if (hydrated || isLoading) return;
    if (profile) {
      setAnswers(emptyPfiAnswers({
        displayName: profile.displayName ?? user?.name ?? "",
        avatarUrl: profile.avatarUrl ?? "",
        financialKnowledgeLevel: profile.financialKnowledgeLevel ?? null,
        occupationTags: profile.occupationTags ?? [],
        residenceCountries: profile.residenceCountries ?? (profile.residenceCountry ? [profile.residenceCountry] : []),
        activeCurrencies: profile.activeCurrencies ?? (profile.currency ? [profile.currency] : []),
        incomeSourceTags: profile.incomeSourceTags ?? [],
        hasActiveDebtsDeclared: profile.hasActiveDebtsDeclared ?? null,
        approxDebtCount: profile.approxDebtCount ?? null,
        approxAccountCount: profile.approxAccountCount ?? null,
        taxRegime: profile.taxRegime && profile.taxRegime !== "not_applicable" ? profile.taxRegime : null,
        riskScenario1Answer: profile.riskScenario1Answer ?? null,
        riskScenario2Answer: profile.riskScenario2Answer ?? null,
        communicationStyle: profile.communicationStyle ?? null,
      }));
      setIndex(Math.min(profile.onboardingStep ?? 0, SCREEN_ORDER.length - 1));
    } else {
      setAnswers(emptyPfiAnswers({ displayName: user?.name ?? "" }));
    }
    setHydrated(true);
  }, [hydrated, isLoading, profile, user?.name]);

  const screens = useMemo(() => visibleScreens(answers), [answers]);
  const currentKey = screens[Math.min(index, screens.length - 1)] ?? "welcome";

  const saveStep = trpc.finance.workspace.pfi.saveStep.useMutation();
  const complete = trpc.finance.workspace.pfi.complete.useMutation();
  const uploadAvatar = trpc.finance.workspace.pfi.uploadAvatar.useMutation();
  const saveFirstAccount = trpc.finance.accounts.save.useMutation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedModules, setCompletedModules] = useState<string[] | null>(null);
  const [creatingFirstAccount, setCreatingFirstAccount] = useState(false);
  const [firstAccountName, setFirstAccountName] = useState("Cuenta principal");
  const [firstAccountCurrency, setFirstAccountCurrency] = useState("");

  // Solo se necesita una vez que se muestra la pantalla de cierre, para saber
  // si hay que ofrecer crear la primera cuenta antes de importar un estado.
  const { data: closingDashboard, isLoading: closingDashboardLoading } = trpc.finance.dashboard.useQuery(dashboardPeriodQuery, { enabled: currentKey === "closing" && Boolean(completedModules) });
  const hasAccounts = (closingDashboard?.accounts?.length ?? 0) > 0;

  const update = (patch: Partial<PfiAnswers>) => setAnswers(current => ({ ...current, ...patch }));

  const patchForStep = (key: ScreenKey): Record<string, unknown> => {
    switch (key) {
      case "basics": return { displayName: answers.displayName };
      case "knowledge": return answers.financialKnowledgeLevel ? { financialKnowledgeLevel: answers.financialKnowledgeLevel } : {};
      case "occupation": return { occupationTags: answers.occupationTags };
      case "countries": return { residenceCountry: answers.residenceCountries[0], residenceCountries: answers.residenceCountries, currency: answers.activeCurrencies[0], activeCurrencies: answers.activeCurrencies };
      case "income": return { incomeSourceTags: answers.incomeSourceTags };
      case "debtsAccounts": return { hasActiveDebtsDeclared: answers.hasActiveDebtsDeclared ?? undefined, approxDebtCount: answers.approxDebtCount, approxAccountCount: answers.approxAccountCount };
      case "taxSituation": return answers.taxRegime ? { taxRegime: answers.taxRegime } : {};
      case "risk": return answers.riskScenario1Answer && answers.riskScenario2Answer ? { riskScenario1Answer: answers.riskScenario1Answer, riskScenario2Answer: answers.riskScenario2Answer } : {};
      case "communication": return answers.communicationStyle ? { communicationStyle: answers.communicationStyle } : {};
      default: return {};
    }
  };

  const goNext = async () => {
    setIsSubmitting(true);
    try {
      const nextIndex = index + 1;

      if (currentKey === "privacy") {
        if (!answers.consentAccepted) { toast.error("Confirma que entiendes cómo se guarda tu información para continuar."); setIsSubmitting(false); return; }
        const businesses = answers.businesses.filter(business => business.name.trim().length > 0).map(business => ({ name: business.name.trim(), activityDescription: business.activityDescription.trim() || null, countryCode: business.countryCode, functionalCurrency: answers.activeCurrencies[0] || "MXN" }));
        const goals = answers.goals.filter(goal => goal.name.trim().length > 0 && goal.targetCents > 0).map(goal => ({ name: goal.name.trim(), targetCents: goal.targetCents, targetDate: goal.targetDate, currency: answers.activeCurrencies[0] || "MXN" }));
        const result = await complete.mutateAsync({ businesses, goals, channels: answers.channels });
        // No invalida finance.workspace.get todavía: en cuanto onboardingCompleted
        // sea true, DashboardLayout deja de renderizar este componente y la
        // pantalla de cierre (con el resumen de módulos) nunca llegaría a verse.
        // Se invalida recién al salir, en finish()/goToAccounts().
        setCompletedModules(result.activeModules);
        setIndex(nextIndex);
        setIsSubmitting(false);
        return;
      }

      const patch = patchForStep(currentKey);
      await saveStep.mutateAsync({ step: nextIndex, patch });

      setIndex(nextIndex);
    } catch (error: any) {
      toast.error(error?.message || "No se pudo guardar. Intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const goBack = () => setIndex(current => Math.max(0, current - 1));

  const finish = async () => {
    await utils.finance.workspace.get.invalidate();
    await utils.finance.notifications.get.invalidate();
    await utils.finance.dashboard.invalidate();
    setLocation("/");
  };

  const goToAccounts = async () => {
    await utils.finance.workspace.get.invalidate();
    await utils.finance.notifications.get.invalidate();
    await utils.finance.dashboard.invalidate();
    setLocation("/cuentas?importar=1");
  };

  const startCreatingFirstAccount = () => {
    setFirstAccountCurrency(answers.activeCurrencies[0] || "MXN");
    setCreatingFirstAccount(true);
  };

  const createFirstAccountAndContinue = async () => {
    if (!firstAccountName.trim()) { toast.error("Ponle un nombre a tu cuenta para continuar."); return; }
    setIsSubmitting(true);
    try {
      await saveFirstAccount.mutateAsync({ name: firstAccountName.trim(), type: "bank", scope: "personal", currency: (firstAccountCurrency || "MXN").toUpperCase(), currentValueCents: 0, isLiquid: true, valuationDate: Date.now(), status: "active", notes: null });
      await goToAccounts();
    } catch (error: any) {
      toast.error(error?.message || "No se pudo crear la cuenta.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAvatarSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 1_000_000) { toast.error("Usa PNG, JPEG o WebP de hasta 1 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      uploadAvatar.mutate({ dataUrl: reader.result }, {
        onSuccess: result => update({ avatarUrl: result.url }),
        onError: error => toast.error(error.message || "No se pudo subir la foto."),
      });
    };
    reader.readAsDataURL(file);
  };

  if (isLoading || !hydrated) return <main className="pfi-page"><div className="pfi-shell"><p className="pfi-hint">Cargando…</p></div></main>;

  const canAdvance = (() => {
    switch (currentKey) {
      case "basics": return answers.displayName.trim().length > 0;
      case "knowledge": return Boolean(answers.financialKnowledgeLevel);
      case "occupation": return answers.occupationTags.length > 0;
      case "countries": return answers.residenceCountries.length > 0 && answers.activeCurrencies.length > 0;
      case "income": return answers.incomeSourceTags.length > 0;
      case "risk": return Boolean(answers.riskScenario1Answer && answers.riskScenario2Answer);
      case "communication": return Boolean(answers.communicationStyle);
      case "privacy": return answers.consentAccepted;
      default: return true;
    }
  })();

  if (currentKey === "closing" && completedModules) {
    if (creatingFirstAccount) {
      return (
        <main className="pfi-page">
          <div className="pfi-shell">
            <ScreenCreateFirstAccount name={firstAccountName} currency={firstAccountCurrency} onNameChange={setFirstAccountName} onCurrencyChange={setFirstAccountCurrency} />
            <div className="pfi-actions">
              <Button type="button" variant="ghost" onClick={() => setCreatingFirstAccount(false)} disabled={isSubmitting}>Volver</Button>
              <Button type="button" className="bg-[#0058FD] text-white hover:bg-[#0047d1]" onClick={createFirstAccountAndContinue} disabled={isSubmitting || !firstAccountName.trim()}>{isSubmitting ? "Creando…" : "Crear cuenta y continuar"}</Button>
            </div>
          </div>
        </main>
      );
    }
    return (
      <main className="pfi-page">
        <div className="pfi-shell">
          <ScreenClosing answers={answers} update={update} userName={answers.displayName} activeModules={completedModules} hasAccounts={closingDashboardLoading ? undefined : hasAccounts} />
          <div className="pfi-actions">
            {closingDashboardLoading ? (
              <span className="pfi-hint">Preparando tu panel…</span>
            ) : hasAccounts ? (
              <Button type="button" variant="outline" onClick={goToAccounts}>Subir estado de cuenta</Button>
            ) : (
              <Button type="button" variant="outline" onClick={startCreatingFirstAccount}>Crear mi primera cuenta</Button>
            )}
            <Button type="button" className="bg-[#0058FD] text-white hover:bg-[#0047d1]" onClick={finish}>Ir a mi panel</Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="pfi-page">
      <div className="pfi-shell">
        <PfiProgress current={index} total={screens.length} />
        {currentKey === "welcome" ? <ScreenWelcome answers={answers} update={update} userName={answers.displayName || user?.name || ""} /> : null}
        {currentKey === "basics" ? <ScreenBasics answers={answers} update={update} userName="" onAvatarSelected={handleAvatarSelected} /> : null}
        {currentKey === "knowledge" ? <ScreenKnowledge answers={answers} update={update} userName="" /> : null}
        {currentKey === "occupation" ? <ScreenOccupation answers={answers} update={update} userName="" /> : null}
        {currentKey === "countries" ? <ScreenCountriesCurrencies answers={answers} update={update} userName="" /> : null}
        {currentKey === "income" ? <ScreenIncomeSources answers={answers} update={update} userName="" /> : null}
        {currentKey === "businesses" ? <ScreenBusinesses answers={answers} update={update} userName="" /> : null}
        {currentKey === "debtsAccounts" ? <ScreenDebtsAccountsPulse answers={answers} update={update} userName="" /> : null}
        {currentKey === "taxSituation" ? <ScreenTaxSituation answers={answers} update={update} userName="" /> : null}
        {currentKey === "risk" ? <ScreenRiskProfile answers={answers} update={update} userName="" /> : null}
        {currentKey === "goals" ? <ScreenGoals answers={answers} update={update} userName="" /> : null}
        {currentKey === "communication" ? <ScreenCommunicationStyle answers={answers} update={update} userName="" /> : null}
        {currentKey === "channels" ? <ScreenChannels answers={answers} update={update} userName="" /> : null}
        {currentKey === "privacy" ? <ScreenPrivacy answers={answers} update={update} userName="" /> : null}
        {currentKey === "closing" ? <ScreenClosing answers={answers} update={update} userName={answers.displayName} activeModules={null} /> : null}

        <div className="pfi-actions">
          {index > 0 ? <Button type="button" variant="ghost" onClick={goBack} disabled={isSubmitting}>Volver</Button> : <span />}
          <Button type="button" className="bg-[#0058FD] text-white hover:bg-[#0047d1]" onClick={goNext} disabled={!canAdvance || isSubmitting}>{isSubmitting ? "Guardando…" : currentKey === "privacy" ? "Aceptar y continuar" : "Continuar"}</Button>
        </div>
      </div>
    </main>
  );
}
