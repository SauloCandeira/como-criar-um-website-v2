import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./Preview.css";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export default function Preview() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [html, setHtml] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const userId = (localStorage.getItem("email") || "").toLowerCase();
    if (!userId) {
      navigate("/login", { replace: true });
      return;
    }
    if (!projectId) {
      setError("Projeto inválido.");
      setLoading(false);
      return;
    }

    let isMounted = true;
    const loadPreview = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/preview/${encodeURIComponent(projectId)}?userId=${encodeURIComponent(userId)}`);
        if (!res.ok) throw new Error("Falha ao carregar preview.");
        const text = await res.text();
        if (isMounted) setHtml(text);
      } catch (err) {
        if (isMounted) setError("Não foi possível carregar o preview.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadPreview();
    return () => {
      isMounted = false;
    };
  }, [navigate, projectId]);

  if (loading) {
    return <div className="preview-page">Carregando preview...</div>;
  }

  if (error) {
    return <div className="preview-page preview-page--error">{error}</div>;
  }

  return (
    <div className="preview-page">
      <iframe title="Project Preview" className="preview-iframe" srcDoc={html} sandbox="allow-scripts allow-same-origin" />
    </div>
  );
}
