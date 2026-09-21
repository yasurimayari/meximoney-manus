export type ChipOption = { value: string; label: string };

/**
 * Grupo de chips de selección múltiple, reutilizado en las pantallas de
 * ocupación, países/monedas, fuentes de ingreso y canales de aviso.
 */
export function MultiSelectChips({
  options,
  selected,
  onToggle,
}: {
  options: ChipOption[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="pfi-chip-group">
      {options.map(option => {
        const isSelected = selected.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            className={isSelected ? "pfi-chip is-selected" : "pfi-chip"}
            aria-pressed={isSelected}
            onClick={() => onToggle(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
