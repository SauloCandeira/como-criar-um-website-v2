import "./FichaTecnica.css";

export interface FichaTecnicaItem {
  label: string;
  value: string;
}

export interface FichaTecnicaSection {
  title: string;
  items: FichaTecnicaItem[];
}

export interface FichaTecnicaData {
  title: string;
  status?: string;
  sections: FichaTecnicaSection[];
  tags?: string[];
}

interface Props {
  data: FichaTecnicaData;
}

export default function FichaTecnica({ data }: Props) {
  return (
    <section className="ficha ficha-modern">
      <header className="ficha-header">
        <div className="ficha-header__title">
          <h2>{data.title}</h2>
          {data.tags && data.tags.length > 0 && (
            <div className="ficha-tags">
              {data.tags.map((t, i) => (
                <span key={i} className="tag">{t}</span>
              ))}
            </div>
          )}
        </div>
        {data.status && (
          <span className={`status ${data.status.toLowerCase()}`}>
            {data.status}
          </span>
        )}
      </header>

      {data.sections.map((section) => (
        <section key={section.title} className="ficha-section">
          <div className="ficha-section__header">
            <h3>{section.title}</h3>
          </div>
          <div className="ficha-grid ficha-grid--compact">
            {section.items.map((item) => (
              <FichaItem key={`${section.title}-${item.label}`} titulo={item.label} valor={item.value} />
            ))}
          </div>
        </section>
      ))}
    </section>
  );
}

function FichaItem({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="ficha-item">
      <span>{titulo}</span>
      <strong>{valor}</strong>
    </div>
  );
}

