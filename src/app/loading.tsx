import { getTranslations } from "next-intl/server";

export default async function Loading() {
  const t = await getTranslations("loading");

  return (
    <div className="fixed inset-0 z-[9999] flex min-h-screen flex-col items-center justify-center bg-[#0f100e] text-[#f2dfc5]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(211,106,75,0.16),transparent_30%),linear-gradient(180deg,#11120f_0%,#090a09_100%)]" />

      <div className="relative flex flex-col items-center">
        <div className="font-display text-[54px] font-semibold leading-none tracking-normal md:text-[72px]">
          UyJoy
        </div>
        <div className="mt-2 text-[14px] font-medium tracking-[0.18em] text-[#d8c5ad]">
          Residence
        </div>
      </div>

      <div className="absolute bottom-14 left-1/2 flex -translate-x-1/2 flex-col items-center gap-4">
        <div className="h-[2px] w-32 overflow-hidden rounded-full bg-[#3a2d25]">
          <div className="h-full w-1/2 rounded-full bg-[#d36a4b] animate-[loading-line_1.15s_ease-in-out_infinite]" />
        </div>
        <p className="font-heading text-[13px] font-semibold uppercase tracking-[0.24em] text-[#d8c5ad]/75">
          {t("loading")}
        </p>
      </div>
    </div>
  );
}
