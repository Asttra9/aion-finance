import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { formatCpfCnpj, isValidCpfCnpj, normalizeCpfCnpj } from "@shared/brazilianDocument";
import { ArrowRight, Building2, CheckCircle2, CircleAlert, HeartHandshake, LockKeyhole, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

const AION_MARK_URL = "/manus-storage/aion-logo-dark_9a4b34db.png";

const inviteStateMessage: Record<string, { title: string; description: string }> = {
  invalido: {
    title: "Link de ativação inválido",
    description: "Este link não pode ser verificado. Solicite ao Consultor Aion responsável um novo convite.",
  },
  expirado: {
    title: "Convite expirado",
    description: "O prazo de sete dias para ativação terminou. Solicite ao Consultor Aion responsável um novo link.",
  },
  revogado: {
    title: "Convite revogado",
    description: "Este convite não está mais disponível. Solicite ao Consultor Aion responsável um novo link.",
  },
  aceito: {
    title: "Convite já utilizado",
    description: "Este link foi utilizado anteriormente e não pode ser reutilizado. Solicite um novo convite caso ainda precise de acesso.",
  },
};

function passwordIsSecure(password: string) {
  return password.length >= 10 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

export default function AtivarConta() {
  const [token] = useState(() => new URLSearchParams(window.location.search).get("token")?.trim() ?? "");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [personalGoal, setPersonalGoal] = useState("");
  const [incomeRange, setIncomeRange] = useState("");
  const [legalName, setLegalName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [segment, setSegment] = useState("");
  const [revenueRange, setRevenueRange] = useState("");
  const [financialControlMethod, setFinancialControlMethod] = useState("");
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  const preview = trpc.auth.invitePreview.useQuery(
    { token },
    { enabled: token.length >= 40, retry: false, refetchOnWindowFocus: false },
  );
  const invitation = preview.data?.state === "valido" ? preview.data : null;
  const isPersonal = invitation?.client.businessType === "pessoal";
  const normalizedCnpj = normalizeCpfCnpj(cnpj);
  const cnpjIsValid = normalizedCnpj.length === 14 && isValidCpfCnpj(normalizedCnpj);

  useEffect(() => {
    if (!invitation || isPersonal) return;
    setLegalName((current) => current || invitation.client.businessName || invitation.client.name);
    setCnpj((current) => current || formatCpfCnpj(invitation.client.cpfCnpj ?? ""));
  }, [invitation, isPersonal]);

  useEffect(() => {
    if (!completed) return;
    const timeout = window.setTimeout(() => window.location.assign("/acesso"), 2800);
    return () => window.clearTimeout(timeout);
  }, [completed]);

  const acceptInvite = trpc.auth.acceptInvite.useMutation({
    onSuccess: () => setCompleted(true),
    onError: (error) => setFormMessage(error.message || "Não foi possível concluir a ativação."),
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!invitation) return;

    if (!passwordIsSecure(password)) {
      setFormMessage("Use uma senha com ao menos 10 caracteres, letras e números.");
      return;
    }
    if (password !== passwordConfirmation) {
      setFormMessage("As senhas não coincidem.");
      return;
    }

    if (isPersonal) {
      if (!personalGoal || !incomeRange) {
        setFormMessage("Informe seu objetivo financeiro e sua faixa de renda para continuar.");
        return;
      }
      setFormMessage(null);
      acceptInvite.mutate({ token, password, profile: { profileType: "pessoal", personalGoal, incomeRange } });
      return;
    }

    if (!legalName.trim() || !cnpjIsValid || !segment || !revenueRange || !financialControlMethod) {
      setFormMessage("Preencha os dados empresariais e informe um CNPJ válido para continuar.");
      return;
    }
    setFormMessage(null);
    acceptInvite.mutate({
      token,
      password,
      profile: {
        profileType: "empresarial",
        legalName: legalName.trim(),
        cpfCnpj: normalizedCnpj,
        segment,
        revenueRange,
        financialControlMethod,
      },
    });
  };

  const invalidTokenFormat = token.length < 40;
  const inactiveState = invalidTokenFormat || preview.isError || (preview.data && preview.data.state !== "valido");
  const inactiveDetails = invalidTokenFormat || preview.isError
    ? inviteStateMessage.invalido
    : preview.data && preview.data.state !== "valido"
      ? inviteStateMessage[preview.data.state] ?? inviteStateMessage.invalido
      : null;

  return (
    <main className="min-h-screen bg-[#f7f5f2] p-4 text-[#2d2d2d] sm:p-6 lg:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-[#e5dfda] bg-white shadow-[0_24px_70px_rgba(45,45,45,.12)] lg:grid-cols-[.82fr_1.18fr]">
        <section className="relative hidden overflow-hidden bg-[#2d2d2d] px-10 py-11 text-white lg:flex lg:flex-col">
          <div className="absolute -right-32 top-14 h-80 w-80 rounded-full bg-[#b21d31] opacity-70 blur-3xl" />
          <div className="absolute -bottom-36 -left-24 h-80 w-80 rounded-full border-[44px] border-[#b21d31]/40" />
          <div className="relative flex items-center gap-3">
            <img src={AION_MARK_URL} alt="Símbolo Aion" className="h-11 w-11 rounded-xl object-cover" />
            <div><p className="text-lg font-extrabold tracking-[-.04em]">Aion</p><p className="text-sm text-[#d1cbc6]">Consultoria financeira</p></div>
          </div>
          <div className="relative my-auto max-w-md">
            <p className="text-xs font-extrabold uppercase tracking-[.19em] text-[#f07787]">Convite seguro</p>
            <h1 className="mt-5 text-5xl font-extrabold leading-[.96] tracking-[-.065em]">Sua jornada<br /><span className="text-[#ef4055]">começa agora.</span></h1>
            <p className="mt-6 text-base leading-relaxed text-[#d1cbc6]">Complete seu acesso com dados essenciais para que a Aion organize uma experiência financeira adequada ao seu perfil.</p>
          </div>
          <div className="relative rounded-2xl border border-white/10 bg-white/[.06] p-5">
            <div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#ef4055]" /><p className="text-sm leading-relaxed text-[#d1cbc6]">O convite é individual, possui validade de sete dias e só pode ser utilizado uma vez.</p></div>
          </div>
        </section>

        <section className="flex min-h-full flex-col px-6 py-8 sm:px-10 sm:py-11">
          <div className="flex items-center gap-2 lg:hidden"><img src={AION_MARK_URL} alt="Símbolo Aion" className="h-10 w-10 rounded-xl object-cover" /><div><p className="font-extrabold">Aion</p><p className="text-xs text-muted-foreground">Consultoria financeira</p></div></div>
          <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center py-8 lg:py-0">
            {completed ? (
              <div className="rounded-2xl border border-[#b21d31]/20 bg-[#f9e8eb] p-7 text-center">
                <CheckCircle2 className="mx-auto h-11 w-11 text-[#b21d31]" />
                <p className="aion-eyebrow mt-5">Conta ativada</p>
                <h2 className="mt-3 text-3xl font-extrabold tracking-[-.055em]">Seu acesso está pronto.</h2>
                <p className="mt-3 text-sm leading-relaxed text-[#5f5956]">A sua conta foi ativada com segurança. Você será direcionado para a tela de acesso em instantes.</p>
                <Button type="button" className="mt-6 min-h-11 rounded-xl bg-[#b21d31] font-extrabold hover:bg-[#8f1727]" onClick={() => window.location.assign("/acesso")}>Ir para o acesso <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </div>
            ) : preview.isLoading ? (
              <div className="flex min-h-72 flex-col items-center justify-center gap-4 text-center"><Spinner className="h-8 w-8 text-[#b21d31]" /><p className="text-sm font-semibold text-muted-foreground">Verificando seu convite com segurança...</p></div>
            ) : inactiveState && inactiveDetails ? (
              <div className="rounded-2xl border border-[#b21d31]/20 bg-[#f9e8eb] p-7 text-center">
                <CircleAlert className="mx-auto h-11 w-11 text-[#b21d31]" />
                <h2 className="mt-5 text-3xl font-extrabold tracking-[-.055em]">{inactiveDetails.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-[#5f5956]">{inactiveDetails.description}</p>
                <Button type="button" variant="outline" className="mt-6 min-h-11 rounded-xl border-[#b21d31]/30 text-[#8f1727] hover:bg-white" onClick={() => window.location.assign("/acesso")}>Voltar para o acesso</Button>
              </div>
            ) : invitation ? (
              <>
                <div>
                  <p className="aion-eyebrow">Ativação de conta</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3"><h2 className="text-3xl font-extrabold tracking-[-.055em] sm:text-4xl">{isPersonal ? "Organize sua vida financeira." : "Estruture a gestão do seu negócio."}</h2><span className="inline-flex items-center gap-1.5 rounded-full bg-[#f9e8eb] px-3 py-1 text-xs font-extrabold text-[#8f1727]">{isPersonal ? <HeartHandshake className="h-3.5 w-3.5" /> : <Building2 className="h-3.5 w-3.5" />}{isPersonal ? "Pessoal / Família" : "MEI / Microempresa"}</span></div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Este convite foi destinado a <strong className="font-bold text-foreground">{invitation.client.email}</strong>. A jornada financeira já foi definida pelo seu Consultor Aion.</p>
                </div>

                <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
                  {isPersonal ? (
                    <fieldset className="grid gap-4 rounded-2xl border border-[#e5dfda] bg-[#fcfbfa] p-4 sm:grid-cols-2">
                      <legend className="px-1 text-sm font-extrabold text-[#2d2d2d]">Perfil financeiro pessoal</legend>
                      <div className="space-y-2 sm:col-span-2"><Label htmlFor="activation-person-name">Titular</Label><Input id="activation-person-name" value={invitation.client.name} readOnly className="h-11 rounded-xl border-[#ddd5d0] bg-[#f4f1ef]" /></div>
                      <div className="space-y-2"><Label htmlFor="activation-person-goal">Objetivo financeiro</Label><Select value={personalGoal} onValueChange={setPersonalGoal}><SelectTrigger id="activation-person-goal" className="h-11 rounded-xl border-[#ddd5d0] bg-white"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="organizar_gastos">Organizar gastos</SelectItem><SelectItem value="poupar">Poupar</SelectItem><SelectItem value="quitar_dividas">Quitar dívidas</SelectItem><SelectItem value="investir">Investir</SelectItem></SelectContent></Select></div>
                      <div className="space-y-2"><Label htmlFor="activation-income-range">Faixa de renda</Label><Select value={incomeRange} onValueChange={setIncomeRange}><SelectTrigger id="activation-income-range" className="h-11 rounded-xl border-[#ddd5d0] bg-white"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="ate_2_mil">Até R$ 2 mil</SelectItem><SelectItem value="de_2_a_5_mil">De R$ 2 mil a R$ 5 mil</SelectItem><SelectItem value="de_5_a_10_mil">De R$ 5 mil a R$ 10 mil</SelectItem><SelectItem value="acima_10_mil">Acima de R$ 10 mil</SelectItem></SelectContent></Select></div>
                    </fieldset>
                  ) : (
                    <fieldset className="grid gap-4 rounded-2xl border border-[#e5dfda] bg-[#fcfbfa] p-4 sm:grid-cols-2">
                      <legend className="px-1 text-sm font-extrabold text-[#2d2d2d]">Perfil empresarial</legend>
                      <div className="space-y-2 sm:col-span-2"><Label htmlFor="activation-legal-name">Razão social</Label><Input id="activation-legal-name" value={legalName} onChange={(event) => setLegalName(event.target.value)} required maxLength={255} className="h-11 rounded-xl border-[#ddd5d0] bg-white" /></div>
                      <div className="space-y-2"><Label htmlFor="activation-cnpj">CNPJ</Label><Input id="activation-cnpj" value={cnpj} onChange={(event) => setCnpj(formatCpfCnpj(event.target.value))} required inputMode="numeric" placeholder="00.000.000/0000-00" maxLength={18} aria-invalid={cnpj.length > 0 && !cnpjIsValid} className="h-11 rounded-xl border-[#ddd5d0] bg-white" />{cnpj.length > 0 && !cnpjIsValid ? <p className="text-xs font-semibold text-destructive">Informe um CNPJ válido.</p> : null}</div>
                      <div className="space-y-2"><Label htmlFor="activation-segment">Segmento</Label><Select value={segment} onValueChange={setSegment}><SelectTrigger id="activation-segment" className="h-11 rounded-xl border-[#ddd5d0] bg-white"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="servicos">Serviços</SelectItem><SelectItem value="comercio">Comércio</SelectItem><SelectItem value="industria">Indústria</SelectItem><SelectItem value="tecnologia">Tecnologia</SelectItem><SelectItem value="saude">Saúde</SelectItem><SelectItem value="educacao">Educação</SelectItem><SelectItem value="outro">Outro</SelectItem></SelectContent></Select></div>
                      <div className="space-y-2"><Label htmlFor="activation-revenue-range">Faixa de faturamento anual</Label><Select value={revenueRange} onValueChange={setRevenueRange}><SelectTrigger id="activation-revenue-range" className="h-11 rounded-xl border-[#ddd5d0] bg-white"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="ate_50_mil">Até R$ 50 mil</SelectItem><SelectItem value="de_50_a_200_mil">De R$ 50 mil a R$ 200 mil</SelectItem><SelectItem value="de_200_mil_a_1_milhao">De R$ 200 mil a R$ 1 milhão</SelectItem><SelectItem value="acima_1_milhao">Acima de R$ 1 milhão</SelectItem></SelectContent></Select></div>
                      <div className="space-y-2"><Label htmlFor="activation-control-method">Como controla as finanças hoje?</Label><Select value={financialControlMethod} onValueChange={setFinancialControlMethod}><SelectTrigger id="activation-control-method" className="h-11 rounded-xl border-[#ddd5d0] bg-white"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="planilha">Planilha</SelectItem><SelectItem value="aplicativo">Aplicativo</SelectItem><SelectItem value="contador">Contador</SelectItem><SelectItem value="sem_controle">Sem controle</SelectItem></SelectContent></Select></div>
                    </fieldset>
                  )}

                  <fieldset className="grid gap-4 rounded-2xl border border-[#e5dfda] bg-[#fcfbfa] p-4 sm:grid-cols-2">
                    <legend className="px-1 text-sm font-extrabold text-[#2d2d2d]">Defina sua senha</legend>
                    <div className="space-y-2"><Label htmlFor="activation-password">Senha</Label><Input id="activation-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={10} maxLength={256} required className="h-11 rounded-xl border-[#ddd5d0] bg-white" /></div>
                    <div className="space-y-2"><Label htmlFor="activation-password-confirmation">Confirmar senha</Label><Input id="activation-password-confirmation" type="password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} autoComplete="new-password" minLength={10} maxLength={256} required className="h-11 rounded-xl border-[#ddd5d0] bg-white" /></div>
                    <p className="sm:col-span-2 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#b21d31]" />Use ao menos 10 caracteres, incluindo letras e números. A Aion não exibe nem recupera sua senha.</p>
                  </fieldset>

                  {formMessage ? <p role="alert" className="rounded-xl border border-[#b21d31]/20 bg-[#f9e8eb] px-3 py-2 text-sm font-semibold text-[#8f1727]">{formMessage}</p> : null}
                  <Button type="submit" disabled={acceptInvite.isPending} className="min-h-12 w-full rounded-xl bg-[#b21d31] font-extrabold hover:bg-[#8f1727]">{acceptInvite.isPending ? "Ativando acesso…" : "Ativar minha conta"}<ArrowRight className="ml-2 h-4 w-4" /></Button>
                </form>
              </>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
