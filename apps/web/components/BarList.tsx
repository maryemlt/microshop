export interface BarDatum {
  key: string;
  label: string;
  value: number;
}

/**
 * Barres horizontales d'une seule teinte (catégories nominales) avec valeur affichée
 * et info-bulle au survol ou au focus clavier.
 */
export function BarList({ data, unit, label }: { data: BarDatum[]; unit: string; label: string }) {
  const total = data.reduce((sum, datum) => sum + datum.value, 0);
  const max = Math.max(1, ...data.map((datum) => datum.value));

  return (
    <ul className="bar-list" aria-label={label}>
      {data.map((datum) => {
        const share = total > 0 ? Math.round((datum.value / total) * 100) : 0;
        const description = `${datum.label} : ${datum.value} ${unit} (${share} %)`;
        return (
          <li key={datum.key} className="bar-row" tabIndex={0} aria-label={description}>
            <span className="bar-label">{datum.label}</span>
            <span className="bar-track">
              <span className="bar-fill" style={{ width: `${(datum.value / max) * 100}%` }} />
            </span>
            <span className="bar-value">{datum.value}</span>
            <span className="bar-tooltip" aria-hidden="true">
              {description}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
