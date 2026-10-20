export type RecaptchaAction = "login" | "signup";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: RecaptchaAction }) => Promise<string>;
    };
  }
}

const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY?.trim();
let scriptPromise: Promise<void> | undefined;

const loadRecaptcha = (): Promise<void> => {
  if (!siteKey) return Promise.reject(new Error("reCAPTCHA is not configured. Please contact support."));
  if (window.grecaptcha) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-carebase-recaptcha="true"]');
    const script = existing ?? document.createElement("script");
    const cleanup = () => {
      script.removeEventListener("load", handleLoad);
      script.removeEventListener("error", handleError);
    };
    const onLoad = () => {
      cleanup();
      if (window.grecaptcha) resolve();
      else reject(new Error("Could not initialize reCAPTCHA. Please try again."));
    };
    const onError = () => {
      cleanup();
      scriptPromise = undefined;
      reject(new Error("Could not load reCAPTCHA. Check your connection and try again."));
    };
    const timeout = window.setTimeout(() => {
      cleanup();
      scriptPromise = undefined;
      reject(new Error("reCAPTCHA took too long to load. Please try again."));
    }, 10000);
    const settle = (handler: () => void) => {
      window.clearTimeout(timeout);
      handler();
    };
    const handleLoad = () => settle(onLoad);
    const handleError = () => settle(onError);

    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });
    if (!existing) {
      script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
      script.async = true;
      script.defer = true;
      script.dataset.carebaseRecaptcha = "true";
      document.head.appendChild(script);
    }
  }).catch((error: unknown) => {
    scriptPromise = undefined;
    throw error;
  });

  return scriptPromise;
};

export const getRecaptchaToken = async (action: RecaptchaAction): Promise<string> => {
  await loadRecaptcha();
  const recaptcha = window.grecaptcha;
  if (!recaptcha || !siteKey) throw new Error("reCAPTCHA is unavailable. Please try again.");

  return new Promise<string>((resolve, reject) => {
    recaptcha.ready(() => {
      recaptcha.execute(siteKey, { action })
        .then((token) => token ? resolve(token) : reject(new Error("reCAPTCHA did not return a token. Please try again.")))
        .catch(() => reject(new Error("reCAPTCHA verification could not start. Please try again.")));
    });
  });
};
