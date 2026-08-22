import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, CheckCircle2, ShieldCheck, UserPlus } from "lucide-react";
import { FormEvent, useState } from "react";
import { useLocation } from "wouter";

const AION_MARK_URL = "/manus-storage/aion-logo-dark_9a4b34db.png";

export default function SolicitarConta() {
  const [, navigate] = useLocation();
  const { data: consultants = [], isLoading: loadingConsultants } = trpc.auth.availableConsultants.useQuery();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [businessType, setBusinessType] = useState<"pessoal" | "mei">("pessoal");
  const [consultorId, setConsultorId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const requestAccount = trpc.auth.requestAccount.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: (error) => setFormError(error.message),
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    if (password !== confirmation) {
      setFormError("As senhas informadas não coincidem.");
      return;
    }
    if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      setFormError("A senha deve incluir letras e números.");
      return;
    }
    if (!consultorId) {
      setFormError("Escolha o Consultor Aion responsável pelo seu atendimento.");
      return;
    }
    requestAccount.mutate({ name, email, password, businessType, consultorId: Number(consultorId) });
  };

  return (
    <main className="min-h-screen bg-[#f7f5f2] p-4 text-[#2d2d2d] sm:p-6 lg:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-[#e5dfda] bg-white shadow-[0_24px_70px_rgba(45,45,45,.12)] lg:grid-cols-[.78fr_1.22fr]">
        <aside className="relative hidden overflow-hidden bg-[#2d2d2d] px-10 py-11 text-white lg:flex lg:flex-col">
          <div className="absolute -right-28 top-20 h-72 w-72 rounded-full bg-[#b21d31] opacity-70 blur-3xl" />
          <div className="relative flex items-center gap-3"><img src={AION_MARK_URL} alt="Símbolo Aion" className="h-11 w-11 rounded-xl object-cover" /><div><p className="text-lg font-extrabold tracking-[-.04em]">Aion</p><p className="text-sm text-[#d1cbc6]">Consultoria financeira</p></div></div>
          <div className="relative my-auto max-w-sm"><p className="text-xs font-extrabold uppercase tracking-[.19em] text-[#f07787]">Novo atendimento</p><h1 className="mt-5 text-5xl font-extrabold leading-[.96] tracking-[-.065em]">Seu próximo passo<br /><span className="text-[#ef4055]">com direção.</span></h1><p className="mt-6 text-base leading-relaxed text-[#d1cbc6]">Envie o seu pedido. O Consultor Aion escolhido avalia o atendimento antes de liberar sua jornada.</p></div>
          <div className="relative rounded-2xl border border-white/10 bg-white/[.06] p-5"><div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#ef4055]" /><p className="text-sm leading-relaxed text-[#d1cbc6]">Seus dados não criam acesso imediato. A liberação ocorre somente após aprovação.</p></div></div>
        </aside>

        <section className="flex min-h-full flex-col px-6 py-8 sm:px-10 sm:py-11">
          <div className="flex items-center justify-between lg:hidden"><div className="flex items-center gap-2"><img src={AION_MARK_URL} alt="Símbolo Aion" className="h-10 w-10 rounded-xl object-cover" /><p className="font-extrabold">Aion</p></div></div>
          <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center py-8 lg:py-0">
            {submitted ? <div className="rounded-3xl border border-[#b21d31]/15 bg-[#fbf4f3] p-7 text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#b21d31] text-white"><CheckCircle2 className="h-7 w-7" /></span><p className="aion-eyebrow mt-6">Solicitação recebida</p><h1 className="mt-3 text-3xl font-extrabold tracking-[-.05em]">Seu pedido está em análise.</h1><p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">O Consultor Aion escolhido avaliará sua solicitação. O acesso será liberado somente depois da aprovação.</p><Button className="mt-7 min-h-12 rounded-xl bg-[#b21d31] px-6 font-extrabold hover:bg-[#8f1727]" onClick={() => navigate("/acesso")}>Voltar ao acesso</Button></div> : <>
              <button type="button" onClick={() => navigate("/acesso")} className="mb-6 flex w-fit items-center gap-2 text-sm font-bold text-[#655e5a] hover:text-[#b21d31]"><ArrowLeft className="h-4 w-4" />Voltar ao acesso</button>
              <p className="aion-eyebrow">Solicitar uma conta</p><h1 className="mt-3 text-3xl font-extrabold tracking-[-.055em] sm:text-4xl">Comece seu atendimento Aion.</h1><p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">Escolha sua jornada e o Consultor Aion que analisará o seu pedido. Nenhum acesso é liberado nesta etapa.</p>
              <form className="mt-7 space-y-5" onSubmit={submit}>
                <div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="request-name">Nome completo</Label><Input id="request-name" value={name} onChange={(event) => setName(event.target.value)} className="h-12 rounded-xl" autoComplete="name" required disabled={requestAccount.isPending} /></div><div className="space-y-2"><Label htmlFor="request-email">E-mail</Label><Input id="request-email" value={email} onChange={(event) => setEmail(event.target.value)} type="email" className="h-12 rounded-xl" autoComplete="email" required disabled={requestAccount.isPending} /></div></div>
                <fieldset className="space-y-2"><legend className="text-sm font-semibold">Jornada desejada</legend><div className="grid grid-cols-2 gap-3"><label className={`cursor-pointer rounded-xl border p-4 transition ${businessType === "pessoal" ? "border-[#b21d31] bg-[#fbf4f3]" : "border-border hover:border-[#b21d31]/40"}`}><input className="sr-only" type="radio" name="businessType" value="pessoal" checked={businessType === "pessoal"} onChange={() => setBusinessType("pessoal")} /><span className="block text-sm font-extrabold">Pessoal / Família</span><span className="mt-1 block text-xs text-muted-foreground">Organização financeira pessoal.</span></label><label className={`cursor-pointer rounded-xl border p-4 transition ${businessType === "mei" ? "border-[#b21d31] bg-[#fbf4f3]" : "border-border hover:border-[#b21d31]/40"}`}><input className="sr-only" type="radio" name="businessType" value="mei" checked={businessType === "mei"} onChange={() => setBusinessType("mei")} /><span className="block text-sm font-extrabold">MEI / Microempresa</span><span className="mt-1 block text-xs text-muted-foreground">Rotina financeira do negócio.</span></label></div></fieldset>
                <div className="space-y-2"><Label htmlFor="request-consultant">Consultor Aion responsável</Label><select id="request-consultant" value={consultorId} onChange={(event) => setConsultorId(event.target.value)} required disabled={loadingConsultants || requestAccount.isPending || !consultants.length} className="flex h-12 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"><option value="">{loadingConsultants ? "Carregando consultores…" : "Selecione quem analisará seu pedido"}</option>{consultants.map((consultant) => <option key={consultant.id} value={consultant.id}>{consultant.name || "Consultor Aion"}</option>)}</select>{!loadingConsultants && !consultants.length ? <p className="text-xs text-[#8f1727]">Não há consultores disponíveis no momento. Tente novamente mais tarde.</p> : null}</div>
                <div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="request-password">Crie sua senha</Label><Input id="request-password" value={password} onChange={(event) => setPassword(event.target.value)} type="password" minLength={10} className="h-12 rounded-xl" autoComplete="new-password" required disabled={requestAccount.isPending} /></div><div className="space-y-2"><Label htmlFor="request-confirmation">Confirme sua senha</Label><Input id="request-confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} type="password" minLength={10} className="h-12 rounded-xl" autoComplete="new-password" required disabled={requestAccount.isPending} /></div></div>
                <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#b21d31]" />Use ao menos 10 caracteres, incluindo letras e números. Sua senha fica protegida até a decisão do consultor.</p>
                {formError ? <p role="alert" className="rounded-xl border border-[#b21d31]/20 bg-[#f9e8eb] px-3 py-2 text-sm font-medium text-[#8f1727]">{formError}</p> : null}
                <Button type="submit" disabled={requestAccount.isPending || loadingConsultants || !consultants.length} className="min-h-12 w-full rounded-xl bg-[#b21d31] font-extrabold hover:bg-[#8f1727]">{requestAccount.isPending ? "Enviando solicitação…" : <><UserPlus className="mr-2 h-4 w-4" />Enviar para aprovação</>}</Button>
              </form>
            </>}
          </div>
        </section>
      </div>
    </main>
  );
}
