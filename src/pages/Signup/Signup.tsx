import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from '../../lib/init-firebase';
import "./Signup.css"; // Reaproveitando o mesmo estilo do login

const Signup = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");

  const handleBack = () => {
    navigate("/login");
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
  
    if (!email || !password || !displayName) {
      setError("Por favor, preencha todos os campos.");
      return;
    }
  
    try {
      // Cria o usuário no Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
  
      // Atualiza o displayName no perfil do usuário
      await updateProfile(user, { displayName });
      // Salva/atualiza o usuário no Firestore
      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          name: displayName,
          email: user.email ?? "",
          photoURL: user.photoURL ?? "",
          authProvider: "Email",
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp()
        },
        { merge: true }
      );
  
      // Salva no localStorage
      localStorage.setItem("name", displayName);
      localStorage.setItem("email", user.email ?? "Email não disponível");
      localStorage.setItem("profilePic", user.photoURL ?? "");
  
      // Limpa os campos (opcional)
      setEmail("");
      setPassword("");
      setDisplayName("");
  
      // Navega para o dashboard
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "code" in err) {
        const errorCode = (err as { code?: string }).code;
  
        switch (errorCode) {
          case "auth/email-already-in-use":
            setError("Este email já está em uso.");
            break;
          case "auth/invalid-email":
            setError("Email inválido.");
            break;
          case "auth/weak-password":
            setError("Senha muito fraca. Use pelo menos 6 caracteres.");
            break;
          default:
            setError("Falha ao criar a conta. Verifique os dados e tente novamente.");
        }
      }
    }
  };
  

  return (
    <div className="login-container">
      <button className="back-button" onClick={handleBack}>← Voltar</button>
      <div className="login-form">
        <h2>Crie sua conta</h2>

        <form onSubmit={handleSignup}>
          <input
            type="text"
            placeholder="Nome completo"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="login-input"
            autoComplete="name"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="login-input"
            autoComplete="email"
            required
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="login-input"
            autoComplete="new-password"
            required
            minLength={6}
          />
          {error && <p className="error-message">{error}</p>}
          <button type="submit" className="login-email-btn">
            Criar conta
          </button>
        </form>

        <p className="signup-link">
          Já tem uma conta?{" "}
          <Link to="/login">Faça login aqui</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
