import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithPopup, onAuthStateChanged } from "firebase/auth"; 
import { auth, provider } from '../../lib/init-firebase'; 
import "./Login.css";

const Login = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate('/como-criar-um-website-v2/dashboard');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleBack = () => {
    navigate("/como-criar-um-website-v2/");
  };

  const handleLoginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user; 

      // Usando coalescência nula para garantir que não seja null
      localStorage.setItem("name", user.displayName ?? "Usuário Anônimo");
      localStorage.setItem("email", user.email ?? "Email não disponível");
      localStorage.setItem("profilePic", user.photoURL ?? "");

      navigate('/como-criar-um-website-v2/dashboard'); 
    } catch (error) {
      console.error("Erro ao fazer login com Google: ", error);
    }
  };

  return (
    <div className="login-container">
      <button className="back-button" onClick={handleBack}>← Voltar</button>
      <div className="login-form">
        <h2>Login</h2>
        <button className="login-with-google-btn" onClick={handleLoginWithGoogle}>
          Sign in with Google
        </button>
        <div className="user-info">
          <h1>{localStorage.getItem("name")}</h1>
          <h1>{localStorage.getItem("email")}</h1>
          {localStorage.getItem("profilePic") && (
            <img src={localStorage.getItem("profilePic")!} alt="Profile" />
          )}
        </div>
        <p className="signup-link">
          Não tem uma conta? <a href="/signup">Crie uma aqui</a>
        </p>
      </div>
    </div>
  );
};

export default Login;
