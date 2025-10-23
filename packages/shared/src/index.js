export const appName = "NCTB Quiz Generator";
export const formatBanglaDate = (date) => new Intl.DateTimeFormat("bn-BD", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric"
}).format(date);
