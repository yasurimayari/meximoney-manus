export type PersonalProfileInput = {
  displayName?: string | null;
  birthDate?: number | null;
  residenceCity?: string | null;
  contactEmail?: string | null;
};

export function hasPersonalProfileData(input: PersonalProfileInput) {
  return Boolean(input.displayName || input.birthDate || input.residenceCity || input.contactEmail);
}

export function requiresPersonalProfileConsent(input: PersonalProfileInput, consent?: boolean) {
  return hasPersonalProfileData(input) && consent !== true;
}
