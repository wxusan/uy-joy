import { getTranslations, getLocale } from "next-intl/server";
import NavbarClient from "./NavbarClient";
import { getCurrentTenant } from "@/lib/tenant";
import { getPlatformSettings, platformSettingsHasFeature } from "@/lib/platform-settings";

export default async function Navbar() {
  const t = await getTranslations("common");
  const locale = await getLocale();
  const tenant = await getCurrentTenant();
  const platformSettings = getPlatformSettings();

  return (
    <NavbarClient
      currentLocale={locale}
      phoneNumber={tenant?.phoneNumber ?? null}
      brandName={platformSettings.publicBrandName}
      showApartments={platformSettingsHasFeature(platformSettings, "inventory")}
      labels={{
        residence: t("residence"),
        apartments: t("apartments"),
        location: t("location"),
        aboutUyjoy: t("aboutUyjoy").replace(/UyJoy|Uy Joy/g, platformSettings.publicBrandName),
        contacts: t("contacts"),
        contactSales: t("contactSales"),
      }}
    />
  );
}
