import "./FichaTecnica.css";

export interface FichaTecnicaData {
  nome: string;
  tipo: string;
  status: "Ideia" | "Em desenvolvimento" | "Ativo" | "Concluído";
  responsavel: string;

  visao: string;
  missao: string;
  valores: string[];

  publicoAlvo: string;
  problema: string;
  propostaValor: string;

  dataInicio: string;
  dataEntrega?: string;
  tecnologias: string[];
  escopo: string;

  custoEstimado: string;
  investimento: string;
  retornoEsperado: string;
  monetizacao: string;
}

interface Props {
  data: FichaTecnicaData;
}

export default function FichaTecnica({ data }: Props) {
  return (
    <section className="ficha">
      <header className="ficha-header">
        <h2>{data.nome}</h2>
        <span className={`status ${data.status.toLowerCase()}`}>
          {data.status}
        </span>
      </header>

      <div className="ficha-grid">
        <FichaItem titulo="Tipo" valor={data.tipo} />
        <FichaItem titulo="Responsável" valor={data.responsavel} />
        <FichaItem titulo="Data de início" valor={data.dataInicio} />
        {data.dataEntrega && (
          <FichaItem titulo="Entrega prevista" valor={data.dataEntrega} />
        )}
      </div>

      <FichaBloco titulo="Visão" texto={data.visao} />
      <FichaBloco titulo="Missão" texto={data.missao} />

      <div className="ficha-valores">
        <h3>Valores</h3>
        <ul>
          {data.valores.map((v, i) => (
            <li key={i}>{v}</li>
          ))}
        </ul>
      </div>

      <FichaBloco titulo="Problema que resolve" texto={data.problema} />
      <FichaBloco titulo="Proposta de valor" texto={data.propostaValor} />
      <FichaBloco titulo="Público-alvo" texto={data.publicoAlvo} />
      <FichaBloco titulo="Escopo" texto={data.escopo} />

      <div className="ficha-tech">
        <h3>Tecnologias</h3>
        <div className="tags">
          {data.tecnologias.map((t, i) => (
            <span key={i} className="tag">{t}</span>
          ))}
        </div>
      </div>

      <div className="ficha-financeiro">
        <FichaItem titulo="Custo estimado" valor={data.custoEstimado} />
        <FichaItem titulo="Investimento" valor={data.investimento} />
        <FichaItem titulo="Retorno esperado" valor={data.retornoEsperado} />
        <FichaItem titulo="Monetização" valor={data.monetizacao} />
      </div>
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

function FichaBloco({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="ficha-bloco">
      <h3>{titulo}</h3>
      <p>{texto}</p>
    </div>
  );
}
