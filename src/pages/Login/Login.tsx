import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  onAuthStateChanged 
} from "firebase/auth"; 
import { auth, provider } from '../../lib/init-firebase'; 
import "./Login.css";

const Login = () => {
  const navigate = useNavigate();

  // Estados para o login email/senha
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate('/como-criar-um-website-v2/dashboard', { replace: true });
      } else {
        setLoading(false); // não está logado, pode mostrar o login
      }
    });
    return () => unsubscribe();
  }, [navigate]);
  
  if (loading) {
    return <div>Carregando...</div>; // Ou um spinner, etc.
  }
  
  const handleBack = () => {
    navigate("/como-criar-um-website-v2/");
  };

  const handleLoginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user; 

      localStorage.setItem("name", user.displayName ?? "Usuário Anônimo");
      localStorage.setItem("email", user.email ?? "Email não disponível");
      localStorage.setItem("profilePic", user.photoURL ?? "");

      navigate('/como-criar-um-website-v2/dashboard', { replace: true });
    } catch (error) {
      console.error("Erro ao fazer login com Google: ", error);
      setError("Falha no login com Google.");
    }
  };


  const handleLoginWithEmail = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Por favor, preencha email e senha.");
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      localStorage.setItem("name", user.displayName ?? "Usuário Anônimo");
      localStorage.setItem("email", user.email ?? "Email não disponível");
      localStorage.setItem("profilePic", user.photoURL ?? "");

      navigate('/como-criar-um-website-v2/dashboard', { replace: true });
    } catch (error) {
      console.error("Erro no login com email e senha: ", error);
      setError("Email ou senha inválidos.");
    }
  };

  return (
    <div className="login-container">
      <button className="back-button" onClick={handleBack}>← Voltar</button>
      <div className="login-form">
        <h2>Login</h2>

        <button 
          className="login-with-google-btn" 
          onClick={handleLoginWithGoogle}
          type="button"
        >
          Sign in with Google
        </button>

        <hr style={{ margin: "20px 0", borderColor: "rgba(255,255,255,0.3)" }} />

        <form onSubmit={handleLoginWithEmail}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="login-input"
            autoComplete="username"
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="login-input"
            autoComplete="current-password"
          />
          {error && <p className="error-message">{error}</p>}
          <button type="submit" className="login-email-btn">
            Entrar com Email
          </button>
        </form>

        <p className="signup-link">
          Não tem uma conta? <a href="/como-criar-um-website-v2/signup">Crie uma aqui</a>
        </p>
      </div>
    </div>
  );
};

export default Login;
