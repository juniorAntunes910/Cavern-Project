import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { CountUp } from "./components/CountUp";
import type { FormEvent, ReactNode } from "react";
import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { allowedEmail, supabase, supabaseConfigured } from "./lib/supabase";
import { Progress } from "./features/Progress";
import { grantReward } from "./features/gamification/rewards/reward.service";
import { InstallControl } from "./components/AppInstall";
import { NotificationSettings } from "./components/NotificationSettings";
import { ProfileSettings } from "./features/ProfileSettings";
import { addLocalTimelineEvent, getLocalHabitLogs, getLocalRewardTransactions, grantLocalReward, overallStreak, unlockLocalAchievement } from "./lib/local-store";
import { startHabitReminderChecks } from "./lib/notifications";
import { useLocalRevision } from "./lib/use-local-revision";
import { evaluateAchievements } from "./features/achievements/services/achievement.service";
import "./App.css";
import "./theme-overrides.css";
import "./features/challenges/challenges.css";
import "./reader.css";
import "./mobile-compact.css";

// Telas carregadas sob demanda: só o Início vai no bundle inicial. O service worker pré-carrega todos os chunks para o modo offline.
const Goals = lazy(() => import("./features/Goals").then((m) => ({ default: m.Goals })));
const Habits = lazy(() => import("./features/Habits").then((m) => ({ default: m.Habits })));
const CheckIn = lazy(() => import("./features/CheckIn").then((m) => ({ default: m.CheckIn })));
const Gym = lazy(() => import("./features/Gym").then((m) => ({ default: m.Gym })));
const Books = lazy(() => import("./features/Books").then((m) => ({ default: m.Books })));
const Reader = lazy(() => import("./features/Reader").then((m) => ({ default: m.Reader })));
const Finance = lazy(() => import("./features/Finance").then((m) => ({ default: m.Finance })));
const ChallengesPage = lazy(() => import("./features/challenges/pages/ChallengesPage").then((m) => ({ default: m.ChallengesPage })));
const Focus = lazy(() => import("./features/focus/Focus").then((m) => ({ default: m.Focus })));
const AchievementsPage = lazy(() => import("./features/achievements/Achievements").then((m) => ({ default: m.AchievementsPage })));
const Shop = lazy(() => import("./features/shop/Shop").then((m) => ({ default: m.Shop })));
const AiAdvisorPage = lazy(() => import("./features/advisor/pages/AiAdvisorPage").then((m) => ({ default: m.AiAdvisorPage })));

type Session = Awaited<
  ReturnType<NonNullable<typeof supabase>["auth"]["getSession"]>
>["data"]["session"];
const nav = [
  ["/advisor", "Assistente IA"],
  ["/", "Início"],
  ["/cavern", "Caverna"],
  ["/habits", "Hábitos"],
  ["/goals", "Metas"],
  ["/focus", "Foco"],
  ["/checkins", "Check-in"],
];
const moreNav = [
  ["/gym", "Academia"],
  ["/books", "Livros"],
  ["/achievements", "Conquistas"],
  ["/shop", "Loja"],
  ["/finance", "Financeiro"],
  ["/profile", "Perfil"],
];

export default function App() {
  const [session, setSession] = useState<Session>(null);
  const [loading, setLoading] = useState(supabaseConfigured);
  const [recovering, setRecovering] = useState(false);
  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      // O link do e-mail de recuperação abre uma sessão temporária: pedir a nova senha antes de entrar no app.
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
      setSession(next);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  if (!supabaseConfigured) return <LocalApp />;
  if (loading) return <main className="centered">Carregando...</main>;
  if (recovering && session) return <ResetPassword onDone={() => setRecovering(false)} />;
  if (!session) return <Auth />;
  if (allowedEmail && session.user.email?.toLowerCase() !== allowedEmail)
    return <PrivateAccessDenied />;
  return <Shell profile={<Profile email={session.user.email ?? ""} />} />;
}

function LocalApp() {
  return <Shell profile={<LocalProfile />} />;
}

function Shell({ profile }: { profile: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [storageFull, setStorageFull] = useState(false);
  const location = useLocation();
  useEffect(() => startHabitReminderChecks(), []);
  useEffect(() => {
    const warn = () => setStorageFull(true);
    window.addEventListener("cavern:storage-error", warn);
    return () => window.removeEventListener("cavern:storage-error", warn);
  }, []);
  useEffect(() => {
    let reconciling = false;
    const reconcileAchievements = () => {
      if (reconciling) return;
      reconciling = true;
      for (const achievement of evaluateAchievements()) {
        if (unlockLocalAchievement(achievement.id)) {
          grantLocalReward("achievement", achievement.id, achievement.rewardXp, achievement.rewardEmbers, achievement.title);
          addLocalTimelineEvent({ type: "achievement", title: `${achievement.icon} ${achievement.title}`, description: achievement.description });
        }
      }
      reconciling = false;
    };
    reconcileAchievements();
    window.addEventListener("cavern:data-changed", reconcileAchievements);
    return () => window.removeEventListener("cavern:data-changed", reconcileAchievements);
  }, []);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const grantTestEmbers = (event: KeyboardEvent) => {
      if (!event.ctrlKey || event.key !== "9") return;
      event.preventDefault();
      grantReward({
        sourceType: "debug",
        sourceId: crypto.randomUUID(),
        xp: 0,
        embers: 5000,
        title: "Brasas de teste",
      });
    };
    window.addEventListener("keydown", grantTestEmbers);
    return () => window.removeEventListener("keydown", grantTestEmbers);
  }, []);
  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  return (
    <div className="app-shell">
      <div className="mobile-topbar">
        <button
          className="mobile-menu-trigger"
          type="button"
          aria-label="Abrir menu principal"
          aria-expanded={menuOpen}
          aria-controls="main-sidebar"
          onClick={() => setMenuOpen(true)}
        >
          <span className="mobile-menu-icon" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </button>
        <div className="mobile-brand">CAVERN</div>
        <StreakBadge compact />
      </div>
      <button
        className={`mobile-menu-backdrop${menuOpen ? " is-open" : ""}`}
        type="button"
        aria-label="Fechar menu"
        tabIndex={menuOpen ? 0 : -1}
        onClick={() => setMenuOpen(false)}
      />
      <aside
        id="main-sidebar"
        className={`sidebar${menuOpen ? " is-open" : ""}`}
        aria-label="Menu principal"
        aria-modal={menuOpen || undefined}
      >
        <div className="sidebar-heading">
          <div className="brand">CAVERN</div>
          <button
            className="mobile-menu-close"
            type="button"
            aria-label="Fechar menu"
            onClick={() => setMenuOpen(false)}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <nav>
          {nav.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              viewTransition
              onClick={() => setMenuOpen(false)}
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="nav-pill" aria-hidden="true" />}
                  <span className="nav-label">{label}</span>
                </>
              )}
            </NavLink>
          ))}
          <details className="nav-more">
            <summary>Mais áreas</summary>
            {moreNav.map(([to, label]) => (
              <NavLink key={to} to={to} viewTransition onClick={() => setMenuOpen(false)}>
                {({ isActive }) => (
                  <>
                    {isActive && <span className="nav-pill" aria-hidden="true" />}
                    <span className="nav-label">{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </details>
        </nav>
        <StreakBadge />
        <ThemeToggle />
      </aside>
      <main className="content">
        <div className="route-view" key={location.pathname}>
        <Suspense fallback={<p className="route-loading" role="status">Carregando…</p>}>
        <Routes>
          <Route path="/advisor" element={<AiAdvisorPage />} />
          <Route path="/" element={<Progress />} />
          <Route path="/cavern" element={<ChallengesPage />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/habits" element={<Habits />} />
          <Route path="/focus" element={<Focus />} />
          <Route path="/gym" element={<Gym />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/books" element={<Books />} />
          <Route path="/books/:id/read" element={<Reader />} />
          <Route path="/achievements" element={<AchievementsPage />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/statistics" element={<Navigate to="/" replace />} />
          <Route path="/checkins" element={<CheckIn />} />
          <Route path="/profile" element={profile} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
        </div>
      </main>
      {storageFull && (
        <div className="storage-alert" role="alert">
          <span>Não foi possível salvar: o armazenamento do navegador está cheio ou bloqueado. Exporte um backup no Perfil e libere espaço.</span>
          <button type="button" className="subtle" onClick={() => setStorageFull(false)}>Fechar</button>
        </div>
      )}
      <RewardFeedback />
    </div>
  );
}

function RewardFeedback() {
  const shownId = useRef(getLocalRewardTransactions()[0]?.id ?? "");
  const timer = useRef<number | undefined>(undefined);
  const [reward, setReward] = useState<ReturnType<typeof getLocalRewardTransactions>[number] | null>(null);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const showLatestReward = () => {
      const latest = getLocalRewardTransactions()[0];
      if (!latest || latest.id === shownId.current) return;
      shownId.current = latest.id;
      window.clearTimeout(timer.current);
      setReward(latest);
      setLeaving(false);
      timer.current = window.setTimeout(() => {
        setLeaving(true);
        timer.current = window.setTimeout(() => setReward(null), 320);
      }, 3900);
    };
    window.addEventListener("cavern:data-changed", showLatestReward);
    return () => { window.removeEventListener("cavern:data-changed", showLatestReward); window.clearTimeout(timer.current); };
  }, []);
  if (!reward) return null;
  return <div className={`reward-toast${leaving ? " leaving" : ""}`} role="status"><span aria-hidden="true">✦</span><div><strong>Recompensa recebida</strong><small>{reward.title} · +{reward.xp} XP · +{reward.embers} brasas</small></div></div>;
}

function ThemeToggle() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("cavern.theme") ?? "dark",
  );
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("cavern.theme", theme);
  }, [theme]);
  return (
    <button
      className="theme-toggle"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? "Tema claro" : "Tema escuro"}
    </button>
  );
}

function StreakBadge({ compact = false }: { compact?: boolean }) {
  useLocalRevision();
  const streak = overallStreak(getLocalHabitLogs());
  return (
    <NavLink
      className={`streak-badge${compact ? " compact" : ""}`}
      to="/"
      aria-label={`Sequência atual: ${streak} dias`}
    >
      <span aria-hidden="true">🔥</span>
      <strong><CountUp value={streak} duration={700} /></strong>
      {!compact && (
        <small>{streak === 1 ? "dia seguido" : "dias seguidos"}</small>
      )}
    </NavLink>
  );
}

function PrivateAccessDenied() {
  return (
    <main className="centered setup">
      <h1>Acesso privado</h1>
      <p>Esta instalação do Cavern não está autorizada para esta conta.</p>
      <button onClick={() => void supabase?.auth.signOut()}>Sair</button>
    </main>
  );
}
function Profile({ email }: { email: string }) {
  return <><ProfileSettings email={email} onSignOut={() => void supabase?.auth.signOut()} /><DeviceSettings /></>;
}
function LocalProfile() {
  return <><ProfileSettings /><DeviceSettings /></>;
}

function DeviceSettings() {
  return (
    <section className="panel device-settings">
      <div>
        <p className="eyebrow">APLICATIVO</p>
        <h2>Instalação e lembretes</h2>
        <p>
          Configure o Cavern para funcionar como aplicativo no celular ou
          desktop.
        </p>
      </div>
      <InstallControl />
      <NotificationSettings />
    </section>
  );
}

function ResetPassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase || busy) return;
    if (password !== confirm) return setMessage("As senhas não são iguais.");
    setBusy(true);
    setMessage("");
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setMessage(error.message);
    onDone();
  }
  return (
    <main className="auth">
      <form className="auth-card" onSubmit={submit}>
        <AuthBrand />
        <div className="auth-heading">
          <h1>Criar nova senha</h1>
          <p>Escolha uma senha nova para voltar à sua caverna.</p>
        </div>
        <label htmlFor="reset-password">
          Nova senha
          <input id="reset-password" required minLength={8} autoComplete="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <label htmlFor="reset-confirm">
          Repita a nova senha
          <input id="reset-confirm" required minLength={8} autoComplete="new-password" type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} />
        </label>
        {message && <p className="message" role="alert">{message}</p>}
        <button className="auth-submit" disabled={busy}>{busy ? "Aguarde..." : "Salvar nova senha"}</button>
      </form>
    </main>
  );
}

function Auth() {
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const canRegister = !allowedEmail;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMessage("");
    const response = register
      ? await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: name } },
        })
      : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    setMessage(
      response.error?.message ??
        (register
          ? "Conta criada. Confira seu e-mail para confirmar o cadastro."
          : ""),
    );
  }
  async function reset() {
    if (!supabase || !email)
      return setMessage("Informe seu e-mail para recuperar a senha.");
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    setMessage(error?.message ?? "Instruções enviadas para seu e-mail.");
  }
  return (
    <main className="auth">
      <form className="auth-card" onSubmit={submit}>
        <AuthBrand />
        <div className="auth-heading">
          <h1>{register ? "Criar sua conta" : "Entrar no Cavern"}</h1>
          <p>
            {register
              ? "Comece seu ciclo com intenção."
              : "Entre na sua caverna."}
          </p>
        </div>
        {register && (
          <label htmlFor="auth-name">
            Nome
            <input
              id="auth-name"
              required
              autoComplete="name"
              placeholder="Como quer ser chamado?"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
        )}
        <label htmlFor="auth-email">
          E-mail
          <input
            id="auth-email"
            required
            autoComplete="email"
            placeholder="voce@exemplo.com"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label htmlFor="auth-password">
          Senha
          <input
            id="auth-password"
            required
            autoComplete={register ? "new-password" : "current-password"}
            minLength={8}
            placeholder="Digite sua senha"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {message && (
          <p className="message" role="status">
            {message}
          </p>
        )}
        <button className="auth-submit" disabled={busy}>
          {busy ? "Aguarde..." : register ? "Criar conta" : "Entrar"}
        </button>
        <div className="auth-secondary-actions">
          {!register && (
            <button type="button" className="link" onClick={reset}>
              Esqueci minha senha
            </button>
          )}
          {canRegister && (
            <button
              type="button"
              className="link"
              onClick={() => setRegister(!register)}
            >
              {register ? "Já tenho uma conta" : "Criar conta"}
            </button>
          )}
        </div>
      </form>
    </main>
  );
}

function AuthBrand() {
  return (
    <div className="auth-brand">
      <img alt="" aria-hidden="true" src="/app-icon.svg" />
      <span>CAVERN</span>
    </div>
  );
}
