/** Indicador de progreso del PFI -- posición actual dentro de las pantallas visibles hoy (las condicionales se saltan). */
export function PfiProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="pfi-progress" aria-label="Progreso del cuestionario">
      <div className="pfi-progress-track">
        <div className="pfi-progress-fill" style={{ width: `${Math.round(((current + 1) / total) * 100)}%` }} />
      </div>
      <span className="pfi-progress-label">Pregunta {current + 1} de {total}</span>
    </div>
  );
}
