export function amortizationDialogClass(expanded: boolean) {
  return expanded
    ? "!left-2 !top-2 !h-[calc(100dvh-1rem)] !w-[calc(100vw-1rem)] !max-w-none !translate-x-0 !translate-y-0 overflow-y-auto overscroll-contain p-4 sm:p-6"
    : "max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-none overflow-y-auto overscroll-contain p-4 sm:max-h-[92dvh] sm:w-[min(72rem,calc(100vw-2rem))] sm:max-w-none sm:p-6";
}
