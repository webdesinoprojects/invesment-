import {
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js/max";

export function normalizeMobileNumber(
  value: string,
  countryCode: string,
): string | null {
  const phoneNumber = parsePhoneNumberFromString(
    value,
    countryCode as CountryCode,
  );

  return phoneNumber?.isValid() ? phoneNumber.number : null;
}
