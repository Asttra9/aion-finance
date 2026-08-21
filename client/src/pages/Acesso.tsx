import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { startLogin } from "@/const";
import { ArrowRight, Building2, Eye, EyeOff, HeartHandshake, LockKeyhole, ShieldCheck } from "lucide-react";
import { useState } from "react";

const AION_MARK_URL = "/manus-storage/aion-logo-dark_9a4b34db.png";

type Journey = "empresarial" | "pessoal";

export default function Acesso() {
  const [journey, setJourney] = useState<Journey>("empresarial");
  const [showPassword, setShowPassword] = useState(false);

  const isBusiness = journey === "empresarial";
  const title = isBusiness ? "Acesse o seu negócio." : "Cuide da sua vida financeira.";
  const description = isBusiness
    ? "Caixa, obrigações e decisões do seu micro negócio em uma só visão."
    : "Gastos, contas e metas da sua família, com mais clareza todos os dias.";

  const continueToSecureLogin = () => {
    window.localStorage.setItem("aion-selected-journey", journey);
    startLogin();
  };

  return (
    <main className="min-h-screen bg-[#f7f5f2] p-4 text-[#2d2d2d] sm:p-6 lg:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-[#e5dfda] bg-white shadow-[0_24px_70px_rgba(45,45,45,.12)] lg:grid-cols-[.98fr_1.02fr]">
        <section className="relative hidden overflow-hidden bg-[#2d2d2d] px-10 py-11 text-white lg:flex lg:flex-col">
          <div className="absolute -right-32 top-14 h-80 w-80 rounded-full bg-[#b21d31] opacity-70 blur-3xl" />
          <div className="absolute -bottom-36 -left-24 h-80 w-80 rounded-full border-[44px] border-[#b21d31]/40" />
          <div className="relative flex items-center gap-3">
            <img src={AION_MARK_URL} alt="Símbolo Aion" className="h-11 w-11 rounded-xl object-cover" />
            <div><p className="text-lg font-extrabold tracking-[-.04em]">Aion</p><p className="text-sm text-[#d1cbc6]">Consultoria financeira</p></div>
          </div>

          <div className="relative my-auto max-w-md">
            <p className="text-xs font-extrabold uppercase tracking-[.19em] text-[#f07787]">Aion Consultoria</p>
            <h1 className="mt-5 text-5xl font-extrabold leading-[.96] tracking-[-.065em]">Finanças com<br /><span className="text-[#ef4055]">direção.</span></h1>
            <p className="mt-6 text-base leading-relaxed text-[#d1cbc6]">A plataforma Aion organiza a leitura que importa para você, sua família ou seu negócio.</p>
          </div>

          <div className="relative rounded-2xl border border-white/10 bg-white/[.06] p-5">
            <div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#ef4055]" /><p className="text-sm leading-relaxed text-[#d1cbc6]">Seu acesso é concluído em ambiente seguro. A jornada selecionada organiza a sua experiência inicial.</p></div>
          </div>
        </section>

        <section className="flex min-h-full flex-col px-6 py-8 sm:px-10 sm:py-11">
          <div className="flex items-center justify-between lg:hidden"><div className="flex items-center gap-2"><img src={AION_MARK_URL} alt="Símbolo Aion" className="h-10 w-10 rounded-xl object-cover" /><div><p className="font-extrabold">Aion</p><p className="text-xs text-muted-foreground">Consultoria financeira</p></div></div></div>
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10 lg:py-0">
            <div>
              <p className="aion-eyebrow">Acesso Aion</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-[-.055em] sm:text-4xl">{title}</h2>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
            </div>

            <div className="mt-8 rounded-2xl bg-[#f0e7e3] p-1.5">
              <div className="grid grid-cols-2 gap-1">
                <button type="button" onClick={() => setJourney("empresarial")} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 text-sm font-extrabold transition ${isBusiness ? "bg-white text-[#b21d31] shadow-sm" : "text-[#716a67] hover:text-[#2d2d2d]"}`}><Building2 className="h-4 w-4" />MEI / Microempresa</button>
                <button type="button" onClick={() => setJourney("pessoal")} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 text-sm font-extrabold transition ${!isBusiness ? "bg-white text-[#b21d31] shadow-sm" : "text-[#716a67] hover:text-[#2d2d2d]"}`}><HeartHandshake className="h-4 w-4" />Pessoal / Família</button>
              </div>
            </div>

            <form className="mt-7 space-y-5" onSubmit={(event) => { event.preventDefault(); continueToSecureLogin(); }}>
              <div className="space-y-2"><Label htmlFor="email">E-mail</Label><Input id="email" type="email" placeholder="voce@exemplo.com" autoComplete="email" className="h-12 rounded-xl border-[#ddd5d0] bg-white" /></div>
              <div className="space-y-2"><div className="flex items-center justify-between"><Label htmlFor="password">Senha</Label><button type="button" className="text-xs font-bold text-[#b21d31] hover:underline">Esqueci minha senha</button></div><div className="relative"><Input id="password" type={showPassword ? "text" : "password"} placeholder="Digite sua senha" autoComplete="current-password" className="h-12 rounded-xl border-[#ddd5d0] bg-white pr-12" /><button type="button" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted-foreground hover:text-[#b21d31]">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
              <Button type="submit" className="min-h-12 w-full rounded-xl bg-[#b21d31] font-extrabold hover:bg-[#8f1727]">Continuar com segurança <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </form>

            <button type="button" onClick={() => setJourney(isBusiness ? "pessoal" : "empresarial")} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-[#e5dfda] px-4 py-3 text-sm font-bold text-[#5f5956] transition hover:border-[#b21d31]/35 hover:bg-[#f9e8eb] hover:text-[#b21d31]">{isBusiness ? <><HeartHandshake className="h-4 w-4" />Entrar como Pessoal / Família</> : <><Building2 className="h-4 w-4" />Entrar como MEI / Microempresa</>}</button>
            <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs leading-relaxed text-muted-foreground"><LockKeyhole className="h-3.5 w-3.5 shrink-0" />Ao continuar, seu acesso será confirmado no ambiente seguro da Aion.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
