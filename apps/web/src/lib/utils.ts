export const cn = (...inputs: Array<string | undefined | null | false>) =>
  inputs.filter(Boolean).join(" ");
