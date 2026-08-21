import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { journeyPath } from "@/lib/journey";
import { ArrowRight, ChartNoAxesCombined, Landmark, WalletCards } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

const AION_MARK_URL = "/manus-storage/aion-logo-dark_9a4b34db.png";

const journeys = [
  { icon: WalletCards, title: "Para sua vida pessoal", text: "Contas, gastos por categoria, salário e alertas em uma leitura simples." },
  { icon: Landmark, title: "Para seu negócio", text: "Fluxo de caixa, entradas, obrigações e prioridades do dia a dia da empresa." },
  { icon: ChartNoAxesCombined, title: "Para o Consultor Aion", text: "Uma carteira organizada, com cada cliente na jornada financeira correta." },
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  useEffect(() => {
    if (!isAuthenticated) return;
    const selectedJourney = window.localStorage.getItem("aion-selected-journey");
    const destination = journeyPath(selectedJourney === "pessoal" ? "pessoal" : "empresarial");
    window.localStorage.removeItem("aion-selected-journey");
    navigate(destination);
  }, [isAuthenticated, navigate]);
  if (isAuthenticated) return null;

  return <div className="min-h-screen overflow-x-hidden bg-[#2d2d2d] text-white">
    <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8"><div className="flex items-center gap-3"><img src={AION_MARK_URL} alt="Símbolo da Aion" className="h-10 w-10 rounded-xl object-cover"/><div><p className="text-lg font-extrabold tracking-[-0.04em]">Aion</p><p className="text-xs text-[#c7c0ba]">Consultoria financeira</p></div></div><Button onClick={startLogin} className="min-h-11 bg-white px-5 font-bold text-[#8f1727] hover:bg-[#f4e8e9]">Entrar <ArrowRight className="ml-2 h-4 w-4"/></Button></header>
    <main><section className="relative mx-auto max-w-7xl px-5 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24"><div className="absolute -right-36 top-0 h-[32rem] w-[32rem] rounded-full bg-[#b21d31] opacity-35 blur-3xl"/><div className="relative grid items-center gap-12 lg:grid-cols-[1.08fr_.92fr]"><div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#f07787]">Aion Consultoria</p><h1 className="mt-5 max-w-3xl text-5xl font-extrabold leading-[.96] tracking-[-0.065em] sm:text-6xl lg:text-7xl">Finanças com clareza.<br/><span className="text-[#ef4055]">Decisões com direção.</span></h1><p className="mt-7 max-w-xl text-lg leading-relaxed text-[#d1cbc6]">Uma plataforma de gestão financeira desenhada para a sua realidade: vida pessoal, microempresa ou acompanhamento consultivo.</p><div className="mt-9 flex flex-wrap gap-3"><Button size="lg" onClick={startLogin} className="min-h-12 bg-[#b21d31] px-6 font-bold hover:bg-[#8f1727]">Acessar a plataforma <ArrowRight className="ml-2 h-4 w-4"/></Button><span className="flex items-center px-2 text-sm font-semibold text-[#c7c0ba]">Gestão financeira humana e objetiva.</span></div></div><div className="rounded-[2rem] border border-white/10 bg-white/[.06] p-5 shadow-2xl backdrop-blur sm:p-7"><div className="rounded-[1.4rem] bg-[#f7f5f2] p-6 text-[#2d2d2d]"><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#b21d31]">Visão Aion</p><p className="mt-4 text-2xl font-extrabold tracking-[-0.045em]">O que precisa de atenção hoje?</p><div className="mt-6 grid gap-3"><div className="rounded-xl bg-[#f0e7e3] p-4"><p className="text-xs font-bold text-[#716a67]">Pessoal</p><p className="mt-1 font-extrabold">Contas e gastos, sem complicação.</p></div><div className="rounded-xl bg-[#f0e7e3] p-4"><p className="text-xs font-bold text-[#716a67]">Negócio</p><p className="mt-1 font-extrabold">Caixa, obrigações e recebimentos.</p></div><div className="rounded-xl bg-[#f9e8eb] p-4"><p className="text-xs font-bold text-[#b21d31]">Consultoria</p><p className="mt-1 font-extrabold">Prioridades de cada cliente, em contexto.</p></div></div></div></div></div></section>
    <section className="bg-[#f7f5f2] py-20 text-[#2d2d2d]"><div className="mx-auto max-w-7xl px-5 sm:px-8"><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#b21d31]">Três jornadas, uma identidade</p><h2 className="mt-4 max-w-2xl text-4xl font-extrabold tracking-[-0.055em]">A informação certa para cada realidade financeira.</h2><div className="mt-10 grid gap-5 md:grid-cols-3">{journeys.map(({icon: Icon, title, text}, index) => <article key={title} className="rounded-[1.5rem] border border-[#e5dfda] bg-white p-6 shadow-[0_12px_28px_rgba(62,48,43,.05)]"><span className={`flex h-12 w-12 items-center justify-center rounded-xl ${index === 2 ? "bg-[#b21d31] text-white" : "bg-[#f9e8eb] text-[#b21d31]"}`}><Icon className="h-5 w-5"/></span><h3 className="mt-6 text-xl font-extrabold tracking-[-.035em]">{title}</h3><p className="mt-3 leading-relaxed text-[#716a67]">{text}</p></article>)}</div></div></section></main>
    <footer className="border-t border-white/10 px-5 py-7 text-center text-sm text-[#c7c0ba]">© 2026 Aion Consultoria. Gestão financeira com direção.</footer>
  </div>;
}
