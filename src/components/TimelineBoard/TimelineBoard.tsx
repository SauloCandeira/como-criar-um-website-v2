import { useEffect } from "react";
import "./TimelineBoard.css";

declare global {
  interface Window {
    drawVisualization: () => void;
  }
}

export default function TimelineBoard() {
  useEffect(() => {
    // evita carregar duas vezes
    if (document.getElementById("timeline-script")) {
      window.drawVisualization?.();
      return;
    }

    const script = document.createElement("script");
    script.id = "timeline-script";
    script.src = "/js/timeline.js";
    script.onload = () => {
      window.drawVisualization?.();
    };

    document.body.appendChild(script);
  }, []);

  return (
    <section className="service section" id="servicos">
      <div className="container">
        <div id="mytimeline"></div>
      </div>
    </section>
  );
}
