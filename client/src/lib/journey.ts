export type AionJourney = "pessoal" | "empresarial";

export function journeyPath(journey: AionJourney) {
  return journey === "pessoal" ? "/pessoal" : "/negocio";
}

export function journeyFromBusinessType(businessType?: string | null): AionJourney {
  return businessType === "pessoal" ? "pessoal" : "empresarial";
}
