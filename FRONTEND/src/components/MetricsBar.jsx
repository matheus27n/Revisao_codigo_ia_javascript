import {
    AlertTriangle,
    BookOpen,
    CheckCircle2,
    Tags,
  } from "lucide-react";
  
  import MetricCard from "./MetricCard";
  
  function MetricsBar({ metrics, isAnalyzing, error }) {
    const status = isAnalyzing ? "Analisando" : error ? "Erro" : metrics?.status ?? "Aguardando";
    return (
      <section className="metrics-bar">
        <MetricCard
          icon={<AlertTriangle size={20} />}
          label="Issues encontradas"
          value={metrics?.issues ?? 0}
          description={metrics ? "Resultados do cenário analisado" : "Nenhuma análise executada"}
        />
  
        <MetricCard
          icon={<Tags size={20} />}
          label="Categorias"
          value={metrics?.categories ?? 0}
          description="Até 4 categorias"
        />
  
        <MetricCard
          icon={<BookOpen size={20} />}
          label="Contextos"
          value={metrics?.contexts ?? 0}
          description="Contextos recuperados"
        />
  
        <MetricCard
          icon={<CheckCircle2 size={20} />}
          label="Status"
          value={status}
          description={isAnalyzing ? "Aguarde a resposta" : error ? "Não foi possível analisar" : metrics ? "Resposta recebida do backend" : "Pronto para análise"}
        />
      </section>
    );
  }
  
  export default MetricsBar;
