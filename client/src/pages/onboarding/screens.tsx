import type { ChangeEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichiBubble } from "./RichiBubble";
import { MultiSelectChips } from "./MultiSelectChips";
import { COUNTRY_OPTIONS, CURRENCY_OPTIONS, INCOME_SOURCE_OPTIONS, OCCUPATION_OPTIONS, RISK_SCENARIO_OPTIONS } from "./pfiTypes";
import type { PfiAnswers } from "./pfiTypes";

export type ScreenProps = {
  answers: PfiAnswers;
  update: (patch: Partial<PfiAnswers>) => void;
  userName: string;
};

function toggleInList(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter(item => item !== value) : [...list, value];
}

export function ScreenWelcome({ userName }: ScreenProps) {
  return (
    <RichiBubble>
      <p>¡Hola{userName ? `, ${userName}` : ""}! Soy Richi. Te voy a hacer algunas preguntas para conocerte — toma unos minutos, y puedes pausar y seguir después cuando quieras.</p>
      <p className="mt-3">Al terminar vas a ver tu situación financiera clara, en un solo lugar.</p>
    </RichiBubble>
  );
}

export function ScreenBasics({ answers, update, onAvatarSelected }: ScreenProps & { onAvatarSelected: (event: ChangeEvent<HTMLInputElement>) => void }) {
  const initials = (answers.displayName || "R").trim().slice(0, 2).toUpperCase();
  return (
    <>
      <RichiBubble><p>Para empezar, ¿cómo quieres que te hable?</p></RichiBubble>
      <div className="pfi-field-group">
        <div className="pfi-avatar-row">
          <label className="pfi-avatar-preview">
            {answers.avatarUrl ? <img src={answers.avatarUrl} alt="Foto de perfil" /> : <span>{initials}</span>}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={onAvatarSelected} />
          </label>
          <div className="pfi-field-group">
            <Label>Nombre</Label>
            <Input value={answers.displayName} onChange={event => update({ displayName: event.target.value })} placeholder="Ej. Yasuri" />
            <p className="pfi-hint">La foto es opcional — toca el círculo para subir una. Se puede cambiar después en Configuración.</p>
          </div>
        </div>
      </div>
    </>
  );
}

export function ScreenKnowledge({ answers, update }: ScreenProps) {
  const options = [
    { value: "beginner", label: "Apenas estoy aprendiendo sobre finanzas" },
    { value: "intermediate", label: "Entiendo lo básico, pero a veces me pierdo con términos técnicos" },
    { value: "advanced", label: "Manejo mis finanzas con soltura y entiendo el lenguaje financiero" },
  ] as const;
  return (
    <>
      <RichiBubble><p>¿Cómo describirías tu relación con las finanzas hoy? No hay respuesta incorrecta — esto solo ajusta cómo te explico las cosas de aquí en adelante.</p></RichiBubble>
      <div className="pfi-option-list">
        {options.map(option => (
          <button key={option.value} type="button" className={answers.financialKnowledgeLevel === option.value ? "pfi-option is-selected" : "pfi-option"} onClick={() => update({ financialKnowledgeLevel: option.value })}>
            {option.label}
          </button>
        ))}
      </div>
    </>
  );
}

export function ScreenOccupation({ answers, update }: ScreenProps) {
  return (
    <>
      <RichiBubble><p>¿Cuál es tu situación hoy? Puedes elegir más de una.</p></RichiBubble>
      <MultiSelectChips options={OCCUPATION_OPTIONS} selected={answers.occupationTags} onToggle={value => update({ occupationTags: toggleInList(answers.occupationTags, value) })} />
    </>
  );
}

export function ScreenCountriesCurrencies({ answers, update }: ScreenProps) {
  return (
    <>
      <RichiBubble><p>¿En qué países tienes tu vida financiera, y en qué monedas manejas dinero regularmente? El primero que elijas en cada lista lo uso como principal — lo puedes cambiar después en Configuración.</p></RichiBubble>
      <div className="pfi-field-group">
        <Label>Países</Label>
        <MultiSelectChips options={COUNTRY_OPTIONS} selected={answers.residenceCountries} onToggle={value => update({ residenceCountries: toggleInList(answers.residenceCountries, value) })} />
      </div>
      <div className="pfi-field-group">
        <Label>Monedas</Label>
        <MultiSelectChips options={CURRENCY_OPTIONS} selected={answers.activeCurrencies} onToggle={value => update({ activeCurrencies: toggleInList(answers.activeCurrencies, value) })} />
      </div>
    </>
  );
}

export function ScreenIncomeSources({ answers, update }: ScreenProps) {
  return (
    <>
      <RichiBubble><p>¿De dónde viene tu dinero? Selecciona todo lo que aplique.</p></RichiBubble>
      <MultiSelectChips options={INCOME_SOURCE_OPTIONS} selected={answers.incomeSourceTags} onToggle={value => update({ incomeSourceTags: toggleInList(answers.incomeSourceTags, value) })} />
    </>
  );
}

export function ScreenBusinesses({ answers, update }: ScreenProps) {
  const addBusiness = () => update({ businesses: [...answers.businesses, { name: "", activityDescription: "", countryCode: "MX" }] });
  const updateBusiness = (index: number, patch: Partial<PfiAnswers["businesses"][number]>) =>
    update({ businesses: answers.businesses.map((business, itemIndex) => (itemIndex === index ? { ...business, ...patch } : business)) });
  const removeBusiness = (index: number) => update({ businesses: answers.businesses.filter((_, itemIndex) => itemIndex !== index) });

  return (
    <>
      <RichiBubble><p>Cuéntame de tu negocio (o negocios). Con el nombre, a qué se dedica y en qué país opera es suficiente por ahora — el detalle contable lo capturamos después, dentro de Libro PFAE.</p></RichiBubble>
      <div className="pfi-list">
        {answers.businesses.map((business, index) => (
          <div key={index} className="pfi-list-card">
            <div className="pfi-list-card-header">
              <strong>Negocio {index + 1}</strong>
              <Button type="button" variant="ghost" size="icon" onClick={() => removeBusiness(index)} aria-label="Quitar negocio"><Trash2 className="size-4" /></Button>
            </div>
            <div className="pfi-field-group"><Label>Nombre</Label><Input value={business.name} onChange={event => updateBusiness(index, { name: event.target.value })} /></div>
            <div className="pfi-field-group"><Label>¿A qué se dedica?</Label><Input value={business.activityDescription} onChange={event => updateBusiness(index, { activityDescription: event.target.value })} /></div>
            <div className="pfi-field-group">
              <Label>País donde opera</Label>
              <select value={business.countryCode} onChange={event => updateBusiness(index, { countryCode: event.target.value })}>
                <option value="MX">México</option><option value="ES">España</option><option value="US">Estados Unidos</option><option value="OT">Otro</option>
              </select>
            </div>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" onClick={addBusiness}><Plus className="size-4" /> Añadir negocio</Button>
    </>
  );
}

export function ScreenDebtsAccountsPulse({ answers, update }: ScreenProps) {
  return (
    <>
      <RichiBubble><p>Un par de preguntas rápidas, sin entrar en detalle todavía. ¿Tienes deudas activas hoy?</p></RichiBubble>
      <div className="pfi-option-list pfi-option-list-inline">
        <button type="button" className={answers.hasActiveDebtsDeclared === true ? "pfi-option is-selected" : "pfi-option"} onClick={() => update({ hasActiveDebtsDeclared: true })}>Sí</button>
        <button type="button" className={answers.hasActiveDebtsDeclared === false ? "pfi-option is-selected" : "pfi-option"} onClick={() => update({ hasActiveDebtsDeclared: false, approxDebtCount: null })}>No</button>
      </div>
      {answers.hasActiveDebtsDeclared ? (
        <div className="pfi-field-group">
          <Label>¿Aproximadamente cuántas?</Label>
          <Input type="number" min={0} value={answers.approxDebtCount ?? ""} onChange={event => update({ approxDebtCount: event.target.value ? Number(event.target.value) : null })} />
        </div>
      ) : null}
      <div className="pfi-field-group">
        <Label>¿Cuántas cuentas bancarias o tarjetas usas regularmente? (aproximado)</Label>
        <Input type="number" min={0} value={answers.approxAccountCount ?? ""} onChange={event => update({ approxAccountCount: event.target.value ? Number(event.target.value) : null })} />
      </div>
    </>
  );
}

export function ScreenTaxSituation({ answers, update }: ScreenProps) {
  const options = [
    { value: "pfae_general", label: "PFAE · Régimen general" },
    { value: "resico", label: "RESICO" },
    { value: "other", label: "Otro / no estoy segura" },
  ] as const;
  return (
    <>
      <RichiBubble><p>¿Conoces tu régimen fiscal actual? Si no estás segura, no pasa nada — lo resolvemos después.</p></RichiBubble>
      <div className="pfi-option-list">
        {options.map(option => (
          <button key={option.value} type="button" className={answers.taxRegime === option.value ? "pfi-option is-selected" : "pfi-option"} onClick={() => update({ taxRegime: option.value })}>{option.label}</button>
        ))}
      </div>
    </>
  );
}

export function ScreenRiskProfile({ answers, update }: ScreenProps) {
  return (
    <>
      <RichiBubble><p>Esto nos ayuda a saber cómo te sentirías si el valor de una inversión sube y baja, para proponerte solo lo que te da tranquilidad. Dos preguntas rápidas:</p></RichiBubble>
      <div className="pfi-field-group">
        <Label>Si el dinero que invertiste bajara de valor por un tiempo, ¿qué harías?</Label>
        <div className="pfi-option-list">
          {RISK_SCENARIO_OPTIONS.map(option => (
            <button key={option.value} type="button" className={answers.riskScenario1Answer === option.value ? "pfi-option is-selected" : "pfi-option"} onClick={() => update({ riskScenario1Answer: option.value })}>{option.label}</button>
          ))}
        </div>
      </div>
      <div className="pfi-field-group">
        <Label>¿Y si en vez de bajar, subiera de valor rápido?</Label>
        <div className="pfi-option-list">
          {RISK_SCENARIO_OPTIONS.map(option => (
            <button key={option.value} type="button" className={answers.riskScenario2Answer === option.value ? "pfi-option is-selected" : "pfi-option"} onClick={() => update({ riskScenario2Answer: option.value })}>{option.label}</button>
          ))}
        </div>
      </div>
    </>
  );
}

export function ScreenGoals({ answers, update }: ScreenProps) {
  const addGoal = () => { if (answers.goals.length >= 3) return; update({ goals: [...answers.goals, { name: "", targetCents: 0, targetDate: null }] }); };
  const updateGoal = (index: number, patch: Partial<PfiAnswers["goals"][number]>) =>
    update({ goals: answers.goals.map((goal, itemIndex) => (itemIndex === index ? { ...goal, ...patch } : goal)) });
  const removeGoal = (index: number) => update({ goals: answers.goals.filter((_, itemIndex) => itemIndex !== index) });

  return (
    <>
      <RichiBubble><p>¿Hay algo que quieras lograr con tu dinero en los próximos meses o años? Puede ser un viaje, comprar algo, ahorrar para una meta, pagar una deuda. Agrega hasta 3 para empezar — puedes agregar más después.</p></RichiBubble>
      <div className="pfi-list">
        {answers.goals.map((goal, index) => (
          <div key={index} className="pfi-list-card">
            <div className="pfi-list-card-header"><strong>Objetivo {index + 1}</strong><Button type="button" variant="ghost" size="icon" onClick={() => removeGoal(index)} aria-label="Quitar objetivo"><Trash2 className="size-4" /></Button></div>
            <div className="pfi-field-group"><Label>¿Qué es?</Label><Input value={goal.name} onChange={event => updateGoal(index, { name: event.target.value })} /></div>
            <div className="pfi-field-group"><Label>¿Cuánto cuesta aproximadamente?</Label><Input type="number" min={0} value={goal.targetCents ? goal.targetCents / 100 : ""} onChange={event => updateGoal(index, { targetCents: event.target.value ? Math.round(Number(event.target.value) * 100) : 0 })} /></div>
            <div className="pfi-field-group"><Label>¿Para cuándo?</Label><Input type="date" onChange={event => updateGoal(index, { targetDate: event.target.value ? new Date(event.target.value).getTime() : null })} /></div>
          </div>
        ))}
      </div>
      {answers.goals.length < 3 ? <Button type="button" variant="outline" onClick={addGoal}><Plus className="size-4" /> Añadir objetivo</Button> : null}
    </>
  );
}

export function ScreenCommunicationStyle({ answers, update }: ScreenProps) {
  const options = [
    { value: "direct", label: "Directa y breve" },
    { value: "detailed", label: "Explicativa y detallada" },
    { value: "motivational", label: "Motivadora / cercana" },
  ] as const;
  return (
    <>
      <RichiBubble><p>¿Cómo prefieres que te hable de aquí en adelante?</p></RichiBubble>
      <div className="pfi-option-list">
        {options.map(option => (
          <button key={option.value} type="button" className={answers.communicationStyle === option.value ? "pfi-option is-selected" : "pfi-option"} onClick={() => update({ communicationStyle: option.value })}>{option.label}</button>
        ))}
      </div>
    </>
  );
}

export function ScreenChannels({ answers, update }: ScreenProps) {
  const toggle = (key: keyof PfiAnswers["channels"]) => update({ channels: { ...answers.channels, [key]: !answers.channels[key] } });
  return (
    <>
      <RichiBubble><p>¿Dónde quieres recibir avisos? Puedes elegir varios, o ninguno por ahora.</p></RichiBubble>
      <div className="pfi-option-list">
        <button type="button" className={answers.channels.inApp ? "pfi-option is-selected" : "pfi-option"} onClick={() => toggle("inApp")}>Dentro de la app</button>
        <button type="button" className={answers.channels.telegram ? "pfi-option is-selected" : "pfi-option"} onClick={() => toggle("telegram")}>Telegram</button>
        <button type="button" className={answers.channels.email ? "pfi-option is-selected" : "pfi-option"} onClick={() => toggle("email")}>Email</button>
      </div>
    </>
  );
}

export function ScreenPrivacy({ answers, update }: ScreenProps) {
  return (
    <>
      <RichiBubble>
        <p>Antes de continuar, quiero ser transparente contigo:</p>
        <p className="mt-3">Guardamos lo que registres manualmente, cifrado y bajo tu control. Puedes borrarlo cuando quieras desde Configuración.</p>
        <p className="mt-3">Como responsable de Richeon, Yasuri puede acceder a tu información si es necesario para dar soporte o resolver un problema. Cada vez que lo hace, queda un registro visible para ti de cuándo y por qué.</p>
      </RichiBubble>
      <label className="pfi-consent">
        <input type="checkbox" checked={answers.consentAccepted} onChange={event => update({ consentAccepted: event.target.checked })} />
        <span>Entiendo y acepto cómo se guarda y se accede a mi información.</span>
      </label>
    </>
  );
}

export function ScreenClosing({ userName, activeModules }: ScreenProps & { activeModules: string[] | null }) {
  const moduleLabels: Record<string, string> = {
    coreview: "Panel", controlhub: "ToDo y Calendario", moneylink: "Registros y Cuentas", wealthmap: "Patrimonio", crediscore: "Score",
    debtcenter: "Tarjetas y deudas", bookpro_taxzen: "Libro PFAE", netlink: "Contactos de negocio", lifegoals: "Planificación de objetivos",
  };
  return (
    <RichiBubble>
      <p>Gracias por contarme todo esto, {userName || "bienvenida"}. Ya tengo lo que necesito para organizar tu espacio.</p>
      {activeModules?.length ? <p className="mt-3">Ya tienes activo: {activeModules.map(key => moduleLabels[key] ?? key).join(", ")}.</p> : null}
      <p className="mt-3">Para que veas Richeon en acción de inmediato, en Cuentas puedes subir tu último estado de cuenta y en un momento verás tu primer resumen real. Si prefieres no hacerlo ahora, entras igual a un panel vacío pero funcional, y lo haces cuando quieras.</p>
    </RichiBubble>
  );
}
